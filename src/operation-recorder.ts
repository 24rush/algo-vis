import { ObservableJSVariable, JSVariableChangeCbk } from "./observable-type";
import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./av-types";
import { NodeBase, GraphVariableChangeCbk, ObservableGraph, ParentSide, GraphNodePayloadType, GraphType } from './av-types-interfaces'
import { CodeExecutorEvents, CodeExecutorProxy } from "./code-executor-proxy";
import { UserInteractionType } from "./code-executor";

var esprima = require('esprima')

enum OperationType {
    NONE,
    FORCE_MARK, // force the debugger to stop at a line even if it has only skipable operations

    READ,
    READ_AT,
    WRITE,
    WRITE_AT,
    WRITE_REF,

    SCOPE_START,
    SCOPE_END,
    CREATE_VAR,
    CREATE_REF,

    GRAPH_ADD_EDGE,
    GRAPH_ADD_VERTEX,
    GRAPH_REMOVE_EDGE,
    GRAPH_REMOVE_VERTEX,

    BINARY_TREE_ADD_NODE,
    BINARY_TREE_ADD_EDGE, // Visualizer purposes
    BINARY_TREE_REMOVE_NODE,
    BINARY_TREE_REMOVE_EDGE, // Visualizer purposes

    GRAPH_ACCESS_NODE,

    TRACE,
    SYS_FUNC_CALL,
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

class OperationPayload {
    execute(_operationType: OperationType): void { };
}

class RWPrimitiveOperationPayload extends OperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any) { super(); }

    override execute(operationType: OperationType): void {
        switch (operationType) {
            case OperationType.READ:
                this.observable.getValue(this.oldValue);
                break;
            case OperationType.WRITE:
                this.observable.setValue(this.newValue);
                break;
            case OperationType.WRITE_REF:
                this.observable.setReference(this.newValue);
                break;
            default:
                throw 'Cannot process operation type: ' + operationType;
        }
    }
}

class RWIndexedObjectOperationPayload extends OperationPayload {
    constructor(public observable: any, public oldValue: any, public newValue: any, public property: any) { super(); }

    execute(operationType: OperationType): void {
        switch (operationType) {
            case OperationType.WRITE_AT:
                this.observable.setValueAtIndex(this.newValue, this.property);
                break;
            case OperationType.READ_AT:
                this.observable.getAtIndex(this.property);
                break;
            default:
                throw 'Cannot process operation type: ' + operationType;
        }
    }
}

class GraphObjectOperationPayload extends OperationPayload {
    constructor(public observable: ObservableGraph, public source: GraphNodePayloadType, public destinationOrParent?: GraphNodePayloadType, public side?: ParentSide) { super(); }

    public execute(operationType: OperationType) {
        this.executeOperationOnGraph(operationType, this.observable);
    }

    private executeOperationOnGraph(operationType: OperationType, observableGraph: ObservableGraph) {
        switch (operationType) {
            case OperationType.GRAPH_ADD_EDGE:
                (observableGraph as Graph).addEdge(this.source, this.destinationOrParent);
                break;
            case OperationType.GRAPH_ADD_VERTEX:
                (observableGraph as Graph).addVertex(this.source);
                break;
            case OperationType.GRAPH_REMOVE_EDGE:
                (observableGraph as Graph).removeEdge(this.source, this.destinationOrParent);
                break;
            case OperationType.GRAPH_REMOVE_VERTEX:
                (observableGraph as Graph).removeVertex(this.source);
                break;
            case OperationType.BINARY_TREE_ADD_NODE:
                if (observableGraph instanceof BinarySearchTree)
                    (observableGraph as BinarySearchTree).add(this.source);
                else
                    (observableGraph as BinaryTree).add(this.source, this.destinationOrParent, this.side);
                break;
            case OperationType.BINARY_TREE_REMOVE_NODE:
                (observableGraph as BinaryTree).remove(this.source);
                break;
            case OperationType.BINARY_TREE_ADD_EDGE:
            case OperationType.BINARY_TREE_REMOVE_EDGE:
                // Nothing to do
                break;
            case OperationType.GRAPH_ACCESS_NODE:
                observableGraph.accessValue(this.source);
                break;
            default:
                throw 'Cannot process operation type: ' + operationType;
        }
    }
}

class VarScopeLifetimeOperationPayload extends OperationPayload {
    constructor(public scopeName: string, public varName?: string) { super(); }
}

class TraceOperationPayload extends OperationPayload {
    constructor(public message: string) { super(); }
}

class Operation {
    constructor(public type: OperationType, public codeLineNumber: number, public attributes: OperationPayload) {
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
    Executing,
    ReplayEnded,
    Waiting
}

export interface VariableScopingNotification {
    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable): void;
    onExitScopeVariable(scopeName: string, observable: ObservableJSVariable): void;
}

export interface MessageNotification {
    onTraceMessage(message: string): void;

    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string) : void;
}

export interface CompilationStatusNotification {
    onCompilationError(status: boolean, message?: string): void;
}

export interface ExceptionNotification {
    onExceptionMessage(status: boolean, message: string): void;
}

export interface ExecutionStatus {
    onLineExecuted(lineNo: number): void;
    onExecutionFinished(): void;
}

type NotificationTypes = VariableScopingNotification | MessageNotification | CompilationStatusNotification | ExceptionNotification | ExecutionStatus;

class NotificationEmitter implements VariableScopingNotification, MessageNotification, CompilationStatusNotification, ExceptionNotification, ExecutionStatus {
    private notificationObservers: NotificationTypes[] = [];

    public registerNotificationObserver(notifier: NotificationTypes) {
        this.notificationObservers.push(notifier);
    }

    private variableScopingNotifications(): VariableScopingNotification[] {
        let notifiers: VariableScopingNotification[] = [];

        for (const notifier of this.notificationObservers) {
            if ('onEnterScopeVariable' in notifier)
                notifiers.push(notifier as VariableScopingNotification);
        }

        return notifiers;
    }

    private traceMessageNotifications(): MessageNotification[] {
        let notifiers: MessageNotification[] = [];

        for (const notifier of this.notificationObservers) {
            if ('onTraceMessage' in notifier)
                notifiers.push(notifier as MessageNotification);
        }

        return notifiers;
    }

    private compilationStatusNotifications(): CompilationStatusNotification[] {
        let notifiers: CompilationStatusNotification[] = [];

        for (const notifier of this.notificationObservers) {
            if ('onCompilationError' in notifier)
                notifiers.push(notifier as CompilationStatusNotification);
        }

        return notifiers;
    }

    private exceptionNotifications(): ExceptionNotification[] {
        let notifiers: ExceptionNotification[] = [];

        for (const notifier of this.notificationObservers) {
            if ('onExceptionMessage' in notifier)
                notifiers.push(notifier as ExceptionNotification);
        }

        return notifiers;
    }

    private executionStatusNotifications(): ExecutionStatus[] {
        let notifiers: ExecutionStatus[] = [];

        for (const notifier of this.notificationObservers) {
            if ('onLineExecuted' in notifier)
                notifiers.push(notifier as ExecutionStatus);
        }

        return notifiers;
    }

    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable): void {
        for (const notifier of this.variableScopingNotifications()) {
            notifier.onEnterScopeVariable(scopeName, observable);
        }
    }
    onExitScopeVariable(scopeName: string, observable: ObservableJSVariable): void {
        for (const notifier of this.variableScopingNotifications()) {
            notifier.onExitScopeVariable(scopeName, observable);
        };
    }

    // MessageNotification
    onTraceMessage(message: string): void {
        for (const notifier of this.traceMessageNotifications()) {
            notifier.onTraceMessage(message);
        };
    }
    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string): void {
        for (const notifier of this.traceMessageNotifications()) {
            notifier.onUserInteractionRequest(userInteraction, title, defValue);
        };
    }

    onCompilationError(status: boolean, message?: string): void {
        for (const notifier of this.compilationStatusNotifications()) {
            notifier.onCompilationError(status, message);
        };
    }

    onExceptionMessage(status: boolean, message?: string): void {
        for (const notifier of this.exceptionNotifications()) {
            notifier.onExceptionMessage(status, message);
        };
    }

    onLineExecuted(lineNo: number): void {
        for (const notifier of this.executionStatusNotifications()) {
            notifier.onLineExecuted(lineNo);
        }
    }

    onExecutionFinished(): void {
        for (const notifier of this.executionStatusNotifications()) {
            notifier.onExecutionFinished();
        }
    }

}

export class OperationRecorder extends NotificationEmitter implements CodeExecutorEvents, JSVariableChangeCbk, GraphVariableChangeCbk {
    onSetArrayValueEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(newValue))));
    }
    onSetReferenceEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE_REF, new RWPrimitiveOperationPayload(observable, value, newValue));
    }
    onSetEvent(observable: ObservableJSVariable | ObservableGraph, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, value, newValue));
    }
    onGetEvent(observable: ObservableJSVariable, value: any): void {
        this.addOperation(OperationType.READ, new RWPrimitiveOperationPayload(observable, value, value));
    }
    onSetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, newValue: any, index: number): void {
        this.addOperation(OperationType.WRITE_AT, new RWIndexedObjectOperationPayload(observable, value, newValue, index));
    }
    onGetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, index: number): void {
        this.addOperation(OperationType.READ_AT, new RWIndexedObjectOperationPayload(observable, value, value, index));
    }
    onSetObjectValueEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, new RWPrimitiveOperationPayload(observable, value, newValue));
    }
    onSetObjectPropertyEvent(observable: ObservableJSVariable, value: any, newValue: any, key: string | number | symbol): void {
        this.addOperation(OperationType.WRITE_AT, new RWIndexedObjectOperationPayload(observable, value, newValue, key));
    }
    onGetObjectPropertyEvent(observable: ObservableJSVariable, value: any, key: string | number | symbol): void {
        this.addOperation(OperationType.READ_AT, new RWIndexedObjectOperationPayload(observable, value, value, key));
    }

    // Graph
    onAccessNode(observable: ObservableGraph, node: NodeBase): void {
        this.addOperation(OperationType.GRAPH_ACCESS_NODE, new GraphObjectOperationPayload(observable, node.value));
    }
    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        this.addOperation(isGraph ? OperationType.GRAPH_ADD_EDGE : OperationType.BINARY_TREE_ADD_EDGE, new GraphObjectOperationPayload(runtimeObservable, source.value, destination.value));
    }
    onAddNode(observable: ObservableGraph, vertex: NodeBase, parentValue: NodeBase, side: ParentSide): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        this.addOperation(isGraph ? OperationType.GRAPH_ADD_VERTEX : OperationType.BINARY_TREE_ADD_NODE, new GraphObjectOperationPayload(runtimeObservable, vertex.value, parentValue ? parentValue.value : undefined, side));
    }
    onRemoveNode(observable: ObservableGraph, vertex: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        this.addOperation(isGraph ? OperationType.GRAPH_REMOVE_VERTEX : OperationType.BINARY_TREE_REMOVE_NODE, new GraphObjectOperationPayload(runtimeObservable, vertex.value));
    }
    onRemoveEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        this.addOperation(isGraph ? OperationType.GRAPH_REMOVE_EDGE : OperationType.BINARY_TREE_REMOVE_EDGE, new GraphObjectOperationPayload(runtimeObservable, source.value, destination.value));
    }

    constructor() {
        super();

        this.resetCodeParsingState();
    }

    // CODE Parsing
    private varDeclarations: Record<string, Record<string, VariableDeclaration>>; // [scopeName][varname] = VariableDeclaration
    private scopes: ScopeDeclaration[] = [];
    private refs: Record<string, string> = {}; // [funcName.paramName] = [scopeName.varName]
    private funcDefs: Record<string, string[]>; // [funcName] = [param...]
    private pushFuncParams: PushFuncParams[] = [];
    private emptyCodeLineNumbers: number[] = [];
    private fcnReturns: number[] = [];
    private markLineOverrides: number[] = [];
    private noMarkLineZone: IndexRange[] = [];

    protected observedVariables: ObservableJSVariable[] = [];
    private runtimeObservables: Map<string, any> = new Map();

    protected code: string;
    protected codeExecProxy: CodeExecutorProxy = new CodeExecutorProxy(this);

    protected operations: Operation[] = [];
    protected nextOperationIndex: number = 0;    
    protected lastExecutedCodeLineNumber: number = -1;

    protected currentScope: string[] = [];    

    protected status: OperationRecorderStatus = OperationRecorderStatus.Idle;
    public isReplayFinished(): boolean { return this.status == OperationRecorderStatus.ReplayEnded; }

    protected addOperation(type: OperationType, attributes?: OperationPayload) {
        this.operations.push(new Operation(type, this.lastExecutedCodeLineNumber, attributes));
        this.executeCurrentOperation();
    }

    private resetCodeParsingState() {
        this.emptyCodeLineNumbers = [];
        this.varDeclarations = {}; this.scopes = []; this.fcnReturns = [];
        this.refs = {}; this.funcDefs = {}; this.pushFuncParams = [];
        this.markLineOverrides = []; this.noMarkLineZone = [];
    }

    private resetExecutionState() {
        this.nextOperationIndex = 0;
        this.lastExecutedCodeLineNumber = -1;
        this.currentScope = [];

        this.operations = [];
        this.runtimeObservables = new Map();

        for (let primitiveObservers of this.observedVariables) {
            primitiveObservers.empty();
            primitiveObservers.unregisterObserver(this);
        }
    }

    public isWaiting(): boolean { return this.status == OperationRecorderStatus.Waiting; }
    public setWaiting(status: boolean) {
        this.status = status ? OperationRecorderStatus.Waiting : OperationRecorderStatus.Executing;
    }

    public setSourceCode(code: string): boolean {
        this.resetCodeParsingState();
        this.resetExecutionState();

        this.code = code;
        return this.parseCode();
    }

    public registerVariableObservers(observables: ObservableJSVariable[]) {
        for (let observable of observables)
            this.registerObservedVariable(observable);
    }

    public registerObservedVariable(observable: ObservableJSVariable) {
        if (this.observedVariables.indexOf(observable) != -1)
            return;

        this.observedVariables.push(observable);
    }

    public getNextCodeLineNumber(): number {
        if (this.nextOperationIndex < this.operations.length && this.nextOperationIndex >= 0) {
            return this.operations[this.nextOperationIndex].codeLineNumber;
        }

        return this.lastExecutedCodeLineNumber;
    }

    public forceMarkLine(lineNumber: number) {
        this.lastExecutedCodeLineNumber = lineNumber;        
        this.addOperation(OperationType.FORCE_MARK);
    }

    public markStartCodeLine(lineNumber: number) {
        console.log("OPERATIONS: "); console.log(this.operations);
        this.executeOneCodeLine();

        this.onLineExecuted(lineNumber);
    }

    public userInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string) {
        this.onUserInteractionRequest(userInteraction, title, defValue);
    }

    public onUserInteractionResponse(interactionType : UserInteractionType, value?: string | boolean) : void {
        this.codeExecProxy.userInteractionResponse(interactionType, value);
    }

    public onExecutionCompleted(): void {
        this.status = OperationRecorderStatus.ReplayEnded;
        this.onExecutionFinished();
    }

    private setRuntimeExecutionScope(type: OperationType, scopeName: string) {
        if (type == OperationType.SCOPE_START) {
            this.currentScope.push(scopeName);
        }

        if (type == OperationType.SCOPE_END) {
            if (this.currentScope[this.currentScope.length - 1] == scopeName)
                this.currentScope.pop();
            else {
                console.log(this.currentScope + " vs " + scopeName);
                throw ('LAST SCOPE IS NOT AS EXPECTED ');
            }
        }
    }

    public startScope(scopeName: string) {
        scopeName = this.scopeNameToFunctionScope(scopeName);        
        this.addOperation(OperationType.SCOPE_START, new VarScopeLifetimeOperationPayload(scopeName));
    }

    public endScope(scopeName: string) {
        scopeName = this.scopeNameToFunctionScope(scopeName);
        this.addOperation(OperationType.SCOPE_END, new VarScopeLifetimeOperationPayload(scopeName));
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

    private async executeSourceCode(): Promise<boolean> {
        if (this.status == OperationRecorderStatus.Executing)
            this.codeExecProxy.stopExecution();

        this.status = OperationRecorderStatus.Executing;

        console.log("VARS: "); console.log(this.varDeclarations);
        console.log("SCOPES: "); console.log(this.scopes);
        console.log("FUNCDEFS: "); console.log(this.funcDefs);
        console.log("PUSHPARAMS: "); console.log(this.pushFuncParams);
        console.log("NOMARKLINE: "); console.log(this.noMarkLineZone);
        console.log("MARKLINEOVERRIDES: "); console.log(this.markLineOverrides);

        console.log(this.code);

        this.onCompilationError(false);
        this.onExceptionMessage(false);

        try {
            console.log('worker send execute');

            await this.codeExecProxy.init();
            await this.codeExecProxy.setSourceCode(this.code);
            await this.codeExecProxy.execute();

        } catch (e) {
            console.log(e);
            let message = (typeof e == 'object' && 'message' in e) ? e.message : e;
            this.onExceptionMessage(true, message);

            return false;
        }

        return true;
    }

    public startReplay() {
        this.resetExecutionState();
        this.executeSourceCode();
    }

    public advanceOneCodeLine(): void {
        this.codeExecProxy.advanceOneCodeLine();
    }

    /*
        PRIVATES
    */

    private isEmptyLine(lineNumber: number): boolean {
        return this.emptyCodeLineNumbers.indexOf(lineNumber) != -1;
    }

    private getNextOperation(): Operation {
        if (this.nextOperationIndex >= 0 && this.nextOperationIndex < this.operations.length)
            return this.operations[this.nextOperationIndex];

        return undefined;
    }

    private executeOneCodeLine() {
        let currentOperationToExecute = this.getNextOperation();

        while (currentOperationToExecute) {
            this.executeCurrentOperation();
            currentOperationToExecute = this.getNextOperation();
        }

        this.operations = [];
        this.nextOperationIndex = 0;
    }

    private executeCurrentOperation(): void {
        let operation = this.getNextOperation();

        if (!operation) {
            return;
        }

        if (operation.type == OperationType.TRACE) {
            let operationAttributes = operation.attributes as TraceOperationPayload;
            this.onTraceMessage(operationAttributes.message);
        }

        switch (operation.type) {
            case OperationType.CREATE_REF:
            case OperationType.CREATE_VAR:
            case OperationType.SCOPE_START:
            case OperationType.SCOPE_END:
                {
                    let operationAttributes = operation.attributes as VarScopeLifetimeOperationPayload;
                    let scopeName = operationAttributes.scopeName;
                    let varName = operationAttributes.varName;

                    this.executeVarScopeLifetimeOperation(operation.type, varName, scopeName);
                    break;
                }
            default:
                {
                    if (operation.attributes) operation.attributes.execute(operation.type);
                }
        }
        
        this.lastExecutedCodeLineNumber = operation.codeLineNumber;

        this.nextOperationIndex += 1;
        if (this.nextOperationIndex < 0)
            this.nextOperationIndex = -1;

        if (this.nextOperationIndex >= this.operations.length)
            this.nextOperationIndex = this.operations.length;
    }

    private executeVarScopeLifetimeOperation(operationType: OperationType, varName: string, scopeName: string) {
        let scopeChain = scopeName.split('.');
        let lastScope = scopeChain.indexOf('!') != -1 ? scopeChain[scopeChain.length - 1] : scopeName;
        let currentRuntimeScope = this.getCurrentRuntimeScope();

        this.setRuntimeExecutionScope(operationType, lastScope);

        let varTypeFilter: VarType = undefined; // ending scope for all types of variables
        if (operationType != OperationType.SCOPE_END) {
            varTypeFilter = VarType.var;

            if (operationType == OperationType.CREATE_VAR || operationType == OperationType.CREATE_REF)
                varTypeFilter = VarType.let
        }

        let varDecls = this.getVariableDeclarationInScope(scopeName, varTypeFilter, varName).map(v => v.name);
        let runtimeObservables = this.getRuntimeObservables(currentRuntimeScope + (varName ? '.' + varName : ""));

        for (let runtimeObservable of runtimeObservables) {
            // Check to see if there is any variable declared in the scope
            // so we don't create an empty scope
            if (varDecls.indexOf(runtimeObservable.name) == -1)
                continue;

            if (operationType == OperationType.SCOPE_START) {
                runtimeObservable.empty();
            }

            switch (operationType) {
                case OperationType.SCOPE_END:
                    // var variables enter in scope already and it also creates the templates for scopes
                    this.onExitScopeVariable(currentRuntimeScope, runtimeObservable);
                    break;
                default:
                    this.onEnterScopeVariable(scopeName, runtimeObservable)
                    if (varTypeFilter == VarType.var) { // set var variables to undefined                        
                        runtimeObservable.setValue(undefined);
                    }
                    break;
            }
        }
    }

    private getRuntimeObservableWithId(id: number): any {
        for (let [_observableScope, observable] of this.runtimeObservables) {
            if (observable.id == id) {
                return observable;
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

    private createRuntimeObservable(scopeName: string, varname: string, object: any): [boolean, any] {
        let runtimeScope = scopeName + "." + varname;

        if (this.runtimeObservables.has(runtimeScope))
            return [false, this.runtimeObservables.get(runtimeScope)];

        let runtimeObservable: any;
        if (object && typeof object == 'object' && '__isGraphType__' in object) {
            switch (object.type) {
                case GraphType.DIRECTED:
                case GraphType.UNDIRECTED:
                    runtimeObservable = new Graph(object.type);
                    break;
                case GraphType.BT:
                    runtimeObservable = new BinaryTree(object.type);
                    break;
                case GraphType.BST:
                    runtimeObservable = new BinarySearchTree();
                    break;
            }

            object.name = varname;
            runtimeObservable.copyFrom(object);
        }
        else
            runtimeObservable = new ObservableJSVariable(varname, object);

        this.setInstrumentationObservable(runtimeScope, runtimeObservable);

        return [true, runtimeObservable];
    }

    private setInstrumentationObservable(runtimeScope: string, observable: any) {
        this.runtimeObservables.set(runtimeScope, observable);
        this.registerObservedVariable(observable);
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
        console.log('setvar ' + varname + " " + object + " " + varsource);

        if (object instanceof NodeBase || object instanceof BinaryTreeNode)
            return;

        let scopeName = this.getCurrentRuntimeScope();

        if (this.isReferenceObject(object)) {
            let varRuntimeScope = this.getCurrentRuntimeScope() + "." + varname;

            if (varsource) {
                let lastScope = this.currentScope[this.currentScope.length - 1];
                scopeName = this.getCurrentRuntimeScope().replace('.' + lastScope, '');
                this.refs[varRuntimeScope] = scopeName + "." + varsource;
            }

            let dstScopedVar = this.getReferencedObject(varRuntimeScope);

            if (varRuntimeScope != dstScopedVar) {
                let [isNew, runtimeObservable] = this.createRuntimeObservable(this.getCurrentRuntimeScope(), varname, dstScopedVar);

                if (isNew) {
                    this.addOperation(OperationType.CREATE_REF, new VarScopeLifetimeOperationPayload(this.getCurrentRuntimeScope(), varname));
                }

                runtimeObservable.setReference(dstScopedVar);

                // Overwrite with referenced variable
                let indexDot = dstScopedVar.lastIndexOf('.');
                varname = dstScopedVar.substring(indexDot + 1);
                scopeName = dstScopedVar.substring(0, indexDot);
            }
        }

        let [isNew, runtimeObservable] = this.createRuntimeObservable(scopeName, varname, object);

        if (isNew) {
            this.addOperation(OperationType.CREATE_VAR, new VarScopeLifetimeOperationPayload(this.getCurrentRuntimeScope(), varname));
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

    private scopeNameToFunctionScope(scopeName: string): string {
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

    private addNoMarklineZone(start: number, end: number) {
        this.noMarkLineZone.push(new IndexRange(start, end));
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
                        this.addNoMarklineZone(decl.init.range[0] - 1, decl.init.range[1] + 1);
                        break;
                    }
                    case "CallExpression": {
                        // Pass variable declaration start/end to be used for noMarkZone
                        this.extractVariables(scopeName, decl.init, vardata.range[0], vardata.range[1]);
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

    private extractVariables(scopeName: string, scope: any, varDeclStart?: number, varDeclEnd?: number) {
        if (!scope)
            return;

        let body = [scope];

        if (scope.body)
            body = !('length' in scope.body) && scope.body.body ? scope.body.body : (!('length' in scope.body) ? [scope.body] : scope.body);

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
                            this.createVariable(this.scopeNameToFunctionScope(funcName), param.name, VarType.let, item.body.range[0] + 1);
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
                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));

                        if (item.left && item.left.declarations && item.left.declarations.length > 0) {
                            this.createVariable(scopeName + ".local", item.left.declarations[0].id.name, VarType.let, item.body.range[0] + 1);
                        }

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
                case "CallExpression": {
                    // TODO : INVESTIGATE
                    //this.fcnReturns.push(item.range[1] + 1);

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
                            } //else
                            // throw ('Func unknown ' + calledFunc + " " + (calledFunc in this.funcDefs))
                        }

                        this.pushFuncParams.push(new PushFuncParams(varDeclStart != undefined ? varDeclStart : item.range[0],
                            varDeclEnd != undefined ? varDeclEnd : item.range[1], varToParamPairs));
                    }

                    if (item.arguments && item.arguments.length) {
                        // Don't add line markers in between function parameters
                        this.addNoMarklineZone(item.range[0], item.range[1]);
                    }

                    break;
                }
                case "UnaryExpression":
                    {
                        if (item.operator && item.operator == "delete") {
                            let varName = item.argument.object.name;

                            let [foundInScope, vardeclaration] = this.searchScopeAndParent(scopeName, varName);

                            if (vardeclaration.length > 0) {
                                this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1] + 1);
                            }
                        }

                        break;
                    }
                case "UpdateExpression":
                case "AssignmentExpression": {
                    let varName = '';

                    if (item.type == "AssignmentExpression") {
                        varName = (!item.left.object || !item.left.object.name) ? item.left.name : item.left.object.name;

                        if (!varName && item.left.object.object) { // handle matrix assignment
                            varName = item.left.object.object.name;
                        }
                    }
                    else
                        varName = item.argument.object.name;

                    let [foundInScope, vardeclaration] = this.searchScopeAndParent(scopeName, varName);

                    if (vardeclaration.length > 0) {
                        this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1] + 1);
                    }

                    if (item.right && item.right.type == "ObjectExpression") {
                        this.addNoMarklineZone(item.range[0], item.range[1]);
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
            let injectedCode = `;startScope('${scope.name}');`;
            addCodeInjection(scope.startOfDefinitionIndex, injectedCode);
        };

        // Variable setting
        for (const scope of Object.keys(this.varDeclarations)) {
            for (const index of Object.keys(this.varDeclarations[scope])) {
                let vardata = this.varDeclarations[scope][index];
                for (const endOfDefinitionIndex of vardata.endOfDefinitionIndexes) {
                    let injectedCode = "";
                    if (vardata.source === "")
                        injectedCode = `;setVar('${vardata.name}', ${vardata.name});`;
                    else
                        injectedCode = `;setVar('${vardata.name}', ${vardata.name}, '${vardata.source}');`;

                    addCodeInjection(endOfDefinitionIndex, injectedCode);
                };
            };
        };

        // Scope end setting
        for (const scope of this.scopes) {
            let injectedCode = `;endScope('${scope.name}');`;
            addCodeInjection(scope.endOfDefinitionIndex, injectedCode);
        };

        // Push function parameters
        for (const pushParams of this.pushFuncParams) {
            let injectedCode = `;pushParams(${JSON.stringify(pushParams.varToParams)});`;
            addCodeInjection(pushParams.startOfDefinitionIndex, injectedCode);

            injectedCode = `;popParams(${JSON.stringify(pushParams.varToParams)});`;
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

        let syntax = undefined;

        this.onCompilationError(false);
        this.onExceptionMessage(false);

        try {
            syntax = esprima.parseScript(this.code, { range: true });
            console.log(syntax);
        } catch (error) {
            this.onCompilationError(true, "line " + error.lineNumber + ": " + error.description);
            return false;
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
        let skippedLineMarkers = ['{', '}'];

        let codeLineByLine = this.code.split('\n');
        this.code = "";
        for (let [lineIndex, line] of codeLineByLine.entries()) {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0 || trimmedLine.indexOf('//') == 0 ||
                (trimmedLine.length == 1 && (skippedLineMarkers.indexOf(trimmedLine) != -1))) {
                this.emptyCodeLineNumbers.push(lineIndex + 1);
            }

            if ((trimmedLine.startsWith('/*') && trimmedLine.indexOf('*/') == -1) || (trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/'))) {
                this.emptyCodeLineNumbers.push(lineIndex + 1);
            }

            line = line + '\n';

            if (!this.isEmptyLine(lineIndex + 1)) {
                let codeLineMarker = `;markcl(${lineIndex + 1});`;
                line = replaceTokens("<FCNRET>", codeLineMarker, line);

                let codeLineMarker2 = `forcemarkcl(${lineIndex + 1});`;
                line = replaceTokens("<FORCEMARKLINE>", codeLineMarker2, line);

                let indxOfCommentEnding = line.indexOf('*/'); // Don't put line marker in comment section
                if (indxOfCommentEnding != -1 && indxOfCommentEnding < line.length - 3) {
                    line = insertInLine(codeLineMarker, indxOfCommentEnding + 2, line);
                }
                else
                    if (line.indexOf("case") == -1) {
                        line = insertInLine(codeLineMarker, line.trim()[0] == '{' ? line.indexOf('{') + 1 : 0, line);
                    }

            }

            this.code += line;
        }

        return true;
    }
}