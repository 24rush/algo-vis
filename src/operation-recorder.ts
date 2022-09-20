import { ArrayTypeChangeCbk, ObservableArrayType, ObservablePrimitiveType, ObservableTypes, PrimitiveTypeChangeCbk } from "./observable-type.js";
import { logd, strformat, esprima } from "../main.js"

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

/* ******************* */

/*
 OPERATION PAYLOADS
 */

class RWPrimitiveOperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any) {

    }
}

class RWPropertyObjectOperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any, public property: any) {

    }
}

class ScopeOperationPayload {
    constructor(public scopeName) { }
}

class VarCreationOperationPayload {
    constructor(public scopeName, public varName) { }
}

class TraceOperationPayload {
    constructor(public message) { }
}

type OperationAttributeType = RWPrimitiveOperationPayload | RWPropertyObjectOperationPayload | ScopeOperationPayload | VarCreationOperationPayload | TraceOperationPayload;

/* ******************* */

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

class NotificationEmitter implements VariableScopingNotification, TraceMessageNotification {

    private variableScopeObservers: VariableScopingNotification[] = [];
    private traceMessageObservers: TraceMessageNotification[] = [];

    public registerVarScopeNotifier(notifier: VariableScopingNotification) {
        this.variableScopeObservers.push(notifier);
    }

    public registerTraceNotifier(notifier: TraceMessageNotification) {
        this.traceMessageObservers.push(notifier);
    }

    onEnterScopeVariable(scopeName: string, observable: ObservableTypes): void {
        this.variableScopeObservers.forEach(notifier => {
            notifier.onEnterScopeVariable(scopeName, observable);
        });
    }
    onExitScopeVariable(scopeName: string, observable: ObservableTypes): void {
        this.variableScopeObservers.forEach(notifier => {
            notifier.onExitScopeVariable(scopeName, observable);
        });
    }

    onTraceMessage(message: string): void {
        this.traceMessageObservers.forEach(notifier => {
            notifier.onTraceMessage(message);
        });
    }
}

export class OperationRecorder implements PrimitiveTypeChangeCbk<any>, ArrayTypeChangeCbk<any> {
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
        window["oprec"] = this;
        this.scopes = {};
        this.vars = {};
    }

    // CODE Parsing
    private vars: any; // [scopeName][varname] = VariableDeclaration
    private scopes: any; // [scopeName] = ScopeDeclaration
    private emptyCodeLineNumbers: number[] = [];
    private fcnReturns: number[] = [];

    // Notifications
    private notificationEmitter: NotificationEmitter = new NotificationEmitter();

    protected primitiveTypeObservers: ObservablePrimitiveType<any>[] = [];
    protected arrayTypeObservers: ObservableArrayType<any>[] = [];

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

    protected code: string;

    private reset() {
        this.code = "";

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

        this.maxLineNumber = 0;
        this.firstExecutedCodeLineNumber = -1;
        this.lastExecutedCodeLineNumber = -1;
        this.lastExecutedOperationIndex = -1;
    }

    public setSourceCode(code: string) {
        this.reset();

        this.code = code;
        this.parseCode();
    }

    public registerVariableScopeNotifier(notifier: VariableScopingNotification) {
        this.notificationEmitter.registerVarScopeNotifier(notifier);
    }

    public registerTraceMessageNotifier(notifier: TraceMessageNotification) {
        this.notificationEmitter.registerTraceNotifier(notifier);
    }

    public getFirstCodeLineNumber(): number {
        return this.firstExecutedCodeLineNumber;
    }

    public getLastCodeLineNumber(): number {
        if (this.operations.length == 0) return 0;

        return this.operations[this.operations.length - 1].codeLineNumber;
    }

    public getCurrentCodeLineNumber(): number { return this.lastExecutedCodeLineNumber; }
    public getNextCodeLineNumber(): number {
        if (this.nextOperationIndex < this.operations.length && this.nextOperationIndex >= 0) {
            return this.operations[this.nextOperationIndex].codeLineNumber;
        }

        return this.getCurrentCodeLineNumber();
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

    public recordSourceCode() {
        this.status = OperationRecorderStatus.Recording;

        logd(this.vars); logd(this.scopes);
        logd(this.code);

        this.hookConsoleLog();
        (1, eval)(this.code);
        this.hookConsoleLog(false);

        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.unregisterObserver(this);
        }

        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.unregisterObserver(this);
        }

        this.status = OperationRecorderStatus.Idle;
        this.maxLineNumber = this.lastExecutedCodeLineNumber;
        console.log(this.operations);
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

            let self = this;
            console.log = function (message) {
                let strRepr = "";
                for (let arg of arguments)
                    strRepr += arg + ' ';

                self.addOperation(OperationType.TRACE, new TraceOperationPayload(strRepr));
                self.consoleLogFcn.apply(console, arguments);
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

    public executeCurrentOperation(reverse: boolean = false): void {
        let operation = this.getNextOperation();

        if (!operation) {
            return;
        }

        switch (operation.type) {
            case OperationType.TRACE:
                {
                    let operationAttributes = operation.attributes as TraceOperationPayload;
                    this.notificationEmitter.onTraceMessage(operationAttributes.message);
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
                        if (operation.type == OperationType.SCOPE_START) {
                            variable.observable.empty();
                        }

                        (operation.type == OperationType.SCOPE_START || operation.type == OperationType.CREATE_VAR) ?
                            this.notificationEmitter.onEnterScopeVariable(operationAttributes.scopeName, variable.observable) :
                            this.notificationEmitter.onExitScopeVariable(operationAttributes.scopeName, variable.observable);
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

    private setVar(scopeName: string, varName: string, object: any) {
        var type;
        let variable = this.vars[scopeName][varName];

        let isArray = this.isObjectPropertyType(object);

        if (isArray) {
            if (object.length >= 0) {
                type = typeof object[0];
            }
        } else {
            type = typeof object;
        }

        if (!variable.observable) {
            switch (type) {
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

            this.addOperation(OperationType.CREATE_VAR, new VarCreationOperationPayload(scopeName, varName));
        }

        switch (type) {
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
        }
    }

    private extractVariables(scopeName: string, scope: any) {
        if (!scope || !scope.body)
            return;

        let body = !(length in scope.body) ? scope.body.body : scope.body;

        for (let item of body) {
            switch (item.type) {
                case "VariableDeclaration":
                    {
                        this.parseVariable(scopeName, item);
                        break;
                    }
                case 'FunctionDeclaration':
                    {
                        var funcScope = item.id.name; logd(item);
                        for (let param of item.params) {
                            this.createVariable(funcScope, param.name, VarType.var, item.body.range[0] + 1);
                        }

                        this.scopes[funcScope] = new ScopeDeclaration(item.body.range[0] + 1, item.body.range[1] - 1);
                        this.extractVariables(funcScope, item);
                        break;
                    }
                case "ReturnStatement":
                    {
                        let beginIndexReturn = item.range[0];
                        for (let scope in this.scopes) {
                            let scopeDecl = this.scopes[scope];
                            if (scopeDecl.startOfDefinitionIndex < beginIndexReturn) {
                                if (scope.indexOf("global") != -1)
                                    continue;

                                this.scopes[scope].endOfDefinitionIndex = beginIndexReturn;
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
                        break;
                    }
                case 'WhileStatement':
                case 'BlockStatement':
                    {
                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.range[0] + 0, item.range[1] - 1);
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case 'ExpressionStatement':
                    {
                        switch (item.expression.type) {
                            case "UpdateExpression":
                            case "AssignmentExpression": {
                                let varName = '';

                                if (item.expression.type == "AssignmentExpression")
                                    varName = !item.expression.left.object ? item.expression.left.name : item.expression.left.object.name;
                                else
                                    varName = item.expression.argument.object.name;

                                let foundInScope = scopeName;

                                let vardeclaration = this.getVariableDeclarationInScope(foundInScope, undefined, varName);
                                if (vardeclaration.length == 0) {
                                    foundInScope = scopeName.split(".local").join("");
                                    vardeclaration = this.getVariableDeclarationInScope(foundInScope, undefined, varName);
                                }

                                if (vardeclaration.length > 0) {
                                    this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1]);
                                }

                                break;
                            }
                            case "CallExpression":
                                {
                                    this.fcnReturns.push(item.range[1]);

                                    break;
                                }
                        }
                    }
            }
        }
    }

    private parseCode() {
        if (!this.code)
            return;

        let syntax = esprima.parseScript(this.code, { range: true });
        logd(syntax);

        this.vars = {};
        this.scopes['global'] = new ScopeDeclaration(syntax.range[0], syntax.range[1]);

        this.extractVariables('global', syntax);

        let injectAtIndex = {};
        let addCodeInjection = function (index: number, injectedCode: string) {
            if (!(index in injectAtIndex))
                injectAtIndex[index] = [];

            injectAtIndex[index].push(injectedCode);
        };

        // Scope setting
        Object.keys(this.scopes).forEach((scope) => {
            let injectedCode = strformat("startScope('{0}');", scope);
            addCodeInjection(this.scopes[scope].startOfDefinitionIndex, injectedCode);

            injectedCode = strformat("endScope('{0}');", scope);
            addCodeInjection(this.scopes[scope].endOfDefinitionIndex, injectedCode);
        });

        // Variable setting
        Object.keys(this.vars).forEach((scope) => {
            Object.keys(this.vars[scope]).forEach((index) => {
                let vardata = this.vars[scope][index];
                vardata.endOfDefinitionIndexes.forEach(endOfDefinitionIndex => {
                    let injectedCode = strformat("setVar('{0}', '{1}', {2});", vardata.scopeName, vardata.name, vardata.name);
                    addCodeInjection(endOfDefinitionIndex, injectedCode);
                });
            })
        });

        // Function returns
        this.fcnReturns.forEach(endOfDefinitionIndex => {
            addCodeInjection(endOfDefinitionIndex, "<FCNRET>");
        });

        let skippedLineMarkers = ['{', '}'];

        // Inject setVar
        Object.keys(injectAtIndex).reverse().forEach((indexEndOfDef) => {
            let index = parseInt(indexEndOfDef);
            this.code = this.code.slice(0, index) + injectAtIndex[index].join('') + this.code.slice(index);
        });

        // Mark lines with no code
        let lineNo = 1;
        let lineByLine = this.code.split('\n');

        for (let line of lineByLine) {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0 || (trimmedLine.length == 1 && (skippedLineMarkers.indexOf(trimmedLine) != -1))) {
                this.emptyCodeLineNumbers.push(lineNo);
            }

            if (trimmedLine.indexOf('//') != -1) {
                this.emptyCodeLineNumbers.push(lineNo);
            }

            lineNo++;
        }

        // Start of line markers
        lineNo = 1;
        lineByLine = this.code.split('\n');
        this.code = "";

        for (let line of lineByLine) {
            let trimmedLine = line.trim();
            if (trimmedLine.length && (skippedLineMarkers.indexOf(trimmedLine) == -1)) {
                let codeLineMarker = strformat("markcl({0});", lineNo);

                if (trimmedLine[0] == '{') { // handles for loop with { on new line
                    line = line.replace('{', '');
                    line = strformat("\{{0}{1}", codeLineMarker, line);
                }
                else
                    line = strformat("{0}{1}", codeLineMarker, line);

                line = line.split("<FCNRET>").join(codeLineMarker);
            }

            lineNo++;
            if (line.length)
                this.code += line + '\n';
        }
    }
}

window['markcl'] = function (lineNo: number) {
    window['oprec'].markStartCodeLine(lineNo);
}

window['setVar'] = function (scopeName: string, varname: string, varobject: any) {
    window['oprec'].setVar(scopeName, varname, varobject);
}

window['startScope'] = function (scopeName: string) {
    window['oprec'].startScope(scopeName);
}

window['endScope'] = function (scopeName: string) {
    window['oprec'].endScope(scopeName);
}