import { NodeBase, GraphVariableChangeCbk, ObservableGraph, ChildSide, GraphNodePayloadType, GraphType, NodeAccessType } from './../types/graph-base'
import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./../types/graph";
import { ObservableJSVariable, JSVariableChangeCbk } from "./../types/observable-type";

import { CodeExecutorProxy } from "./code-executor-proxy";
import { UserInteractionType } from "./code-executor";
import { CodeProcessor, VarType, VariableDeclaration } from "./code-processor";
import { RuntimeScopeMonitor } from "./runtime-scope-monitor";
import { ExecutionStatus, MarkerNotification, MessageNotification, NotificationBus, VariableScopingNotification } from "./../types/notification-bus";

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
    static execute(operationType: OperationType, observableGraph: ObservableGraph, source: GraphNodePayloadType, destinationOrParent?: GraphNodePayloadType, side?: ChildSide, accessType?: NodeAccessType) {
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
                observableGraph.accessValue(source, accessType);
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

export class CodeDebugger extends MarkerNotification implements JSVariableChangeCbk, GraphVariableChangeCbk {
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
    onAccessNode(observable: ObservableGraph, node: NodeBase, accessType: NodeAccessType): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);

        GraphObjectOperationPayload.execute(OperationType.GRAPH_ACCESS_NODE, runtimeObservable, node.value, undefined, undefined, accessType);
    }
    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void {
        let runtimeObservable = this.getRuntimeObservableWithId(observable.id);
        let isGraph = runtimeObservable instanceof Graph;

        GraphObjectOperationPayload.execute(isGraph ? OperationType.GRAPH_ADD_EDGE : OperationType.BINARY_TREE_ADD_EDGE, runtimeObservable, source.value, destination.value);
    }
    onAddNode(observable: ObservableGraph, vertex: NodeBase, parentValue: NodeBase, side: ChildSide): void {
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
    private refs: Record<string, string> = {}; // [funcName.paramName] = [scopeName.varName]    

    private status: OperationRecorderStatus = OperationRecorderStatus.Idle;

    private notificationBus: NotificationBus = new NotificationBus();
    private codeExecProxy: CodeExecutorProxy = new CodeExecutorProxy(this.notificationBus);
    private codeProcessor: CodeProcessor = new CodeProcessor();

    constructor(private injectMarkers: boolean = true) {
        super();
        
        this.notificationBus.registerNotificationObserver(this);
    }

    isNotStarted(): boolean { return this.status == OperationRecorderStatus.Idle; }
    isReplayFinished(): boolean { return this.status == OperationRecorderStatus.ReplayEnded; }

    isWaiting(): boolean { return this.status == OperationRecorderStatus.Waiting; }
    setWaiting(status: boolean) {
        this.status = status ? OperationRecorderStatus.Waiting : OperationRecorderStatus.Executing;
    }

    setSourceCode(code: string): boolean {
        this.resetExecutionState();

        this.notificationBus.onCompilationError(false);
        this.notificationBus.onExceptionMessage(false);

        let [success, errMsg] = this.codeProcessor.setCode(code, this.injectMarkers);

        if (!success) {
            this.notificationBus.onCompilationError(success, errMsg);
        }

        return success;
    }

    registerNotificationObserver(notifier: MessageNotification | VariableScopingNotification | ExecutionStatus) {
        this.notificationBus.registerNotificationObserver(notifier);
    }

    // NotificationEmitter handlers
    forcemarkcl(lineNumber: number) {
        this.notificationBus.markcl(lineNumber);
    }

    onExecutionFinished(): void {
        this.status = OperationRecorderStatus.ReplayEnded;
    }

    startScope(scopeName: string) {
        this.rsMonitor.scopeStart(RuntimeScopeMonitor.scopeNameToFunctionScope(scopeName));
        this.executeRuntimeObservableVarLifetime(OperationType.SCOPE_START, this.findRuntimeObservableFromName(undefined, VarType.var));
    }

    endScope(scopeName: string) {
        let executeEndScope = (scopeName: string) => {
            this.executeRuntimeObservableVarLifetime(OperationType.SCOPE_END, this.findRuntimeObservableFromName(undefined));
            this.rsMonitor.scopeEnd(RuntimeScopeMonitor.scopeNameToFunctionScope(scopeName));
        }

        if (scopeName) {
            executeEndScope(scopeName);
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

                executeEndScope(scopesUnderFunction);
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
        if (varValue instanceof NodeBase || varValue instanceof BinaryTreeNode || varValue instanceof BinaryTree)
            return;

        let runtimeScopeName = this.rsMonitor.getCurrentScope();

        if (this.isReferenceObject(varValue) && !("__isGraphType__" in varValue)) {
            let varRuntimeScope = this.rsMonitor.attachVarToScope(varName, runtimeScopeName);

            if (varSource) {
                this.refs[varRuntimeScope] = this.rsMonitor.getParentScope() + "." + varSource;
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
        this.refs = {};
        this.rsMonitor.reset();
    }

    private async executeSourceCode(): Promise<boolean> {
        if (this.status == OperationRecorderStatus.Executing)
            this.codeExecProxy.stopExecution();

        this.status = OperationRecorderStatus.Executing;

        this.codeProcessor.dumpDebugInfo();

        this.notificationBus.onCompilationError(false);
        this.notificationBus.onExceptionMessage(false);

        try {
            this.codeExecProxy.init();
            this.codeExecProxy.setSourceCode(this.codeProcessor.getCode());
            this.codeExecProxy.execute();

        } catch (e) {
            this.status = OperationRecorderStatus.Idle;

            console.log(e);

            let message = (typeof e == 'object' && 'message' in e) ? e.message : e;
            this.notificationBus.onExceptionMessage(true, message);
            this.notificationBus.onExecutionFinished();

            return false;
        }

        return true;
    }

    private findRuntimeObservableFromName(varName: string, varType: VarType = VarType.let): any[] {
        /* var variable support currently disabled

        let varDecls = this.codeProcessor.getVarDeclsTillFuncBorder(
            this.rsMonitor.getCurrentScope(), varType, varName);

        let isVarVariable = false;

        if (!varDecls.length) {
            isVarVariable = this.codeProcessor.searchVarInAllScopes(varName).length > 0;
        } else {
            if (varDecls[0].declarationScopeName == 'global')
                isVarVariable = true;
        }*/

        let runtimeObservables: any[] = [];

        this.rsMonitor.getScopesReversed().forEach(scopeObservables => {
            let runtimeObservable = scopeObservables.observables.find(so => so.name == varName);
            if (runtimeObservable) {
                runtimeObservables.push(runtimeObservable);
            }
        });

        return runtimeObservables;
    }

    private executeRuntimeObservableVarLifetime(operationType: OperationType, runtimeObservables: any[]) {
        let notifyScopeUpdate = (scopeOperationType: OperationType, runtimeObservable: any) => {
            if (scopeOperationType == OperationType.SCOPE_END)
                this.notificationBus.onExitScopeVariable(this.rsMonitor.getCurrentScope(), runtimeObservable);
            else
                this.notificationBus.onEnterScopeVariable(this.rsMonitor.getCurrentScope(), runtimeObservable)
        }

        if ((!runtimeObservables || !runtimeObservables.length)) {
            notifyScopeUpdate(operationType, undefined);
            return;
        }

        for (let runtimeObservable of runtimeObservables) {
            if (operationType == OperationType.SCOPE_START) {
                runtimeObservable.empty();
            }

            notifyScopeUpdate(operationType, runtimeObservable);
        }
    }

    private getRuntimeObservableWithId(id: number): any {
        for (let scopeObservables of this.rsMonitor.getScopesReversed()) {
            let runtimeObservable = scopeObservables.observables.find(so => so.id == id);
            if (runtimeObservable)
                return runtimeObservable;
        }
    }

    private createRuntimeObservable(currentRuntimeScope: string, varName: string, varValue: any): [boolean, any] {
        let findVariableDeclaration = (varDecls: VariableDeclaration[]): VariableDeclaration => {
            return varDecls ? varDecls.find(vd => vd.name == varName) : undefined;
        }

        let [runtimeScopeName, existingRuntimeObservable] = this.rsMonitor.findRuntimeObservableWithName(varName);

        let varDecls: VariableDeclaration[] = this.codeProcessor.getVarDeclsTillFuncBorder(currentRuntimeScope, VarType.let, varName);
        let varDecl = findVariableDeclaration(varDecls);

        if (existingRuntimeObservable) {
            let isNew = varDecl && varDecl.declarationScopeName.length > runtimeScopeName.length;
            if (!isNew)
                return [false, existingRuntimeObservable];
        }

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
        else {
            runtimeObservable = new ObservableJSVariable(varName, varValue, varDecl && varDecl.isBinary);
        }

        this.rsMonitor.storeRuntimeObservableInScope(runtimeObservable);

        return [true, runtimeObservable];
    }

    private isReferenceObject(object: any): boolean {
        let variableType = Object.prototype.toString.call(object);
        return (variableType == "[object Array]" || variableType == "[object Object]");
    }

    private getReferencedObject(scopeVarName: string): string {
        let matched = false;

        while (scopeVarName in this.refs) {
            scopeVarName = this.refs[scopeVarName];
            matched = true;
        }

        if (matched)
            return scopeVarName;

        // If we did not match then try to remove local scopes and try again
        let posLastLocal = scopeVarName.lastIndexOf('local.');
        if (posLastLocal != -1) {
            let newScopeName = scopeVarName.substring(0, posLastLocal) + scopeVarName.substring(posLastLocal + 6);
            return this.getReferencedObject(newScopeName);
        }

        return scopeVarName;
    }
}