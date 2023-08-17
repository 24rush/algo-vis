import { ObservableJSVariable, JSVariableChangeCbk } from "./observable-type";
import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./av-types";
import { NodeBase, GraphVariableChangeCbk, ObservableGraph, ParentSide, GraphNodePayloadType, GraphType } from './av-types-interfaces'
import { CodeExecutorProxy } from "./code-executor-proxy";
import { UserInteractionType } from "./code-executor";
import { RuntimeScopeMonitor } from "./runtime-scope-monitor";
import { CodeProcessor, VarType } from "./code-processor";
import { ExecutionStatus, MessageNotification, NotificationEmitter, VariableScopingNotification } from "./notification-emitter";

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

enum OperationRecorderStatus {
    Idle,
    Executing,
    ReplayEnded,
    Waiting
}

export class OperationRecorder implements MessageNotification, JSVariableChangeCbk, GraphVariableChangeCbk {
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
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);

        GraphObjectOperationPayload.execute(OperationType.GRAPH_ACCESS_NODE, runtimeObservable, node.value);
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

    // Runtime data
    private rsMonitor = new RuntimeScopeMonitor();
    private observedVariables: ObservableJSVariable[] = [];
    private runtimeObservables: Map<string, any> = new Map();
    private refs: Record<string, string> = {}; // [funcName.paramName] = [scopeName.varName]    

    private status: OperationRecorderStatus = OperationRecorderStatus.Idle;

    private notificationEmitter: NotificationEmitter = new NotificationEmitter();
    private codeExecProxy: CodeExecutorProxy = new CodeExecutorProxy();
    private codeProcessor: CodeProcessor = new CodeProcessor();

    constructor(private injectMarkers: boolean = true) {
        this.codeExecProxy.registerNotificationObserver(this);
    }

    isNotStarted() : boolean { return this.status == OperationRecorderStatus.Idle;}
    isReplayFinished(): boolean { return this.status == OperationRecorderStatus.ReplayEnded; }

    isWaiting(): boolean { return this.status == OperationRecorderStatus.Waiting; }
    setWaiting(status: boolean) {
        this.status = status ? OperationRecorderStatus.Waiting : OperationRecorderStatus.Executing;
    }

    setSourceCode(code: string): boolean {
        this.resetExecutionState();

        this.notificationEmitter.onCompilationError(false);
        this.notificationEmitter.onExceptionMessage(false);

        let [success, errMsg] = this.codeProcessor.setCode(code, this.injectMarkers);

        if (!success) {
            this.notificationEmitter.onCompilationError(success, errMsg);
        }

        return success;
    }

    registerVariableObservers(observables: ObservableJSVariable[]) {
        for (let observable of observables)
            this.registerObservedVariable(observable);
    }

    registerObservedVariable(observable: ObservableJSVariable) {
        if (this.observedVariables.indexOf(observable) != -1)
            return;

        this.observedVariables.push(observable);
    }

    registerNotificationObserver(notifier: MessageNotification | VariableScopingNotification | ExecutionStatus) {
        this.notificationEmitter.registerNotificationObserver(notifier);
    }

    // NotificationEmitter handlers
    onTraceMessage(message: string): void {
        this.notificationEmitter.onTraceMessage(message);
    }
    onExceptionMessage(status: boolean, message: string): void {
        this.notificationEmitter.onExceptionMessage(status, message);
    }
    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string): void {
        this.notificationEmitter.onUserInteractionRequest(userInteraction, title, defValue);
    }
    onCompilationError(status: boolean, message?: string) {
        this.notificationEmitter.onCompilationError(status, message);
    }
    forcemarkcl(lineNumber: number) {
        this.notificationEmitter.onLineExecuted(lineNumber);
    }
    markcl(lineNumber: number) {
        this.notificationEmitter.onLineExecuted(lineNumber);
    }

    onExecutionFinished(): void {
        this.status = OperationRecorderStatus.ReplayEnded;
        this.notificationEmitter.onExecutionFinished();
    }

    startScope(scopeName: string) {
        this.rsMonitor.scopeStart(RuntimeScopeMonitor.scopeNameToFunctionScope(scopeName));
        this.executeRuntimeObservableVarLifetime(OperationType.SCOPE_START, this.findRuntimeObservableFromName(undefined, VarType.var));
    }

    endScope(scopeName: string) {
        let fcnEndScope = (scopeName: string) => {
            this.executeRuntimeObservableVarLifetime(OperationType.SCOPE_END, this.findRuntimeObservableFromName(undefined));
            this.rsMonitor.scopeEnd(RuntimeScopeMonitor.scopeNameToFunctionScope(scopeName));
        }

        if (scopeName) {
            fcnEndScope(scopeName);
            return;
        }

        // if scopeName is undefined then it's called from before a return statement
        // which means we need to end the current function scope
        let idxLastFunction = this.rsMonitor.getCurrentScope().lastIndexOf('!');

        if (idxLastFunction != -1) {
            scopeName = this.rsMonitor.getCurrentScope().substring(idxLastFunction);

            for (let scopesUnderFunction of scopeName.split('.').reverse()) {
                if (scopesUnderFunction.startsWith('!'))
                    continue;

                fcnEndScope(scopesUnderFunction);
            }
        }
    }

    pushParams(params: [string, string][]) {
        for (let varToParamPair of params) {
            let attachedVar0 = this.rsMonitor.attachVarToScope(varToParamPair[0], this.rsMonitor.getCurrentScope());
            let attachedVar1 = this.rsMonitor.attachVarToScope(varToParamPair[1], this.rsMonitor.getCurrentScope());

            this.refs[attachedVar0] = attachedVar1;
        }
    }

    popParams(params: [string, string][]) {
        for (let varToParamPair of params) {
            let attachedVar0 = this.rsMonitor.attachVarToScope(varToParamPair[0], this.rsMonitor.getCurrentScope());
            delete this.refs[attachedVar0];
        }
    }

    setVar(varName: string, varValue: any, varSource: string) {
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

    startReplay() {
        this.resetExecutionState();
        this.executeSourceCode();
    }

    advanceOneCodeLine(): void {
        this.codeExecProxy.advanceOneCodeLine();
    }

    onUserInteractionResponse(interactionType: UserInteractionType, value?: string | boolean): void {
        this.codeExecProxy.userInteractionResponse(interactionType, value);
    }

    /*
        PRIVATES
    */

    private resetExecutionState() {
        this.runtimeObservables = new Map();
        this.refs = {};

        for (let primitiveObservers of this.observedVariables) {
            primitiveObservers.empty();
            primitiveObservers.unregisterObserver(this);
        }

        this.rsMonitor.reset();
    }

    private async executeSourceCode(): Promise<boolean> {
        if (this.status == OperationRecorderStatus.Executing)
            this.codeExecProxy.stopExecution();

        this.status = OperationRecorderStatus.Executing;

        this.codeProcessor.dumpDebugInfo();

        this.notificationEmitter.onCompilationError(false);
        this.notificationEmitter.onExceptionMessage(false);

        try {
            await this.codeExecProxy.init();
            await this.codeExecProxy.setSourceCode(this.codeProcessor.getCode());
            await this.codeExecProxy.execute();

        } catch (e) {
            this.status = OperationRecorderStatus.Idle;            

            console.log(e);

            let message = (typeof e == 'object' && 'message' in e) ? e.message : e;            
            this.notificationEmitter.onExceptionMessage(true, message);
            this.notificationEmitter.onExecutionFinished();

            return false;
        }

        return true;
    }

    private findRuntimeObservableFromName(varName: string, varType: VarType = VarType.let): any[] {
        let currentRuntimeScope = this.rsMonitor.getCurrentScope();
        let isVarVariable = false;

        // Find the variable declaration matching varName:
        //  - search local scope for let variables up until we reach a function border
        //  - search global scope for var variables
        let varDecls: [string, string][] = this.codeProcessor.getVarDeclsTillFuncBorder(
            currentRuntimeScope, varType, varName).map(v => [v.name, v.declarationScopeName]);

        if (!varDecls.length) {
            varDecls = this.codeProcessor.searchVarInAllScopes(varName).map(v => [v.name, v.declarationScopeName]);
            isVarVariable = varDecls.length > 0;
        } else {
            if (varDecls[0][1] == 'global')
                isVarVariable = true;
        }

        let runtimeObservables: any[] = [];

        if (!varDecls.length) return runtimeObservables;

        for (let varDecl of varDecls) {
            for (let [observableScope, observable] of this.runtimeObservables) {
                if (isVarVariable) {
                    if (observable.name == varName) {
                        runtimeObservables.push(observable);
                    }
                } else {
                    let varScope = this.rsMonitor.attachVarToScope(varDecl[0], varDecl[1]);
                    if (varScope.indexOf('!') == -1 && observableScope.endsWith(varScope) && currentRuntimeScope.endsWith(varDecl[1])) {
                        if (varName != undefined) {
                            if (observable.name == varName)
                                runtimeObservables.push(observable);
                        } else {
                            runtimeObservables.push(observable);
                        }
                    }
                }
            }
        }

        return runtimeObservables;
    }

    private executeRuntimeObservableVarLifetime(operationType: OperationType, runtimeObservables: any[]) {
        let currentRuntimeScope = this.rsMonitor.getCurrentScope();

        if ((!runtimeObservables || !runtimeObservables.length)) {
            if (operationType == OperationType.SCOPE_END)
                this.notificationEmitter.onExitScopeVariable(currentRuntimeScope);

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
                    this.notificationEmitter.onExitScopeVariable(currentRuntimeScope, runtimeObservable);
                    break;
                default:
                    this.notificationEmitter.onEnterScopeVariable(currentRuntimeScope, runtimeObservable)
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
}