import { ObservableJSVariable, JSVariableChangeCbk } from "./observable-type";
import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./av-types";
import { NodeBase, GraphVariableChangeCbk, ObservableGraph, ParentSide, GraphNodePayloadType, GraphType } from './av-types-interfaces'
import { CodeExecutorEvents, CodeExecutorProxy } from "./code-executor-proxy";
import { UserInteractionType } from "./code-executor";
import { RuntimeScopeMonitor } from "./runtime-scope-monitor";

var esprima = require('esprima')

enum OperationType {
    MARK_LINE,
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

    GRAPH_ACCESS_NODE
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

    constructor(public declarationScopeName: string, public name: string, public vartype: VarType, public endOfDefinitionIndex: number) {
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
    static execute(operationType: OperationType, observable: any, oldValue: any, newValue: any) {
        switch (operationType) {
            case OperationType.READ:
                observable.getValue(oldValue);
                break;
            case OperationType.WRITE:
                observable.setValue(newValue);
                break;
            case OperationType.WRITE_REF:
                observable.setReference(newValue);
                break;
            default:
                throw 'Cannot process operation type: ' + operationType;
        }
    }
}

class RWIndexedObjectOperationPayload {
    static execute(operationType: OperationType, observable: any, oldValue: any, newValue: any, property: any): void {
        switch (operationType) {
            case OperationType.WRITE_AT:
                observable.setValueAtIndex(newValue, property);
                break;
            case OperationType.READ_AT:
                observable.getAtIndex(property);
                break;
            default:
                throw 'Cannot process operation type: ' + operationType;
        }
    }
}

class GraphObjectOperationPayload {
    static execute(operationType: OperationType, observableGraph: ObservableGraph, source: GraphNodePayloadType, destinationOrParent?: GraphNodePayloadType, side?: ParentSide) {    
        switch (operationType) {
            case OperationType.GRAPH_ADD_EDGE:
                (observableGraph as Graph).addEdge(source, destinationOrParent);
                break;
            case OperationType.GRAPH_ADD_VERTEX:
                (observableGraph as Graph).addVertex(source);
                break;
            case OperationType.GRAPH_REMOVE_EDGE:
                (observableGraph as Graph).removeEdge(source, destinationOrParent);
                break;
            case OperationType.GRAPH_REMOVE_VERTEX:
                (observableGraph as Graph).removeVertex(source);
                break;
            case OperationType.BINARY_TREE_ADD_NODE:
                if (observableGraph instanceof BinarySearchTree)
                    (observableGraph as BinarySearchTree).add(source);
                else
                    (observableGraph as BinaryTree).add(source, destinationOrParent, side);
                break;
            case OperationType.BINARY_TREE_REMOVE_NODE:
                (observableGraph as BinaryTree).remove(source);
                break;
            case OperationType.BINARY_TREE_ADD_EDGE:
            case OperationType.BINARY_TREE_REMOVE_EDGE:
                // Nothing to do
                break;
            case OperationType.GRAPH_ACCESS_NODE:
                observableGraph.accessValue(source);
                break;
            default:
                throw 'Cannot process operation type: ' + operationType;
        }
    }
}

type OperationPayloads = RWPrimitiveOperationPayload | RWIndexedObjectOperationPayload | GraphObjectOperationPayload;

enum OperationRecorderStatus {
    Idle,
    Executing,
    ReplayEnded,
    Waiting
}

export interface VariableScopingNotification {
    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable): void;
    onExitScopeVariable(scopeName: string, observable?: ObservableJSVariable): void;
}

export interface MessageNotification {
    onTraceMessage(message: string): void;

    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string): void;
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
    onExitScopeVariable(scopeName: string, observable?: ObservableJSVariable): void {
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
        RWPrimitiveOperationPayload.execute(OperationType.WRITE, observable, JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(newValue)));
    }
    onSetReferenceEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        RWPrimitiveOperationPayload.execute(OperationType.WRITE_REF, observable, value, newValue);
    }
    onSetEvent(observable: ObservableJSVariable | ObservableGraph, value: any, newValue: any): void {
        RWPrimitiveOperationPayload.execute(OperationType.WRITE, observable, value, newValue);
    }
    onGetEvent(observable: ObservableJSVariable, value: any): void {
        RWPrimitiveOperationPayload.execute(OperationType.READ, observable, value, value);
    }
    onSetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, newValue: any, index: number): void {
        RWIndexedObjectOperationPayload.execute(OperationType.WRITE_AT, observable, value, newValue, index);
    }
    onGetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, index: number): void {
        RWIndexedObjectOperationPayload.execute(OperationType.READ_AT, observable, value, value, index);
    }
    onSetObjectValueEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        RWPrimitiveOperationPayload.execute(OperationType.WRITE, observable, value, newValue);
    }
    onSetObjectPropertyEvent(observable: ObservableJSVariable, value: any, newValue: any, key: string | number | symbol): void {
        RWIndexedObjectOperationPayload.execute(OperationType.WRITE_AT, observable, value, newValue, key);
    }
    onGetObjectPropertyEvent(observable: ObservableJSVariable, value: any, key: string | number | symbol): void {
        RWIndexedObjectOperationPayload.execute(OperationType.READ_AT, observable, value, value, key);
    }

    // Graph
    onAccessNode(observable: ObservableGraph, node: NodeBase): void {
        GraphObjectOperationPayload.execute(OperationType.GRAPH_ACCESS_NODE, observable, node.value);
    }
    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        GraphObjectOperationPayload.execute(isGraph ? OperationType.GRAPH_ADD_EDGE : OperationType.BINARY_TREE_ADD_EDGE, runtimeObservable, source.value, destination.value);
    }
    onAddNode(observable: ObservableGraph, vertex: NodeBase, parentValue: NodeBase, side: ParentSide): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        GraphObjectOperationPayload.execute(isGraph ? OperationType.GRAPH_ADD_VERTEX : OperationType.BINARY_TREE_ADD_NODE, runtimeObservable, vertex.value, parentValue ? parentValue.value : undefined, side);
    }
    onRemoveNode(observable: ObservableGraph, vertex: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        GraphObjectOperationPayload.execute(isGraph ? OperationType.GRAPH_REMOVE_VERTEX : OperationType.BINARY_TREE_REMOVE_NODE, runtimeObservable, vertex.value);
    }
    onRemoveEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        GraphObjectOperationPayload.execute(isGraph ? OperationType.GRAPH_REMOVE_EDGE : OperationType.BINARY_TREE_REMOVE_EDGE, runtimeObservable, source.value, destination.value);
    }

    constructor() {
        super();

        this.resetCodeParsingState();
    }

    // CODE Parsing
    protected code: string;

    private varDeclarations: Record<string, Record<string, VariableDeclaration>>; // [scopeName][varname] = VariableDeclaration
    private scopes: ScopeDeclaration[] = [];
    private refs: Record<string, string> = {}; // [funcName.paramName] = [scopeName.varName]
    private funcDefs: Record<string, string[]>; // [funcName] = [param...]
    private pushFuncParams: PushFuncParams[] = [];
    private emptyCodeLineNumbers: number[] = [];
    private fcnReturns: number[] = [];
    private markLineOverrides: number[] = [];
    private noMarkLineZone: IndexRange[] = [];

    // Runtime data
    protected rsMonitor = new RuntimeScopeMonitor();
    protected observedVariables: ObservableJSVariable[] = [];
    private runtimeObservables: Map<string, any> = new Map();

    protected codeExecProxy: CodeExecutorProxy = new CodeExecutorProxy(this);

    protected status: OperationRecorderStatus = OperationRecorderStatus.Idle;
    public isReplayFinished(): boolean { return this.status == OperationRecorderStatus.ReplayEnded; }

    private resetCodeParsingState() {
        this.emptyCodeLineNumbers = [];
        this.varDeclarations = {}; this.scopes = []; this.fcnReturns = [];
        this.refs = {}; this.funcDefs = {}; this.pushFuncParams = [];
        this.markLineOverrides = []; this.noMarkLineZone = [];
    }

    private resetExecutionState() {
        this.runtimeObservables = new Map();

        for (let primitiveObservers of this.observedVariables) {
            primitiveObservers.empty();
            primitiveObservers.unregisterObserver(this);
        }

        this.rsMonitor.reset();
    }

    public isWaiting(): boolean { return this.status == OperationRecorderStatus.Waiting; }
    public setWaiting(status: boolean) {
        this.status = status ? OperationRecorderStatus.Waiting : OperationRecorderStatus.Executing;
    }

    public setSourceCode(code: string): boolean {
        this.resetCodeParsingState();
        this.resetExecutionState();
        this.code = code;

        let parseResult = this.parseCode();
        return parseResult;
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

    public forceMarkLine(lineNumber: number) {
        this.onLineExecuted(lineNumber);
    }

    public markStartCodeLine(lineNumber: number) {
        this.onLineExecuted(lineNumber);
    }

    public userInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string) {
        this.onUserInteractionRequest(userInteraction, title, defValue);
    }

    public onUserInteractionResponse(interactionType: UserInteractionType, value?: string | boolean): void {
        this.codeExecProxy.userInteractionResponse(interactionType, value);
    }

    public onExecutionCompleted(): void {
        this.status = OperationRecorderStatus.ReplayEnded;
        this.onExecutionFinished();
    }

    public startScope(scopeName: string) {
        this.rsMonitor.scopeStart(this.scopeNameToFunctionScope(scopeName));
        this.executeRuntimeObservableVarLifetime(OperationType.SCOPE_START, this.findRuntimeObservableFromName(undefined));
    }

    public endScope(scopeName: string) {
        this.executeRuntimeObservableVarLifetime(OperationType.SCOPE_END, this.findRuntimeObservableFromName(undefined));
        this.rsMonitor.scopeEnd(this.scopeNameToFunctionScope(scopeName));
    }

    public pushParams(params: [string, string][]) {
        for (let varToParamPair of params) {
            let attachedVar0 = this.rsMonitor.attachVarToScope(varToParamPair[0], this.rsMonitor.getCurrentScope());
            let attachedVar1 = this.rsMonitor.attachVarToScope(varToParamPair[1], this.rsMonitor.getCurrentScope());

            this.refs[attachedVar0] = attachedVar1;
        }
    }

    public popParams(params: [string, string][]) {
        for (let varToParamPair of params) {
            let attachedVar0 = this.rsMonitor.attachVarToScope(varToParamPair[0], this.rsMonitor.getCurrentScope());
            delete this.refs[attachedVar0];
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

    private findRuntimeObservableFromName(varName: string): any[] {
        let currentRuntimeScope = this.rsMonitor.getCurrentScope();
        let isVarVariable = false;

        // Find the variable declaration matching varName:
        //  - search local scope for let variables up until we reach a function border
        //  - search global scope for var variables
        let varDecls: [string, string][] = this.getVarDeclsTillFuncBorder(
            currentRuntimeScope, VarType.let, varName).map(v => [v.name, v.declarationScopeName]);

        if (!varDecls.length) {
            varDecls = this.searchVarInAllScopes(varName).map(v => [v.name, v.declarationScopeName]);
            isVarVariable = varDecls.length > 0;
        } else {
            if (varDecls[0][1] == 'global')
                isVarVariable = true;
        }

        let runtimeObservables: any[] = [];

        if (!varDecls.length) return runtimeObservables;

        for (let [observableScope, observable] of this.runtimeObservables) {
            if (isVarVariable) {
                if (observable.name == varName) {
                    runtimeObservables.push(observable);
                }
            } else {
                let varScope = this.rsMonitor.attachVarToScope(varDecls[0][0], varDecls[0][1]);
                if (observable.name == varName && observableScope.endsWith(varScope)) {
                    runtimeObservables.push(observable);
                }
            }

        }

        return runtimeObservables;
    }

    private executeRuntimeObservableVarLifetime(operationType: OperationType, runtimeObservables: any[]) {
        let currentRuntimeScope = this.rsMonitor.getCurrentScope();

        if ((!runtimeObservables || !runtimeObservables.length)) {
            if (operationType == OperationType.SCOPE_END)
                this.onExitScopeVariable(currentRuntimeScope);

            return;
        }

        for (let runtimeObservable of runtimeObservables) {
            if (operationType == OperationType.SCOPE_START) {
                runtimeObservable.empty();
            }

            switch (operationType) {
                case OperationType.SCOPE_END:
                    // var variables enter in scope already and it also creates the templates for scopes
                    this.runtimeObservables.delete(this.rsMonitor.attachVarToScope(runtimeObservable.name, currentRuntimeScope));
                    this.onExitScopeVariable(currentRuntimeScope, runtimeObservable);
                    break;
                default:
                    this.onEnterScopeVariable(currentRuntimeScope, runtimeObservable)
                    //if (varTypeFilter == VarType.var) { // set var variables to undefined                        
                    //runtimeObservable.setValue(undefined);
                    //}
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

    private createRuntimeObservable(scopeName: string, varName: string, varValue: any): [boolean, any] {
        if (this.runtimeObservables.has(this.rsMonitor.attachVarToScope(varName, scopeName)))
            return [false, this.runtimeObservables.get(this.rsMonitor.attachVarToScope(varName, scopeName))];

        let existingRuntimeObservable = this.findRuntimeObservableFromName(varName);

        if (existingRuntimeObservable.length)
            return [false, existingRuntimeObservable[0]];

        let runtimeObservable: any;
        if (varValue && typeof varValue == 'object' && '__isGraphType__' in varValue) {
            switch (varValue.type) {
                case GraphType.DIRECTED:
                case GraphType.UNDIRECTED:
                    runtimeObservable = new Graph(varValue.type);
                    break;
                case GraphType.BT:
                    runtimeObservable = new BinaryTree(varValue.type);
                    break;
                case GraphType.BST:
                    runtimeObservable = new BinarySearchTree();
                    break;
            }

            varValue.name = varName;
            runtimeObservable.copyFrom(varValue);
        }
        else
            runtimeObservable = new ObservableJSVariable(varName, varValue);

        let varInCurrentScope = this.rsMonitor.attachVarToScope(varName, scopeName);

        this.runtimeObservables.set(varInCurrentScope, runtimeObservable);
        this.registerObservedVariable(runtimeObservable);

        return [true, runtimeObservable];
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

    public setVar(varName: string, varValue: any, varSource: string) {
        if (varValue instanceof NodeBase || varValue instanceof BinaryTreeNode)
            return;

        let runtimeScopeName = this.rsMonitor.getCurrentScope();

        if (this.isReferenceObject(varValue)) {
            let varRuntimeScope = this.rsMonitor.attachVarToScope(varName, runtimeScopeName);

            if (varSource) {
                runtimeScopeName = this.rsMonitor.getScopeExclLast();
                this.refs[varRuntimeScope] = this.rsMonitor.extendScopeNameWith(runtimeScopeName, varSource);
            }

            let dstScopedVar = this.getReferencedObject(varRuntimeScope);

            if (varRuntimeScope != dstScopedVar) {
                let [isNew, runtimeObservable] = this.createRuntimeObservable(this.rsMonitor.getCurrentScope(), varName, varValue);

                if (isNew) {
                    this.executeRuntimeObservableVarLifetime(OperationType.CREATE_REF, this.findRuntimeObservableFromName(varName));
                }

                runtimeObservable.setReference(dstScopedVar);

                // Overwrite with referenced variable
                let indexDot = dstScopedVar.lastIndexOf('.');
                varName = dstScopedVar.substring(indexDot + 1);
                runtimeScopeName = dstScopedVar.substring(0, indexDot);
            }
        }

        let [isNew, runtimeObservable] = this.createRuntimeObservable(runtimeScopeName, varName, varValue);

        if (isNew) {
            this.executeRuntimeObservableVarLifetime(OperationType.CREATE_VAR, [runtimeObservable]);
        }

        runtimeObservable.setValue(varValue);

    }
    
    private scopeNameToFunctionScope(scopeName: string): string {
        if (scopeName != "global" && scopeName != "local")
            return "!" + scopeName;

        return scopeName;
    }

    private searchVarInAllScopes(varName: string): VariableDeclaration[] {
        let foundVars: VariableDeclaration[] = [];

        for (let scopeName in this.varDeclarations) {
            let varsInScope = this.varDeclarations[scopeName];

            if (varsInScope == undefined || Object.keys(varsInScope).length == 0)
                continue;

            for (let variableName of Object.keys(varsInScope)) {
                let variable = this.varDeclarations[scopeName][variableName];

                if (variable.vartype == VarType.var && variable.name == varName)
                    foundVars.push(variable);
            }
        }

        return foundVars;
    }

    private getVarDeclsTillFuncBorder(scopeName: string, varType?: VarType, varName?: string): VariableDeclaration[] {
        // Search for a scope chain that ends at a function border
        let foundScopes = [];
        let scopeChain = scopeName.split('.').reverse();
        for (let scope of scopeChain) {
            if (scope.indexOf('!') != -1) {
                foundScopes.push(scope);
                break;
            }

            foundScopes.push(scope);
        }

        let foundVars: VariableDeclaration[] = [];
        foundScopes.reverse();

        while (foundScopes.length) {
            // Max scope chain from a function border to our variable
            // and then up the chain till it reaches the function
            scopeName = foundScopes.join('.');

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
                break;
            }

            foundScopes.pop();
        }

        return foundVars;
    }

    private searchScopeAndParent(startScope: string, varName: string): [string, VariableDeclaration[]] {
        let foundInScope = startScope;

        let vardeclaration = this.getVarDeclsTillFuncBorder(foundInScope, undefined, varName);
        if (vardeclaration.length == 0) {
            foundInScope = startScope.split(".local").join("");
            vardeclaration = this.getVarDeclsTillFuncBorder(foundInScope, undefined, varName);

            if (vardeclaration.length == 0) {
                foundInScope = 'global';
                vardeclaration = this.getVarDeclsTillFuncBorder(foundInScope, undefined, varName);
            }
        } else {
            foundInScope = vardeclaration[0].declarationScopeName;
        }

        return [foundInScope, vardeclaration];
    };

    private createVariable(scopeName: string, varName: string, varType: VarType, endOfDefinitionIndex: number): VariableDeclaration {
        let varDecl = new VariableDeclaration(scopeName, varName, varType, endOfDefinitionIndex);

        if (!(scopeName in this.varDeclarations))
            this.varDeclarations[scopeName] = {};

        if (varName in this.varDeclarations[scopeName]) {
            this.varDeclarations[scopeName][varName].endOfDefinitionIndexes.push(varDecl.endOfDefinitionIndex);
        } else {
            this.varDeclarations[scopeName][varName] = varDecl;
        }

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
                        //this.fcnReturns.push(item.body.range[0] + 1);
                        //this.markLineOverrides.push(item.range[0]);

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

                            let vardeclaration = this.getVarDeclsTillFuncBorder(scopeName, undefined, paramName);

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
                        this.addNoMarklineZone(item.range[0] + 1, item.range[1]);
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
                    else if (item.type == "UpdateExpression") // ++ operator
                    {
                        varName = item.argument.name;
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