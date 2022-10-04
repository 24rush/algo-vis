import { ArrayTypeChangeCbk, ObservableArrayType, ObservablePrimitiveType, ObservableTypes, PrimitiveTypeChangeCbk } from "./observable-type";
import { logd } from "./index"

var MustacheIt = require('mustache');
var esprima = require('esprima')

enum OperationType {
    NONE,
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
    public observable: any;
    public endOfDefinitionIndexes: number[] = [];

    constructor(public scopeName: string, public name: string, public vartype: VarType, public endOfDefinitionIndex: number) {
        this.endOfDefinitionIndexes = [endOfDefinitionIndex];
    }
}

class ScopeDeclaration {
    constructor(protected startOfDefinitionIndex: number, protected endOfDefinitionIndex: number) { }
}

/*
 OPERATION PAYLOADS
 */

class RWPrimitiveOperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any) { }
}

class RWPropertyObjectOperationPayload {
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

type OperationAttributeType = RWPrimitiveOperationPayload | RWPropertyObjectOperationPayload | ScopeOperationPayload | VarCreationOperationPayload | TraceOperationPayload;

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
    onEnterScopeVariable(scopeName: string, observable: ObservableTypes): void;
    onExitScopeVariable(scopeName: string, observable: ObservableTypes): void;
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

    onEnterScopeVariable(scopeName: string, observable: ObservableTypes): void {
        for (const notifier of this.variableScopeObservers) {
            notifier.onEnterScopeVariable(scopeName, observable);
        }
    }
    onExitScopeVariable(scopeName: string, observable: ObservableTypes): void {
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

export class OperationRecorder extends NotificationEmitter implements PrimitiveTypeChangeCbk<any>, ArrayTypeChangeCbk<any> {
    onSetValues(observable: ObservableArrayType<any>, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, [...value], [...newValue]));
    }
    onSet(observable: ObservablePrimitiveType<any>, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, value, newValue));
    }
    onGet(observable: ObservablePrimitiveType<any>, value: any): void {
        this.addOperation(OperationType.READ, new RWPrimitiveOperationPayload(observable, value, value));
    }
    onSetAtIndex(observable: ObservableArrayType<any>, value: any, newValue: any, index: number): void {
        this.addOperation(OperationType.WRITE_AT, new RWPropertyObjectOperationPayload(observable, value, newValue, index));
    }
    onGetAtIndex(observable: ObservableArrayType<any>, value: any, index: number): void {
        this.addOperation(OperationType.READ_AT, new RWPropertyObjectOperationPayload(observable, value, value, index));
    }

    constructor() {
        super();
        MustacheIt.escape = (text: any) => { return text; };
        (<any>window).oprec = this;

        this.reset();
    }

    // CODE Parsing
    private vars: any; // [scopeName][varname] = VariableDeclaration
    private scopes: any; // [scopeName] = ScopeDeclaration
    private refs: any; // [scopeName.varName] = [funcName.paramName]
    private funcDefs: any; // [funcName] = [param...]
    private emptyCodeLineNumbers: number[] = [];
    private fcnReturns: number[] = [];
    private markLineOverrides: number[] = [];
    private noMarkLineZone: IndexRange[] = [];    

    protected primitiveTypeObservers: ObservablePrimitiveType<any>[] = [];
    protected arrayTypeObservers: ObservableArrayType<any>[] = [];

    protected code: string;
    protected compilationStatus: boolean;
    protected operations: Operation[] = [];
    protected nextOperationIndex: number = 0;
    protected firstExecutedCodeLineNumber: number = -1;
    protected lastExecutedCodeLineNumber: number = -1;
    protected lastExecutedOperationIndex: number = -1;
    protected maxLineNumber: number = 0;

    protected consoleLogFcn: any = undefined;

    protected status: OperationRecorderStatus = OperationRecorderStatus.Idle;
    public isReplayFinished() { return this.status == OperationRecorderStatus.ReplayEnded; }

    protected addOperation(type: OperationType, attributes?: OperationAttributeType) {
        this.operations.push(new Operation(type, this.lastExecutedCodeLineNumber, attributes));
    }

    private reset() {
        this.code = "";
        this.compilationStatus = true;

        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.empty();
        }
        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.empty();
        }

        this.nextOperationIndex = 0;
        this.operations = [];
        this.emptyCodeLineNumbers = [];
        this.vars = {}; this.scopes = {}; this.fcnReturns = [];
        this.refs = {}; this.funcDefs = {};
        this.markLineOverrides = []; this.noMarkLineZone = [];

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

    public registerPrimitives<Type>(observables: ObservablePrimitiveType<Type>[]) {
        for (let observable of observables)
            this.registerPrimitive(observable);
    }

    public registerPrimitive<Type>(observable: ObservablePrimitiveType<Type>) {
        if (this.primitiveTypeObservers.indexOf(observable) != -1)
            return;

        this.primitiveTypeObservers.push(observable);
        observable.registerObserver(this);
    }

    public registerArrays<Type>(observables: ObservableArrayType<Type>[]) {
        for (let observable of observables)
            this.registerArray(observable);
    }

    public registerArray<Type>(observable: ObservableArrayType<Type>) {
        if (this.arrayTypeObservers.indexOf(observable) != -1)
            return;

        this.arrayTypeObservers.push(observable);
        observable.registerObserver(this);
    }

    public getFirstCodeLineNumber(): number {
        return this.firstExecutedCodeLineNumber;
    }

    public getNextCodeLineNumber(): number {
        if (this.nextOperationIndex < this.operations.length && this.nextOperationIndex >= 0) {
            return this.operations[this.nextOperationIndex].codeLineNumber;
        }

        return this.lastExecutedCodeLineNumber;
    }

    public markStartCodeLine(lineNumber: number) {
        if (this.isEmptyLine(lineNumber))
            return;

        this.lastExecutedCodeLineNumber = lineNumber;
        if (this.firstExecutedCodeLineNumber == -1)
            this.firstExecutedCodeLineNumber = lineNumber;

        this.addOperation(OperationType.NONE);
    }

    public startScope(scopeName: string) {
        this.addOperation(OperationType.SCOPE_START, new ScopeOperationPayload(scopeName));
    }

    public endScope(scopeName: string) {
        this.addOperation(OperationType.SCOPE_END, new ScopeOperationPayload(scopeName));
    }

    private recordSourceCode() {
        this.status = OperationRecorderStatus.Recording;

        logd("VARS: "); logd(this.vars);
        logd("SCOPES: "); logd(this.scopes);
        logd("REFS: "); logd(this.refs);
        logd("FUNCDEFS: "); logd(this.funcDefs);

        logd(this.code);

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
        }

        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.unregisterObserver(this);
        }

        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.unregisterObserver(this);
        }

        this.status = OperationRecorderStatus.Idle;
        this.maxLineNumber = this.lastExecutedCodeLineNumber;
        logd("OPERATIONS: "); console.log(this.operations);
    }

    public startReplay() {
        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.empty();
        }
        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.empty();
        }

        this.nextOperationIndex = 0;

        let codeLine = this.getFirstCodeLineNumber();
        let allSkipableOperations = true;

        for (let opIdx in this.operations) {
            let operation = this.operations[opIdx];

            if (operation.type != OperationType.NONE && operation.type != OperationType.SCOPE_START) {
                allSkipableOperations = false;
                break;
            }

            if (operation.codeLineNumber != codeLine) {
                if (allSkipableOperations) {
                    codeLine = operation.codeLineNumber;
                    this.firstExecutedCodeLineNumber = codeLine;
                    this.executeOneCodeLine();

                    allSkipableOperations = false;
                } else {
                    break;
                }
            }
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
                this.consoleLogFcn.apply(console, [message] );
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
                    if (operation.type == OperationType.CREATE_VAR) {
                        operationAttributes = operation.attributes as VarCreationOperationPayload;
                        varName = operationAttributes.varName;
                    } else {
                        operationAttributes = operation.attributes as ScopeOperationPayload;
                    }

                    let varsInScope = this.getVariableDeclarationInScope(operationAttributes.scopeName, varTypeFilter, varName);

                    if (varsInScope.length == 0)
                        break;

                    for (let variable of varsInScope) {
                        if (!variable.observable)
                            continue;

                        if (operation.type == OperationType.SCOPE_START) {
                            variable.observable.empty();
                        }

                        (operation.type == OperationType.SCOPE_START || operation.type == OperationType.CREATE_VAR) ?
                            this.onEnterScopeVariable(operationAttributes.scopeName, variable.observable) :
                            this.onExitScopeVariable(operationAttributes.scopeName, variable.observable);
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
                    let operationAttributes = operation.attributes as RWPropertyObjectOperationPayload;
                    operationAttributes.observable.getAtIndex(operationAttributes.property);
                    break;
                }
            case OperationType.WRITE:
                {
                    let operationAttributes = operation.attributes as RWPrimitiveOperationPayload;
                    if (this.isObjectPropertyType(operationAttributes.newValue)) {
                        operationAttributes.observable.setValues(reverse ? operationAttributes.oldValue : operationAttributes.newValue);
                    }
                    else {
                        operationAttributes.observable.setValue(reverse ? operationAttributes.oldValue : operationAttributes.newValue);
                    }
                    break;
                }
            case OperationType.WRITE_AT:
                {
                    let operationAttributes = operation.attributes as RWPropertyObjectOperationPayload;
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

    private isObjectPropertyType(object: any): boolean {
        let variableType = Object.prototype.toString.call(object);
        let isArray = variableType == "[object Array]";

        return isArray;
    }

    private isReferenceObject(object: any): boolean {
        let variableType = Object.prototype.toString.call(object);
        return (variableType == "[object Array]");
    }

    private getReferencedObject(scopeVarName: string): string {
        for (let ref of Object.keys(this.refs)) {
            if (this.refs[ref] == scopeVarName) {
                return this.getReferencedObject(ref);
            }
        }

        return scopeVarName;
    }

    public setVar(scopeName: string, varName: string, object: any) {
        var type: string;

        let isArray = this.isObjectPropertyType(object);

        if (isArray) {
            if (object.length >= 0) {
                type = typeof object[0];
            }
        } else {
            type = typeof object;
        }

        if (this.isReferenceObject(object)) {
            let scopeVarName = this.getReferencedObject(scopeName + "." + varName);
            if (scopeVarName != scopeName + "." + varName) { // source reference                
                let indexDot = scopeVarName.lastIndexOf('.');
                varName = scopeVarName.substring(indexDot + 1);
                scopeName = scopeVarName.substring(0, indexDot);
            }
        }

        let variable = this.vars[scopeName][varName];

        if (!variable.observable) {
            switch (type) {
                case 'boolean':
                    variable.observable = isArray ? new ObservableArrayType<boolean>(varName, object) : new ObservablePrimitiveType<boolean>(varName, object);
                    isArray ? this.registerArray(variable.observable) : this.registerPrimitive(variable.observable);
                    break;
                case 'number':
                    variable.observable = isArray ? new ObservableArrayType<number>(varName, object) : new ObservablePrimitiveType<number>(varName, object);
                    isArray ? this.registerArray(variable.observable) : this.registerPrimitive(variable.observable);
                    break;
                case 'undefined':
                case 'string':
                    variable.observable = isArray ? new ObservableArrayType<string>(varName, object) : new ObservablePrimitiveType<string>(varName, object);
                    isArray ? this.registerArray(variable.observable) : this.registerPrimitive(variable.observable);
                    break;
            }
        }

        this.addOperation(OperationType.CREATE_VAR, new VarCreationOperationPayload(scopeName, varName));

        switch (type) {
            case 'boolean':
            case 'number':
            case 'string':
                {
                    if (isArray)
                        variable.observable.setValues(object);
                    else
                        variable.observable.setValue(object);
                    break;
                }
        }

    }

    private registerVarInScope(scopeName: string, varname: string, vardecl: VariableDeclaration) {
        if (!(scopeName in this.vars))
            this.vars[scopeName] = {};

        if (varname in this.vars[scopeName]) {
            this.vars[scopeName][varname].endOfDefinitionIndexes.push(vardecl.endOfDefinitionIndex);
        } else {
            this.vars[scopeName][varname] = vardecl;
        }
    }

    private getVariableDeclarationInScope(scopeName: string, varType?: VarType, varName?: string): VariableDeclaration[] {
        let foundVars: VariableDeclaration[] = [];

        let varsInScope = this.vars[scopeName];
        if (varsInScope == undefined || varsInScope.length == 0)
            return foundVars;

        for (let variableName of Object.keys(varsInScope)) {
            let variable = this.vars[scopeName][variableName];

            if (varType != undefined && variable.vartype != varType)
                continue;

            if (varName != undefined && variable.name != varName)
                continue;

            foundVars.push(variable);
        }

        return foundVars;
    }

    private searchScopeAndParent(startScope: string, varName: string): [string, any] {
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

            this.createVariable(varScope, decl.id.name, varType, declIndexOverwrite == -1 ? vardata.range[1] : declIndexOverwrite);

            let funcName = decl.id.name;

            if (decl.init) {
                switch (decl.init.type) {
                    case "ArrayExpression":
                    case "ObjectExpression": {
                        this.noMarkLineZone.push(new IndexRange(decl.range[0], decl.range[1]));
                        break;
                    }
                    case "CallExpression": {
                        this.extractVariables(scopeName, decl.init);
                        break;
                    }
                    case "ArrowFunctionExpression": {
                        for (let param of decl.init.params) {
                            if (!(funcName in this.funcDefs)) {
                                this.funcDefs[funcName] = [];
                            }

                            this.funcDefs[funcName].push(param.name);
                            this.createVariable(funcName, param.name, VarType.var, decl.init.body.range[0] + 1);
                        }

                        this.scopes[decl.id.name] = new ScopeDeclaration(decl.init.body.range[0] + 1, decl.init.body.range[1] - 1);
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
                            this.createVariable(funcName, param.name, VarType.var, item.body.range[0] + 1);
                        }

                        this.scopes[funcName] = new ScopeDeclaration(item.body.range[0] + 1, item.body.range[1] - 1);
                        this.extractVariables(funcName, item);
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
                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.body.range[0] + 1, item.body.range[1]);
                        this.createVariable(scopeName + ".local", item.left.name, VarType.let, item.body.range[0] + 1);
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case "ForStatement":
                    {
                        this.fcnReturns.push(item.body.range[0] + 1);

                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.range[0], item.range[1]);
                        this.parseVariable(scopeName + ".local", item.init, item.body.range[0] + 1);
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case "IfStatement":
                    {
                        this.extractVariables(scopeName + ".local", item.consequent);
                        this.extractVariables(scopeName + ".local", item.alternate);

                        break;
                    }
                case 'WhileStatement':
                case 'BlockStatement':
                    {
                        this.markLineOverrides.push(item.body.range[0] + 1);
                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.range[0] + 0, item.range[1] - 1);
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
                        this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1]);
                    }

                    if (item.right && item.right.type == "ObjectExpression") {console.log('hee');
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
                                this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1]+1);
                            }
                        }
                        else {
                            let calledFunc = item.callee.name;

                            for (let i = 0; i < item.arguments.length; i++) {
                                let argument = item.arguments[i];
                                let paramName = argument.name;

                                let vardeclaration = this.getVariableDeclarationInScope(scopeName, undefined, paramName);

                                if (vardeclaration.length > 0) {
                                    if (calledFunc in this.funcDefs) { // TODO: Handle missing function decl
                                        this.refs[scopeName + "." + paramName] = calledFunc + "." + this.funcDefs[calledFunc][i];
                                    }
                                }

                            }
                        }

                        if (item.arguments) {
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
        for (const noMarkZoneRange of this.noMarkLineZone) {
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
        for (const scope of Object.keys(this.scopes)) {
            let injectedCode = MustacheIt.render(";startScope('{{scope}}');", { scope: scope });
            addCodeInjection(this.scopes[scope].startOfDefinitionIndex, injectedCode);
        };

        // Variable setting
        for (const scope of Object.keys(this.vars)) {
            for (const index of Object.keys(this.vars[scope])) {            
                let vardata = this.vars[scope][index];
                for (const endOfDefinitionIndex of vardata.endOfDefinitionIndexes) {                
                    let injectedCode = MustacheIt.render(";setVar('{{scopeName}}', '{{name}}', {{name}});", { scopeName: vardata.scopeName, name: vardata.name });
                    addCodeInjection(endOfDefinitionIndex, injectedCode);
                };
            };
        };

        // Scope end setting
        for (const scope of Object.keys(this.vars)) {
            let injectedCode = MustacheIt.render(";endScope('{{scope}}');", { scope: scope });
            addCodeInjection(this.scopes[scope].endOfDefinitionIndex, injectedCode);
        };

        // Function returns
        for (const endOfDefinitionIndex of this.fcnReturns) {                        
            addCodeInjection(endOfDefinitionIndex, "<FCNRET>");
        };

        // Mark line overrides
        for (const endOfDefinitionIndex of this.markLineOverrides) {                        
            addCodeInjection(endOfDefinitionIndex, "<MARKLINE>");
        };
console.log(this.noMarkLineZone);
        // Inject cookies in code        
        for (const indexEndOfDef of Object.keys(injectAtIndex).reverse()) {                                
            let index = parseInt(indexEndOfDef);

            let stringsToInject = injectAtIndex[index].join('');
            this.code = this.code.slice(0, index) + stringsToInject + this.code.slice(index);

            this.updateNoMarkLineZone(index, stringsToInject.length);
        };
    }

    private parseCode(): boolean {
        if (!this.code)
            return false;

        let syntax = undefined;

        try {
            syntax = esprima.parseScript(this.code, { range: true });
            logd(syntax);

        } catch (error) {
            this.onCompilationStatus(false, "line " + error.lineNumber + "> " + error.description);
            return false;
        }

        this.vars = {};
        this.scopes = {};
        this.fcnReturns = [];
        this.markLineOverrides = [];

        this.scopes['global'] = new ScopeDeclaration(syntax.range[0], syntax.range[1]);
        this.extractVariables('global', syntax);        

        this.injectCookies();

        let skippedLineMarkers = ['{', '}', '/*', '*/'];

        // Mark lines with no code
        let lineNo = 1;
        let lineByLine = this.code.split('\n');

        for (let line of lineByLine) {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0 || (trimmedLine.length == 1 && (skippedLineMarkers.indexOf(trimmedLine) != -1))) {
                this.emptyCodeLineNumbers.push(lineNo);
            }

            if (trimmedLine.indexOf('//') == 0) {
                this.emptyCodeLineNumbers.push(lineNo);
            }

            lineNo++;
        }

        let replaceTokens = (token: string, replacement: string, line: string, currIndexInCode: number): string => {
            let replacedTokenStr = "";
            let tokenizedLines = line.split(token);
            let diffLen = replacement.length - token.length;

            for (let indexLine = 0; indexLine < tokenizedLines.length - 1; indexLine++) {
                let tokenizedLine = tokenizedLines[indexLine];
                if (this.isInNoMarkLineZone(currIndexInCode + tokenizedLine.length)) {
                    replacedTokenStr += tokenizedLine;
                    this.updateNoMarkLineZone(currIndexInCode + replacedTokenStr.length, diffLen);
                }
                else {                    
                    replacedTokenStr += (tokenizedLine + replacement);
                    // MISTERY
                    //let insertedSize = (tokenizedLine + replacement).length;
                    // this.updateNoMarkLineZone(currIndexInCode + replacedTokenStr.length - insertedSize, diffLen);
                }
            }

            return replacedTokenStr + (tokenizedLines.length > 1 ? tokenizedLines[tokenizedLines.length - 1] : line);
        }

        let insertInLine = (insertionStr: string, offsetInLine: number, line: string, currIndexInCode: number): string => {
            if (this.isInNoMarkLineZone(currIndexInCode + offsetInLine))
                return line;

            this.updateNoMarkLineZone(currIndexInCode + offsetInLine, insertionStr.length);

            return line.substring(0, offsetInLine) + insertionStr + line.substring(offsetInLine);
        }

        // Start of line markers
        lineNo = 1;
        lineByLine = this.code.split('\n');
        this.code = "";
        let currentIndexInCode = 0;
        let prevLineEndsWithComma = false;

        for (let line of lineByLine) {
            let trimmedLine = line.trim();
            if (trimmedLine.length) {                
                if (skippedLineMarkers.indexOf(trimmedLine) == -1) {                    
                    let codeLineMarker = MustacheIt.render(";markcl({{lineNo}});", { lineNo: lineNo });

                    if (line.indexOf("<MARKLINE>") != -1) {
                        line = replaceTokens("<MARKLINE>", codeLineMarker, line, currentIndexInCode);
                    }
                    else {
                        if (!prevLineEndsWithComma && trimmedLine.indexOf("case") == -1) {
                            if (trimmedLine[0] == '{') { // handles for loop with { on new line                                                                
                                line = insertInLine(codeLineMarker, 1, "{" + line.replace('{', ''), currentIndexInCode);
                            }
                            else
                                line = insertInLine(codeLineMarker, 0, line, currentIndexInCode);
                        }

                        line = replaceTokens("<FCNRET>", codeLineMarker, line, currentIndexInCode);
                    }
                }

                prevLineEndsWithComma = trimmedLine[trimmedLine.length - 1] == ',';
            }

            lineNo++;
            if (line.length)
                this.code += line + '\n';

            currentIndexInCode += line.length;
        }

        return true;
    }
}

(<any>window)['markcl'] = (lineNo: number) => {
    (<any>window).oprec.markStartCodeLine(lineNo);
};

(<any>window)['setVar'] = (scopeName: string, varname: string, varobject: any) => {
    (<any>window).oprec.setVar(scopeName, varname, varobject);
};

(<any>window)['startScope'] = (scopeName: string) => {
    (<any>window).oprec.startScope(scopeName);
};

(<any>window)['endScope'] = (scopeName: string) => {
    (<any>window).oprec.endScope(scopeName);
};