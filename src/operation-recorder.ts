import { ArrayTypeChangeCbk, ObservableArrayType, ObservablePrimitiveType, ObservableTypes, PrimitiveTypeChangeCbk } from "./observable-type.js";
import { logd, strformat, esprima } from "../main.js"

enum OperationType {
    NONE = 0,

    READ,
    READ_AT,
    WRITE,
    WRITE_AT,

    LINE_NUMBER,
    SCOPE_START,
    SCOPE_END,
    CREATE_VAR
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

    constructor(protected scopeName: string, protected name: string, protected vartype: VarType, protected endOfDefinitionIndex: number) {
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

type OperationAttributeType = RWPrimitiveOperationPayload | RWPropertyObjectOperationPayload | ScopeOperationPayload;

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
    Replaying
}

export interface VariableScopingNotification {
    onEnterScopeVariable(scopeName: string, observable: ObservableTypes): void;
    onExitScopeVariable(scopeName: string, observable: ObservableTypes): void;
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

    private variableScopeObservers: VariableScopingNotification[] = [];
    private activeScopes: string[] = [];

    protected primitiveTypeObservers: ObservablePrimitiveType<any>[] = [];
    protected arrayTypeObservers: ObservableArrayType<any>[] = [];

    protected operations: Operation[] = [];
    protected nextOperationIndex: number = 0;
    protected firstExecutedCodeLineNumber: number = -1;
    protected lastExecutedCodeLineNumber: number = -1;
    protected lastExecutedOperationIndex: number = -1;

    protected maxLineNumber: number = 0;

    protected status: OperationRecorderStatus = OperationRecorderStatus.Idle;

    protected addOperation(type: OperationType, attributes?: OperationAttributeType) {
        this.operations.push(new Operation(type, this.lastExecutedCodeLineNumber, attributes));
    }

    protected code: string;
    public setSourceCode(code: string) {
        this.code = code;
        this.parseCode();
    }

    public registerVariableScopeNotifier(notifier: VariableScopingNotification) {
        this.variableScopeObservers.push(notifier);
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

    public markStartCodeLine(lineNumber: number): boolean {
        if (this.isEmptyLine(lineNumber))
            return;

        this.lastExecutedCodeLineNumber = lineNumber;// - 1;
        this.addOperation(OperationType.NONE);

        if (this.firstExecutedCodeLineNumber == -1)
            this.firstExecutedCodeLineNumber = lineNumber;

        return true;
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

    public startRecording() {
        this.status = OperationRecorderStatus.Recording;

        logd(this.vars); logd(this.scopes);
        logd(this.code);

        (1, eval)(this.code);
    }

    public stopRecording() {
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
        if (this.status != OperationRecorderStatus.Idle)
            throw "Operation Recorder not IDLE";

        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.empty();
        }
        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.empty();
        }

        this.nextOperationIndex = 0;
        this.lastExecutedCodeLineNumber = this.getFirstCodeLineNumber();
        this.status = OperationRecorderStatus.Replaying;
    }

    public stopReplay() {
        this.nextOperationIndex = 0;
        this.firstExecutedCodeLineNumber = -1;
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

    private isEmptyLine(lineNumber: number): boolean {
        return this.emptyCodeLineNumbers.indexOf(lineNumber) != -1;
    }

    private isActiveScope(scopeName: string): boolean {
        return this.activeScopes.indexOf(scopeName) != -1;
    }

    private activateScope(scopeName: string) {
        if (this.isActiveScope(scopeName))
            return;

        this.activeScopes.push(scopeName);
    }

    private deactivateScope(scopeName: string) {
        if (!this.isActiveScope(scopeName))
            return;

        this.activeScopes = this.activeScopes.slice(this.activeScopes.indexOf(scopeName), 1);
    }

    private checkRecoverExecutionEdges(reverse: boolean = false) {
        if (!reverse) { // Advance from start
            if (this.nextOperationIndex == -1)
                this.nextOperationIndex = 0;
        } else {
            if (this.nextOperationIndex == this.operations.length)
                this.nextOperationIndex = this.operations.length - 1;
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
        if (this.status == OperationRecorderStatus.Recording)
            throw "Operation Recorder not IDLE";

        let operation = this.getNextOperation();

        if (!operation) {
            return;
        }

        switch (operation.type) {
            case OperationType.SCOPE_START:
            case OperationType.SCOPE_END:
                {
                    let operationAttributes = operation.attributes as ScopeOperationPayload;

                    for (let notifier of this.variableScopeObservers) {
                        let varsInScope = this.vars[operationAttributes.scopeName];
                        if (varsInScope == undefined || varsInScope.length == 0)
                            continue;

                        for (let variableName of Object.keys(varsInScope)) {
                            let variable = this.vars[operationAttributes.scopeName][variableName];

                            if (operation.type == OperationType.SCOPE_START) {
                                if (!this.isActiveScope(operationAttributes.scopeName)) {
                                    this.activateScope(operationAttributes.scopeName);
                                    variable.observable.empty();
                                    notifier.onEnterScopeVariable(operationAttributes.scopeName, variable.observable);
                                }
                            } else {
                                this.deactivateScope(operationAttributes.scopeName);
                                notifier.onExitScopeVariable(operationAttributes.scopeName, variable.observable);
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
            if (object.length > 0) {
                type = typeof object[0];
            }
        } else {
            type = typeof object;
        }

        if (type) {
            if (!variable.observable) {
                switch (type) {
                    case 'number':
                        variable.observable = isArray ? new ObservableArrayType<number>(varName, object) : new ObservablePrimitiveType<number>(varName, object);
                        isArray ? this.registerArray(variable.observable) : this.registerPrimitive(variable.observable);
                        break;
                    case 'string':
                        variable.observable = isArray ? new ObservableArrayType<string>(varName, object) : new ObservablePrimitiveType<string>(varName, object);
                        isArray ? this.registerArray(variable.observable) : this.registerPrimitive(variable.observable);
                        break;
                }
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
    }

    private registerVarInScope(scopeName: string, varname: string, vardecl: VariableDeclaration) {
        if (!(scopeName in this.vars))
            this.vars[scopeName] = {};

        this.vars[scopeName][varname] = vardecl;
    }

    private createVariable(scopeName: string, varName: string, varType: VarType, endOfDefinitionIndex: number): VariableDeclaration {
        let varDecl = new VariableDeclaration(scopeName, varName, varType, endOfDefinitionIndex);
        this.registerVarInScope(scopeName, varName, varDecl);

        return varDecl;
    }

    private parseVariable(scopeName: string, vardata: any, declIndexOverwrite: number = -1) {
        if (vardata.declarations.length == 0)
            return;

        for (let decl of vardata.declarations) {
            logd(decl);

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
                        this.scopes[item.id.name] = new ScopeDeclaration(item.body.range[0] + 1, item.body.range[1] - 1);
                        this.extractVariables(item.id.name, item);
                        break;
                    }
                case "ForOfStatement":
                case "ForInStatement":
                    {
                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.body.range[0] + 1, item.body.range[1]);
                        this.createVariable(scopeName + ".local", item.left.name, VarType.let, item.body.range[0] + 1);
                        break;
                    }
                case "ForStatement":
                    {
                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.range[0], item.range[1]);
                        this.parseVariable(scopeName + ".local", item.init, item.body.range[0] + 1);
                        break;
                    }
                case 'WhileStatement':
                case 'BlockStatement':
                    {
                        this.scopes[scopeName + ".local"] = new ScopeDeclaration(item.range[0] + 1, item.range[1] - 1);
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case 'ExpressionStatement':
                    {
                        if (item.expression.type == "AssignmentExpression") {
                            if (scopeName in this.vars && item.expression.left.name in this.vars[scopeName]) {
                                let vardeclaration = this.vars[scopeName][item.expression.left.name];

                                let varDeclaration = new VariableDeclaration(scopeName, item.expression.left.name, vardeclaration.kind,
                                    item.range[1]);

                                this.registerVarInScope(scopeName, item.expression.left.name, varDeclaration);
                            }
                        }
                        break;
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
                let indexEndOfDef = vardata.endOfDefinitionIndex;
                let injectedCode = strformat("setVar('{0}', '{1}', {2});", vardata.scopeName, vardata.name, vardata.name);

                addCodeInjection(indexEndOfDef, injectedCode);
            })
        });

        let skippedLineMarkers = ['{', '}'];

        // Mark lines with no code
        let lineNo = 1;
        let lineByLine = this.code.split('\n');

        for (let line of lineByLine) {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0 || (trimmedLine.length == 1 && (skippedLineMarkers.indexOf(trimmedLine) != -1))) {
                this.emptyCodeLineNumbers.push(lineNo);
            }

            lineNo++;
        }

        Object.keys(injectAtIndex).reverse().forEach((indexEndOfDef) => {
            let index = parseInt(indexEndOfDef);
            this.code = this.code.slice(0, index) + injectAtIndex[index].join('') + this.code.slice(index);
        });

        // Start of line markers
        lineNo = 1;
        lineByLine = this.code.split('\n');
        this.code = "";

        for (let line of lineByLine) {
            let trimmedLine = line.trim();
            if (trimmedLine.length && (skippedLineMarkers.indexOf(trimmedLine) == -1)) {
                if (trimmedLine[0] == '{') {
                    line = line.replace('{', '');
                    line = strformat("\{markStartCodeLine({0});{1}\n", lineNo, line);
                }
                else
                    line = strformat("markStartCodeLine({0});{1}\n", lineNo, line);
            }

            lineNo++;
            this.code += line;
        }
    }
}

window['markStartCodeLine'] = function (lineNo: number) {
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