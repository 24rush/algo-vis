import { ObservableVariable, VariableChangeCbk } from "./observable-type";

var MustacheIt = require('mustache');
var esprima = require('esprima')

enum OperationType {
    NONE,
    FORCE_MARK, // force the debugger to stop at a line even if it has only skipable operations

    READ,
    READ_AT,
    WRITE,
    WRITE_AT,

    LINE_NUMBER,
    SCOPE_START,
    SCOPE_END,
    CREATE_VAR,

    TRACE
}

enum VarType {
    let = 0,
    var
};

class IndexRange {
    constructor(public s: number, public e: number) { }
}

/*
DATATYPES USED BY POST PREPROCESSOR
*/
class VariableDeclaration {
    public endOfDefinitionIndexes: number[] = [];
    public source: string = "";

    constructor(public scopeName: string, public name: string, public vartype: VarType, public endOfDefinitionIndex: number) {
        this.endOfDefinitionIndexes = [endOfDefinitionIndex];
    }
}

class ScopeDeclaration {
    constructor(public name: string, public startOfDefinitionIndex: number, public endOfDefinitionIndex: number) { }
}

class PushFuncParams {
    constructor(public startOfDefinitionIndex: number, public endOfDefinitionIndex: number, public varToParams: [string, string][]) { }
}

/*
 OPERATION PAYLOADS
 */

class RWPrimitiveOperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any) { }
}

class RWIndexedObjectOperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any, public property: any) { }
}

class ScopeOperationPayload {
    constructor(public scopeName: string) { }
}

class VarCreationOperationPayload {
    constructor(public scopeName: string, public varName: string) { }
}

class TraceOperationPayload {
    constructor(public message: string) { }
}

type OperationAttributeType = RWPrimitiveOperationPayload | RWIndexedObjectOperationPayload | ScopeOperationPayload | VarCreationOperationPayload | TraceOperationPayload;

class Operation {
    constructor(public type: OperationType, public codeLineNumber: number, public attributes: OperationAttributeType) {
    }

    public toString(): string {
        if (this instanceof RWPrimitiveOperationPayload)
            //@ts-ignore
            return "{0} {1} {2} => {3}".format(this.type.toString(), this.observable.name, this.oldValue, this.newValue);

        //@ts-ignore
        return "{0} {1}[{2}] {3} => {4}".format(this.type.toString(), this.observable.name, this.index, this.oldValue, this.newValue);
    }
}

enum OperationRecorderStatus {
    Idle,
    Recording,
    ReplayEnded
}

export interface VariableScopingNotification {
    onEnterScopeVariable(scopeName: string, observable: ObservableVariable): void;
    onExitScopeVariable(scopeName: string, observable: ObservableVariable): void;
}

export interface TraceMessageNotification {
    onTraceMessage(message: string): void;
}

export interface CompilationStatusNotification {
    onCompilationStatus(status: boolean, message?: string): void;
}

class NotificationEmitter implements VariableScopingNotification, TraceMessageNotification, CompilationStatusNotification {

    private variableScopeObservers: VariableScopingNotification[] = [];
    private traceMessageObservers: TraceMessageNotification[] = [];
    private compilationStatusObservers: CompilationStatusNotification[] = [];

    public registerVarScopeNotifier(notifier: VariableScopingNotification) {
        this.variableScopeObservers.push(notifier);
    }

    public registerTraceNotifier(notifier: TraceMessageNotification) {
        this.traceMessageObservers.push(notifier);
    }

    public registerCompilationStatusNotifier(notifier: CompilationStatusNotification) {
        this.compilationStatusObservers.push(notifier);
    }

    onEnterScopeVariable(scopeName: string, observable: ObservableVariable): void {
        for (const notifier of this.variableScopeObservers) {
            notifier.onEnterScopeVariable(scopeName, observable);
        }
    }
    onExitScopeVariable(scopeName: string, observable: ObservableVariable): void {
        for (const notifier of this.variableScopeObservers) {
            notifier.onExitScopeVariable(scopeName, observable);
        };
    }

    onTraceMessage(message: string): void {
        for (const notifier of this.traceMessageObservers) {
            notifier.onTraceMessage(message);
        };
    }

    onCompilationStatus(status: boolean, message?: string): void {
        for (const notifier of this.compilationStatusObservers) {
            notifier.onCompilationStatus(status, message);
        };
    }
}

export class OperationRecorder extends NotificationEmitter implements VariableChangeCbk {
    onSetArrayValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(newValue))));
    }
    onSetEvent(observable: ObservableVariable, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, value, newValue));
    }
    onGetEvent(observable: ObservableVariable, value: any): void {
        this.addOperation(OperationType.READ, new RWPrimitiveOperationPayload(observable, value, value));
    }
    onSetArrayAtIndexEvent(observable: ObservableVariable, value: any, newValue: any, index: number): void {
        this.addOperation(OperationType.WRITE_AT, new RWIndexedObjectOperationPayload(observable, value, newValue, index));
    }
    onGetArrayAtIndexEvent(observable: ObservableVariable, value: any, index: number): void {
        this.addOperation(OperationType.READ_AT, new RWIndexedObjectOperationPayload(observable, value, value, index));
    }
    onSetObjectValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, value, newValue));
    }
    onSetObjectPropertyEvent(observable: ObservableVariable, value: any, newValue: any, key: string | number | symbol): void {
        this.addOperation(OperationType.WRITE_AT, new RWIndexedObjectOperationPayload(observable, value, newValue, key));
    }
    onGetObjectPropertyEvent(observable: ObservableVariable, value: any, key: string | number | symbol): void {
        this.addOperation(OperationType.READ_AT, new RWIndexedObjectOperationPayload(observable, value, value, key));
    }

    constructor() {
        super();
        MustacheIt.escape = (text: any) => { return text; };
        (<any>window).oprec = this;

        this.reset();
    }

    // CODE Parsing
    private varDeclarations: Record<string, Record<string, VariableDeclaration>>; // [scopeName][varname] = VariableDeclaration
    private scopes: ScopeDeclaration[] = [];
    private refs: Record<string, string> = {}; // [funcName.paramName] = [scopeName.varName]
    private funcDefs: Record<string, string[]>; // [funcName] = [param...]
    private pushFuncParams: PushFuncParams[] = []; // [PushFuncParams]
    private emptyCodeLineNumbers: number[] = [];
    private fcnReturns: number[] = [];
    private markLineOverrides: number[] = [];
    private noMarkLineZone: IndexRange[] = [];

    protected variableObservers: ObservableVariable[] = [];
    private runtimeObservables: Map<string, any> = new Map();

    protected code: string;
    protected compilationStatus: boolean;
    protected operations: Operation[] = [];
    protected nextOperationIndex: number = 0;
    protected firstExecutedCodeLineNumber: number = -1;
    protected lastExecutedCodeLineNumber: number = -1;
    protected lastExecutedOperationIndex: number = -1;
    protected maxLineNumber: number = 0;

    protected consoleLogFcn: any = undefined;

    protected currentScope: string[] = [];
    protected funcParamsStack: string[] = [];

    protected status: OperationRecorderStatus = OperationRecorderStatus.Idle;
    public isReplayFinished() { return this.status == OperationRecorderStatus.ReplayEnded; }

    protected addOperation(type: OperationType, attributes?: OperationAttributeType) {
        this.operations.push(new Operation(type, this.lastExecutedCodeLineNumber, attributes));
    }

    private reset() {
        this.code = "";
        this.compilationStatus = true;

        for (let primitiveObservers of this.variableObservers) {
            primitiveObservers.empty();
        }

        this.nextOperationIndex = 0;
        this.operations = [];
        this.emptyCodeLineNumbers = [];
        this.varDeclarations = {}; this.scopes = []; this.fcnReturns = [];
        this.refs = {}; this.funcDefs = {}; this.pushFuncParams = [];
        this.markLineOverrides = []; this.noMarkLineZone = [];

        this.currentScope = []; this.funcParamsStack = [];
        this.runtimeObservables = new Map();

        this.maxLineNumber = 0;
        this.firstExecutedCodeLineNumber = -1;
        this.lastExecutedCodeLineNumber = -1;
        this.lastExecutedOperationIndex = -1;
    }

    public setSourceCode(code: string) {
        this.reset();

        this.code = code;
        if (this.parseCode()) {
            this.recordSourceCode();
        }
    }

    public registerVariableObservers(observables: ObservableVariable[]) {
        for (let observable of observables)
            this.registerVariableObserver(observable);
    }

    public registerVariableObserver(observable: ObservableVariable) {
        if (this.variableObservers.indexOf(observable) != -1)
            return;

        this.variableObservers.push(observable);
        observable.registerObserver(this);
    }

    public getFirstCodeLineNumber(): number {
        console.log(this.firstExecutedCodeLineNumber);
        return this.firstExecutedCodeLineNumber;
    }

    public getNextCodeLineNumber(): number {
        if (this.nextOperationIndex < this.operations.length && this.nextOperationIndex >= 0) {
            return this.operations[this.nextOperationIndex].codeLineNumber;
        }

        return this.lastExecutedCodeLineNumber;
    }

    public forceMarkLine(lineNumber: number) {
        this.lastExecutedCodeLineNumber = lineNumber;
        if (this.firstExecutedCodeLineNumber == -1)
            this.firstExecutedCodeLineNumber = lineNumber;

        this.addOperation(OperationType.FORCE_MARK);
    }

    public markStartCodeLine(lineNumber: number) {
        this.lastExecutedCodeLineNumber = lineNumber;
        if (this.firstExecutedCodeLineNumber == -1)
            this.firstExecutedCodeLineNumber = lineNumber;

        this.addOperation(OperationType.NONE);
    }

    public startScope(scopeName: string) {        
        scopeName = this.scopeNameToFunctionScope(scopeName);

        this.currentScope.push(scopeName);
        this.addOperation(OperationType.SCOPE_START, new ScopeOperationPayload(this.currentScope.join('.')));
    }

    public endScope(scopeName: string) {
        scopeName = this.scopeNameToFunctionScope(scopeName);

        this.addOperation(OperationType.SCOPE_END, new ScopeOperationPayload(this.currentScope.join('.')));

        if (this.currentScope[this.currentScope.length - 1] == scopeName)
            this.currentScope.pop();
        else 
            throw('LAST SCOPE IS NOT AS EXPECTED');
    }

    public pushParams(params: [string, string][]) {
        for (let varToParamPair of params) {
            this.refs[this.getCurrentRuntimeScope() + '.' + varToParamPair[0]] = this.getCurrentRuntimeScope() + '.' + varToParamPair[1];
        }
    }

    public popParams(params: [string, string][]) {
        for (let varToParamPair of params) {
            delete this.refs[this.getCurrentRuntimeScope() + '.' + varToParamPair[0]];
        }
    }

    private recordSourceCode() {
        this.status = OperationRecorderStatus.Recording;

        console.log("VARS: "); console.log(this.varDeclarations);
        console.log("SCOPES: "); console.log(this.scopes);
        console.log("FUNCDEFS: "); console.log(this.funcDefs);
        console.log("PUSHPARAMS: "); console.log(this.pushFuncParams);

        console.log(this.code);

        try {
            this.hookConsoleLog();
            (1, eval)(this.code);
            this.hookConsoleLog(false);

            this.compilationStatus = true;
            this.onCompilationStatus(this.compilationStatus, "");            
        } catch (e) {
            this.hookConsoleLog(false);
            this.compilationStatus = false;

            this.onCompilationStatus(this.compilationStatus, e.message);
            throw e;
        }

        for (let primitiveObservers of this.variableObservers) {
            primitiveObservers.unregisterObserver(this);
        }

        this.status = OperationRecorderStatus.Idle;
        this.maxLineNumber = this.lastExecutedCodeLineNumber;
        console.log("OPERATIONS: "); console.log(this.operations);
    }

    public startReplay() {
        for (let variableObservers of this.variableObservers) {
            variableObservers.empty();
        }

        this.nextOperationIndex = 0;

        for (let opIdx in this.operations) {
            let operation = this.operations[opIdx];

            if (operation.type != OperationType.NONE && operation.type != OperationType.SCOPE_START)
                break;

            this.firstExecutedCodeLineNumber = operation.codeLineNumber;
            this.executeCurrentOperation();
        }

        this.lastExecutedCodeLineNumber = this.getFirstCodeLineNumber();
        this.status = OperationRecorderStatus.Idle;
    }

    public advanceOneCodeLine(): void {
        this.executeOneCodeLine(false);
    }

    public reverseOneCodeLine(): void {
        this.executeOneCodeLine(true);
    }

    /*
        PRIVATES
    */

    private hookConsoleLog(hook: boolean = true) {
        if (hook) {
            if (this.consoleLogFcn == undefined)
                this.consoleLogFcn = console.log;

            console.log = (message: any) => {
                this.addOperation(OperationType.TRACE, new TraceOperationPayload(message));
                this.consoleLogFcn.apply(console, [message]);
            };
        } else {
            console.log = this.consoleLogFcn;
        }
    }

    private isEmptyLine(lineNumber: number): boolean {
        return this.emptyCodeLineNumbers.indexOf(lineNumber) != -1;
    }

    private checkRecoverExecutionEdges(reverse: boolean = false) {
        if (reverse) { // Advance from start
            if (this.nextOperationIndex == -1) {
                this.nextOperationIndex = 0;
                this.status = OperationRecorderStatus.ReplayEnded;
            }
        } else {
            if (this.nextOperationIndex == this.operations.length) {
                this.nextOperationIndex = this.operations.length - 1;
                this.status = OperationRecorderStatus.ReplayEnded;
            }
        }
    }

    private getNextOperation(): Operation {
        if (this.nextOperationIndex >= 0 && this.nextOperationIndex < this.operations.length)
            return this.operations[this.nextOperationIndex];

        return undefined;
    }

    private executeOneCodeLine(reverse: boolean = false) {
        this.checkRecoverExecutionEdges(reverse);

        let currentOperationToExecute = this.getNextOperation();
        if (!currentOperationToExecute)
            return;

        let codeLineToExecute = currentOperationToExecute.codeLineNumber;

        do {
            this.executeCurrentOperation(reverse);

            currentOperationToExecute = this.getNextOperation();
            if (!currentOperationToExecute)
                return;

            if (this.nextOperationIndex == this.lastExecutedOperationIndex)
                return;

            if (this.isEmptyLine(this.operations[this.nextOperationIndex].codeLineNumber)) {
                console.log('empty ' + this.operations[this.nextOperationIndex].codeLineNumber);
                this.executeOneCodeLine(reverse);
            }
        }
        while (codeLineToExecute == currentOperationToExecute.codeLineNumber);
    }

    private executeCurrentOperation(reverse: boolean = false): void {
        let operation = this.getNextOperation();

        if (!operation) {
            return;
        }

        switch (operation.type) {
            case OperationType.TRACE:
                {
                    let operationAttributes = operation.attributes as TraceOperationPayload;
                    this.onTraceMessage(operationAttributes.message);
                    break;
                }
            case OperationType.CREATE_VAR:
            case OperationType.SCOPE_START:
            case OperationType.SCOPE_END:
                {
                    let operationAttributes = undefined;

                    let varTypeFilter = undefined;
                    if (operation.type != OperationType.SCOPE_END) // ending scope for all types of variables
                        varTypeFilter = (operation.type == OperationType.CREATE_VAR) ? VarType.let : VarType.var;

                    let varName = undefined;
                    switch (operation.type) {
                        case OperationType.CREATE_VAR: {
                            operationAttributes = operation.attributes as VarCreationOperationPayload;
                            varName = operationAttributes.varName;

                            break;
                        }
                        case OperationType.SCOPE_START:
                        case OperationType.SCOPE_END:
                            operationAttributes = operation.attributes as ScopeOperationPayload;
                        
                            break;
                    }

                    let scopeChain = operationAttributes.scopeName.split('.');
                    let lastScope = scopeChain.indexOf('!') != -1 ? scopeChain[scopeChain.length - 1] : operationAttributes.scopeName;
                    this.setRuntimeExecutionScope(operation.type, lastScope);

                    let varDecls = this.getVariableDeclarationInScope(operationAttributes.scopeName, varTypeFilter, varName).map(v => v.name);

                    let runtimeObservables = this.getRuntimeObservables(operationAttributes.scopeName + (varName ? '.' + varName : ""));

                    for (let runtimeObservable of runtimeObservables) {
                        if (runtimeObservable) {

                            // Check to see if there is any variable declared in the scope
                            // so we don't create an empty scope
                            if (varDecls.indexOf(runtimeObservable.name) == -1)
                                continue;

                            if (operation.type == OperationType.SCOPE_START) {
                                runtimeObservable.empty();
                            }
                            
                            // var variables enter in scope already and it also creates the templates for scopes
                            if (operation.type == OperationType.CREATE_VAR || operation.type == OperationType.SCOPE_START)
                                this.onEnterScopeVariable(operationAttributes.scopeName, runtimeObservable)
                            else if (operation.type == OperationType.SCOPE_END) {
                                this.onExitScopeVariable(operationAttributes.scopeName, runtimeObservable);
                            }
                        }
                    }
                    break;
                }
            case OperationType.READ:
                {
                    let operationAttributes = operation.attributes as RWPrimitiveOperationPayload;
                    operationAttributes.observable.getValue(operationAttributes.oldValue);
                    break;
                }
            case OperationType.READ_AT:
                {
                    let operationAttributes = operation.attributes as RWIndexedObjectOperationPayload;
                    operationAttributes.observable.getAtIndex(operationAttributes.property);
                    break;
                }
            case OperationType.WRITE:
                {
                    let operationAttributes = operation.attributes as RWPrimitiveOperationPayload;
                    operationAttributes.observable.setValue(reverse ? operationAttributes.oldValue : operationAttributes.newValue);
                    break;
                }
            case OperationType.WRITE_AT:
                {
                    let operationAttributes = operation.attributes as RWIndexedObjectOperationPayload;
                    operationAttributes.observable.setValueAtIndex(reverse ? operationAttributes.oldValue : operationAttributes.newValue, operationAttributes.property);
                    break;
                }
        }

        this.lastExecutedOperationIndex = this.nextOperationIndex;
        this.lastExecutedCodeLineNumber = operation.codeLineNumber;

        this.nextOperationIndex += (reverse ? -1 : 1);
        if (this.nextOperationIndex < 0)
            this.nextOperationIndex = -1;

        if (this.nextOperationIndex >= this.operations.length)
            this.nextOperationIndex = this.operations.length;
    }

    private setRuntimeExecutionScope(type: OperationType, scopeName: string) {        
        if (type == OperationType.SCOPE_START) {
            this.currentScope.push(scopeName);
        }

        if (type == OperationType.SCOPE_END) {
            if (this.currentScope[this.currentScope.length - 1] == scopeName)
                this.currentScope.pop();
            else {
                console.log('LAST SCOPE IS NOT AS EXPECTED ' + scopeName);
                console.log(this.currentScope);
            }
        }
    }

    private getRuntimeObservables(runtimeScope: string): any[] {
        let observables: any[] = [];

        for (let [observableScope, observable] of this.runtimeObservables) {
            if (observableScope.startsWith(runtimeScope)) {
                observables.push(observable);
            }
        }
        
        return observables;
    }

    private getRuntimeObservable(runtimeScope: string): any {
        if (this.runtimeObservables.has(runtimeScope))
            return this.runtimeObservables.get(runtimeScope);

        return undefined;
    }

    private setInstrumentationObservable(runtimeScope: string, observable: any) {
        this.runtimeObservables.set(runtimeScope, observable);
    }

    private isReferenceObject(object: any): boolean {
        let variableType = Object.prototype.toString.call(object);
        return (variableType == "[object Array]" || variableType == "[object Object]");
    }

    private getReferencedObject(scopeVarName: string): string {        
        while (scopeVarName in this.refs) {
            scopeVarName = this.refs[scopeVarName];
        }        
        
        return scopeVarName;
    }

    private getCurrentRuntimeScope() { return this.currentScope.join('.'); }

    public setVar(varname: string, object: any, varsource: string) {
        let scopeName = this.getCurrentRuntimeScope();

        if (this.isReferenceObject(object)) {
            let varRuntimeScope = this.getCurrentRuntimeScope() + "." + varname;

            if (varsource) {
                let lastScope = this.currentScope[this.currentScope.length - 1];
                scopeName = this.getCurrentRuntimeScope().replace('.' + lastScope, '');
                this.refs[varRuntimeScope] = scopeName + "." + varsource;
            }

            let scopeVarName = this.getReferencedObject(varRuntimeScope);

            if (scopeVarName != scopeName + "." + varname) {
                let indexDot = scopeVarName.lastIndexOf('.');
                varname = scopeVarName.substring(indexDot + 1);
                scopeName = scopeVarName.substring(0, indexDot);
            }
        }

        let scopeAndVar = scopeName + "." + varname;

        let runtimeObservable = this.getRuntimeObservable(scopeAndVar);

        if (!runtimeObservable) {
            runtimeObservable = new ObservableVariable(varname, object);
            this.setInstrumentationObservable(scopeAndVar, runtimeObservable);

            this.registerVariableObserver(runtimeObservable);
            this.addOperation(OperationType.CREATE_VAR, new VarCreationOperationPayload(this.getCurrentRuntimeScope(), varname));
        }

        runtimeObservable.setValue(object);
    }

    private registerVarInScope(scopeName: string, varname: string, vardecl: VariableDeclaration) {
        if (!(scopeName in this.varDeclarations))
            this.varDeclarations[scopeName] = {};

        if (varname in this.varDeclarations[scopeName]) {
            this.varDeclarations[scopeName][varname].endOfDefinitionIndexes.push(vardecl.endOfDefinitionIndex);
        } else {
            this.varDeclarations[scopeName][varname] = vardecl;
        }
    }

    private scopeNameToFunctionScope(scopeName: string) : string {
        if (scopeName != "global" && scopeName != "local") 
            return "!" + scopeName;

        return scopeName;
    }

    private getVariableDeclarationInScope(scopeName: string, varType?: VarType, varName?: string): VariableDeclaration[] {
        let foundVars: VariableDeclaration[] = [];

        // Search for a scope chain that ends at a function as var declarations are per static code scope
        let foundScopes = [];
        let scopeChain = scopeName.split('.').reverse();
        for (let scope of scopeChain) {
            foundScopes.push(scope);

            if (scope.indexOf('!') != -1) {                
                break;
            }
        }

        scopeName = foundScopes.reverse().join('.');

        let varsInScope = this.varDeclarations[scopeName];
        if (varsInScope == undefined || Object.keys(varsInScope).length == 0)
            return foundVars;

        for (let variableName of Object.keys(varsInScope)) {
            let variable = this.varDeclarations[scopeName][variableName];

            if (varType != undefined && variable.vartype != varType)
                continue;

            if (varName != undefined && variable.name != varName)
                continue;

            foundVars.push(variable);
        }

        return foundVars;
    }

    private searchScopeAndParent(startScope: string, varName: string): [string, VariableDeclaration[]] {
        let foundInScope = startScope;

        let vardeclaration = this.getVariableDeclarationInScope(foundInScope, undefined, varName);
        if (vardeclaration.length == 0) {
            foundInScope = startScope.split(".local").join("");
            vardeclaration = this.getVariableDeclarationInScope(foundInScope, undefined, varName);
        }

        return [foundInScope, vardeclaration];
    };

    private createVariable(scopeName: string, varName: string, varType: VarType, endOfDefinitionIndex: number): VariableDeclaration {        
        let varDecl = new VariableDeclaration(scopeName, varName, varType, endOfDefinitionIndex);
        this.registerVarInScope(scopeName, varName, varDecl);

        return varDecl;
    }

    private parseVariable(scopeName: string, vardata: any, declIndexOverwrite: number = -1) {
        if (!('declarations' in vardata) || vardata.declarations.length == 0)
            return;

        for (let decl of vardata.declarations) {
            let varType = vardata.kind == "var" ? VarType.var : VarType.let;
            let varScope = scopeName;

            if (varType == VarType.var && scopeName.indexOf('.') != -1) {
                varScope = scopeName.substring(0, scopeName.indexOf('.'));
            }

            let varDecl = this.createVariable(varScope, decl.id.name, varType, declIndexOverwrite == -1 ? vardata.range[1] : declIndexOverwrite);

            if (decl.init) {
                switch (decl.init.type) {
                    case "Identifier": {
                        varDecl.source = decl.init.name;
                        break;
                    }
                    case "ArrayExpression":
                    case "ObjectExpression": {
                        this.noMarkLineZone.push(new IndexRange(decl.init.range[0] - 1, decl.init.range[1] + 1));
                        break;
                    }
                    case "CallExpression": {
                        this.extractVariables(scopeName, decl.init);
                        break;
                    }
                    case "ArrowFunctionExpression": {
                        let funcName = decl.id.name;

                        for (let param of decl.init.params) {
                            if (!(funcName in this.funcDefs)) {
                                this.funcDefs[funcName] = [];
                            }

                            this.funcDefs[funcName].push(param.name);
                            this.createVariable(this.scopeNameToFunctionScope(funcName), param.name, VarType.var, decl.init.body.range[0] + 1);
                        }

                        this.scopes.push(new ScopeDeclaration(decl.id.name, decl.init.body.range[0] + 1, decl.init.body.range[1] - 1));
                        this.extractVariables(decl.id.name, decl.init.body);

                        break;
                    }
                }
            }
        }
    }

    private extractVariables(scopeName: string, scope: any) {
        if (!scope)
            return;

        let body = [scope];

        if (scope.body)
            body = !(length in scope.body) && scope.body.body ? scope.body.body : (!(length in scope.body) ? [scope.body] : scope.body);

        for (let item of body) {
            switch (item.type) {
                case "VariableDeclaration":
                    {
                        this.parseVariable(scopeName, item);
                        break;
                    }
                case 'FunctionDeclaration':
                    {
                        var funcName = item.id.name;

                        for (let param of item.params) {
                            if (!(funcName in this.funcDefs)) {
                                this.funcDefs[funcName] = [];
                            }

                            this.funcDefs[funcName].push(param.name);
                            this.createVariable(this.scopeNameToFunctionScope(funcName), param.name, VarType.var, item.body.range[0] + 1);
                        }

                        this.scopes.push(new ScopeDeclaration(funcName, item.body.range[0] + 1, item.body.range[1] - 1));
                        this.extractVariables(this.scopeNameToFunctionScope(funcName), item);
                        break;
                    }
                case "ReturnStatement":
                    {
                        let indexReturnStatement = item.range[0];
                        for (let scope in this.scopes) {
                            let scopeDecl = this.scopes[scope];

                            let parentScope = scope.split('.local').join('');

                            if (parentScope != scopeName)
                                continue;

                            if (scopeDecl.startOfDefinitionIndex < indexReturnStatement &&
                                scopeDecl.endOfDefinitionIndex > indexReturnStatement) {
                                if (scope.indexOf("global") != -1)
                                    continue;

                                this.scopes[scope].endOfDefinitionIndex = indexReturnStatement;
                            }
                        }
                        break;
                    }
                case "ForOfStatement":
                case "ForInStatement":
                    {
                        this.scopes.push(new ScopeDeclaration("local", item.body.range[0] + 1, item.body.range[1]));
                        this.createVariable(scopeName + ".local", item.left.name, VarType.let, item.body.range[0] + 1);
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case "ForStatement":
                    {
                        this.fcnReturns.push(item.body.range[0] + 1);
                        this.markLineOverrides.push(item.range[0]);

                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));
                        this.parseVariable(scopeName + ".local", item.init, item.body.range[0] + 1);
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case "IfStatement":
                    {
                        this.markLineOverrides.push(item.range[0]);
                        this.extractVariables(scopeName + ".local", item.consequent);
                        this.extractVariables(scopeName + ".local", item.alternate);

                        break;
                    }
                case 'WhileStatement':
                case 'BlockStatement':
                    {
                        this.markLineOverrides.push(item.body.range ? item.body.range[0] + 1 : item.range[0] + 1);
                        this.scopes.push(new ScopeDeclaration("local", item.range[0] + 0, item.range[1] - 1));
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case 'SwitchStatement':
                    {
                        for (let caseStatement of item.cases) {
                            if ('consequent' in caseStatement && caseStatement.consequent.length > 0) {
                                let consq = caseStatement.consequent[0];

                                if (consq.type == "BlockStatement")
                                    this.markLineOverrides.push(caseStatement.consequent[0].range[0] + 1);
                                else {
                                    this.markLineOverrides.push(caseStatement.consequent[0].range[0]);
                                }
                            }

                        }

                        break;
                    }
                case 'ExpressionStatement':
                    {
                        this.extractVariables(scopeName, item.expression);
                        break;
                    }

                case "UpdateExpression":
                case "AssignmentExpression": {
                    let varName = '';

                    if (item.type == "AssignmentExpression")
                        varName = (!item.left.object || !item.left.object.name) ? item.left.name : item.left.object.name;
                    else
                        varName = item.argument.object.name;

                    let [foundInScope, vardeclaration] = this.searchScopeAndParent(scopeName, varName);

                    if (vardeclaration.length > 0) {
                        this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1] + 1);
                    }

                    if (item.right && item.right.type == "ObjectExpression") {
                        this.noMarkLineZone.push(new IndexRange(item.range[0], item.range[1]));
                    }

                    break;
                }
                case "CallExpression":
                    {
                        this.fcnReturns.push(item.range[1] + 1);

                        if (item.callee && item.callee.object && item.callee.object.name) {
                            let varName = item.callee.object.name;

                            let [foundInScope, vardeclaration] = this.searchScopeAndParent(scopeName, varName);

                            if (vardeclaration.length) {
                                this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1] + 1);
                            }
                        }
                        else {
                            let calledFunc = item.callee.name;

                            let varToParamPairs: [string, string][] = [];
                            for (let i = 0; i < item.arguments.length; i++) {
                                let argument = item.arguments[i];
                                let paramName = argument.name;

                                let vardeclaration = this.getVariableDeclarationInScope(scopeName, undefined, paramName);

                                if (vardeclaration.length > 0 && calledFunc in this.funcDefs) {
                                    varToParamPairs.push([this.scopeNameToFunctionScope(calledFunc) + "." + this.funcDefs[calledFunc][i], paramName]);
                                } else
                                    throw('Func unknown ' + calledFunc + " " + (calledFunc in this.funcDefs))
                            }

                            this.pushFuncParams.push(new PushFuncParams(item.range[0], item.range[1], varToParamPairs));
                        }

                        if (item.arguments && item.arguments.length) {
                            // Don't add line markers in between function parameters
                            this.noMarkLineZone.push(new IndexRange(item.range[0], item.range[1]));
                        }

                        break;
                    }
            }
        }
    }

    private isInNoMarkLineZone(index: number) {
        return undefined != this.noMarkLineZone.find((noMarkZoneRange) => index >= noMarkZoneRange.s && index <= noMarkZoneRange.e);
    }

    private updateNoMarkLineZone(injectionIndex: number, injectionSize: number) {
        for (let noMarkZoneRangeIndex in this.noMarkLineZone) {
            let noMarkZoneRange = this.noMarkLineZone[noMarkZoneRangeIndex];

            if (injectionIndex <= noMarkZoneRange.s)
                noMarkZoneRange.s += injectionSize;

            if (injectionIndex <= noMarkZoneRange.e)
                noMarkZoneRange.e += injectionSize;

            //console.log('inject ' + injectionIndex + ' ' + injectionSize + ' ' + noMarkZoneRange.s + ' ' + noMarkZoneRange.e);
        };
    }

    private injectCookies() {
        let injectAtIndex: any = {};
        let addCodeInjection = (index: number, injectedCode: string) => {
            if (!(index in injectAtIndex))
                injectAtIndex[index] = [];

            injectAtIndex[index].push(injectedCode);
        };

        // Scope start setting
        for (const scope of this.scopes) {
            let injectedCode = MustacheIt.render(";startScope('{{scope}}');", { scope: scope.name });
            addCodeInjection(scope.startOfDefinitionIndex, injectedCode);
        };

        // Variable setting
        for (const scope of Object.keys(this.varDeclarations)) {
            for (const index of Object.keys(this.varDeclarations[scope])) {
                let vardata = this.varDeclarations[scope][index];
                for (const endOfDefinitionIndex of vardata.endOfDefinitionIndexes) {
                    let injectedCode = "";
                    if (vardata.source === "")
                        injectedCode = MustacheIt.render(";setVar('{{name}}', {{name}});", { name: vardata.name });
                    else
                        injectedCode = MustacheIt.render(";setVar('{{name}}', {{name}}, '{{source}}');", { name: vardata.name, source: vardata.source });

                    addCodeInjection(endOfDefinitionIndex, injectedCode);
                };
            };
        };

        // Scope end setting
        for (const scope of this.scopes) {
            let injectedCode = MustacheIt.render(";endScope('{{scope}}');", { scope: scope.name });
            addCodeInjection(scope.endOfDefinitionIndex, injectedCode);
        };

        // Push function parameters
        for (const pushParams of this.pushFuncParams) {
            let injectedCode = MustacheIt.render(";pushParams({{params}});", { params: JSON.stringify(pushParams.varToParams) });
            addCodeInjection(pushParams.startOfDefinitionIndex, injectedCode);

            injectedCode = MustacheIt.render(";popParams({{params}});", { params: JSON.stringify(pushParams.varToParams) });
            addCodeInjection(pushParams.endOfDefinitionIndex, injectedCode);
        }

        // Function returns
        for (const endOfDefinitionIndex of this.fcnReturns) {
            addCodeInjection(endOfDefinitionIndex, "<FCNRET>");
        };

        // Mark line overrides
        for (const endOfDefinitionIndex of this.markLineOverrides) {
            addCodeInjection(endOfDefinitionIndex, "<FORCEMARKLINE>");
        };

        // Inject cookies in code        
        for (const indexEndOfDef of Object.keys(injectAtIndex).reverse()) {
            let index = parseInt(indexEndOfDef);

            let stringsToInject = injectAtIndex[index].join('');
            this.code = this.code.substring(0, index) + stringsToInject + this.code.substring(index);

            this.updateNoMarkLineZone(index, stringsToInject.length);
        };
    }

    private parseCode(): boolean {
        if (!this.code)
            return false;

        this.code += ";";

        var doc = new DOMParser().parseFromString(this.code, "text/html");
        this.code = doc.documentElement.textContent;

        let syntax = undefined;

        try {
            syntax = esprima.parseScript(this.code, { range: true });
            console.log(syntax);

        } catch (error) {
            this.onCompilationStatus(false, "line " + error.lineNumber + " " + error.description);
            throw error;
        }

        this.varDeclarations = {};
        this.scopes = [];
        this.fcnReturns = [];
        this.markLineOverrides = [];

        this.scopes.push(new ScopeDeclaration('global', syntax.range[0], syntax.range[1]));
        this.markLineOverrides.push(syntax.range[1] - 1);

        this.extractVariables('global', syntax);

        this.injectCookies();

        let replaceTokens = (token: string, replacement: string, line: string): string => {
            if (line.indexOf(token) == -1)
                return line;

            let replacedTokenStr = "";
            let tokenizedLines = line.split(token);
            let diffLen = replacement.length - token.length;

            for (let indexLine = 0; indexLine < tokenizedLines.length - 1; indexLine++) {
                let tokenizedLine = tokenizedLines[indexLine];
                if (this.isInNoMarkLineZone(this.code.length + tokenizedLine.length)) {
                    replacedTokenStr += tokenizedLine;
                    this.updateNoMarkLineZone(this.code.length + replacedTokenStr.length, diffLen);
                }
                else {
                    replacedTokenStr += (tokenizedLine + replacement);
                    // MISTERY
                    let insertedSize = (tokenizedLine + replacement).length;
                    this.updateNoMarkLineZone(this.code.length + replacedTokenStr.length - insertedSize, diffLen);
                }
            }

            return replacedTokenStr + (tokenizedLines.length > 1 ? tokenizedLines[tokenizedLines.length - 1] : line);
        }

        let insertInLine = (insertionStr: string, offsetInLine: number, line: string): string => {
            if (insertionStr != '\n' && this.isInNoMarkLineZone(this.code.length + offsetInLine))
                return line;

            this.updateNoMarkLineZone(this.code.length + offsetInLine, insertionStr.length);

            return line.substring(0, offsetInLine) + insertionStr + line.substring(offsetInLine);
        }

        // Mark lines with no code
        let skippedLineMarkers = ['{', '}', '/*', '*/'];
        let codeLineByLine = this.code.split('\n');
        this.code = "";
        for (let [lineIndex, line] of codeLineByLine.entries()) {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0 || trimmedLine.indexOf('//') == 0 ||
                (trimmedLine.length == 1 && (skippedLineMarkers.indexOf(trimmedLine) != -1))) {
                this.emptyCodeLineNumbers.push(lineIndex + 1);
            }

            line = line + '\n';

            if (!this.isEmptyLine(lineIndex + 1)) {
                let codeLineMarker = MustacheIt.render(";markcl({{lineNo}});", { lineNo: lineIndex + 1 });                
                line = replaceTokens("<FCNRET>", codeLineMarker, line);

                let codeLineMarker2 = MustacheIt.render(";forcemarkcl({{lineNo}});", { lineNo: lineIndex + 1 });
                line = replaceTokens("<FORCEMARKLINE>", codeLineMarker2, line);

                if (line.indexOf("case") == -1) {
                    line = insertInLine(codeLineMarker, line.trim()[0] == '{' ? line.indexOf('{') + 1 : 0, line);
                }
            }

            this.code += line;
        }

        return true;
    }
}

(<any>window)['markcl'] = (lineNo: number) => {
    (<any>window).oprec.markStartCodeLine(lineNo);
};

(<any>window)['forcemarkcl'] = (lineNo: number) => {
    (<any>window).oprec.forceMarkLine(lineNo);
};

(<any>window)['setVar'] = (varname: string, varobject: any, varsource: string) => {
    (<any>window).oprec.setVar(varname, varobject, varsource);
};

(<any>window)['startScope'] = (scopeName: string) => {
    (<any>window).oprec.startScope(scopeName);
};

(<any>window)['endScope'] = (scopeName: string) => {
    (<any>window).oprec.endScope(scopeName);
};

(<any>window)['pushParams'] = (params: [string, string][]) => {
    (<any>window).oprec.pushParams(params);
};

(<any>window)['popParams'] = (params: [string, string][]) => {
    (<any>window).oprec.popParams(params);
};