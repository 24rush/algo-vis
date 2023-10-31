import { NodeAccessType, NodeBase, ObservableGraph, ChildSide } from "./../types/graph-base";
import { UserInteractionType } from "./../execution/code-executor";
import { ObservableJSVariable } from "./../types/observable-type";

export class VariableScopingNotification {
    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable) { };
    onExitScopeVariable(scopeName: string, observable?: ObservableJSVariable) { };
}

export class MessageNotification {
    onTraceMessage(message: string) { };
    onCompilationError(status: boolean, message?: string) { };
    onExceptionMessage(status: boolean, message: string) { };
    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string) { };
}

export class ExecutionStatus {
    markcl(lineNo: number) { };
    onExecutionFinished() { };
}

export class GraphNotification {
    onAccessNode(observable: ObservableGraph, node: NodeBase, accessType: NodeAccessType) { };
    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase) { };
    onAddNode(observable: ObservableGraph, node: NodeBase, parentValue: NodeBase, side: ChildSide) { };
    onRemoveNode(observable: ObservableGraph, node: NodeBase) { };
    onRemoveEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase) { };
}

export class MarkerNotification {
    forcemarkcl(lineNumber: number) { }
    markcl(lineNumber: number) { }

    startScope(scopeName: string) { };
    endScope(scopeName: string) { };

    pushParams(params: [string, string][]) { };
    popParams(params: [string, string][]) { };

    setVar(varname: string, object: any, varsource: string) { };
}

export type NotificationTypes = VariableScopingNotification | MessageNotification | GraphNotification | MarkerNotification | ExecutionStatus;

export class NotificationBus implements VariableScopingNotification, GraphNotification, MessageNotification, ExecutionStatus, MarkerNotification {
    private notificationObservers: NotificationTypes[] = [];

    public registerNotificationObserver(notifier: NotificationTypes) {
        this.notificationObservers.push(notifier);
    }

    // VariableScopingNotification
    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable) {
        for (const notifier of this.notificationObservers) {
            if ('onEnterScopeVariable' in notifier)
                notifier.onEnterScopeVariable(scopeName, observable);
        }
    }
    onExitScopeVariable(scopeName: string, observable?: ObservableJSVariable) {
        for (const notifier of this.notificationObservers) {
            if ('onExitScopeVariable' in notifier)
                notifier['onExitScopeVariable'](scopeName, observable);
        };
    }

    // MessageNotification
    onTraceMessage(message: string): void {
        for (const notifier of this.notificationObservers) {
            if ('onTraceMessage' in notifier)

                notifier.onTraceMessage(message);
        };
    }

    onExceptionMessage(status: boolean, message?: string) {
        for (const notifier of this.notificationObservers) {
            if ('onTraceMessage' in notifier)

                notifier.onExceptionMessage(status, message);
        };
    }

    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string) {
        for (const notifier of this.notificationObservers) {
            if ('onTraceMessage' in notifier)

                notifier.onUserInteractionRequest(userInteraction, title, defValue);
        };
    }

    onCompilationError(status: boolean, message?: string) {
        for (const notifier of this.notificationObservers) {
            if ('onTraceMessage' in notifier)

                notifier.onCompilationError(status, message);
        };
    }

    // ExecutionStatus
    onExecutionFinished() {
        for (const notifier of this.notificationObservers) {
            if ('onExecutionFinished' in notifier)
                notifier.onExecutionFinished();
        }
    }

    // GraphNotifications
    onAccessNode(observable: ObservableGraph, node: NodeBase, accessType: NodeAccessType) {
        for (const notifier of this.notificationObservers) {
            if ('onAccessNode' in notifier)
                notifier.onAccessNode(observable, node, accessType);
        }
    }

    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase) {
        for (const notifier of this.notificationObservers) {
            if ('onAddEdge' in notifier)
                notifier.onAddEdge(observable, source, destination);
        }
    }

    onAddNode(observable: ObservableGraph, vertex: NodeBase, parentValue: NodeBase, side: ChildSide) {
        for (const notifier of this.notificationObservers) {
            if ('onAddNode' in notifier)
                notifier.onAddNode(observable, vertex, parentValue, side);
        }
    }

    onRemoveNode(observable: ObservableGraph, vertex: NodeBase) {
        for (const notifier of this.notificationObservers) {
            if ('onRemoveNode' in notifier)
                notifier.onRemoveNode(observable, vertex);
        }
    }

    onRemoveEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase) {
        for (const notifier of this.notificationObservers) {
            if ('onRemoveEdge' in notifier)
                notifier.onRemoveEdge(observable, source, destination);
        }
    }

    // Marker operations
    forcemarkcl(lineNumber: number) {
        for (const notifier of this.notificationObservers) {
            if ('forcemarkcl' in notifier)
                notifier.forcemarkcl(lineNumber);
        }
    }

    markcl(lineNumber: number) {
        for (const notifier of this.notificationObservers) {
            if ('markcl' in notifier)
                notifier.markcl(lineNumber);
        }
    }

    startScope(scopeName: string) {
        for (const notifier of this.notificationObservers) {
            if ('startScope' in notifier)
                notifier.startScope(scopeName);
        }
    }

    endScope(scopeName: string) {
        for (const notifier of this.notificationObservers) {
            if ('endScope' in notifier)
                notifier.endScope(scopeName);
        }
    }

    pushParams(params: [string, string][]) {
        for (const notifier of this.notificationObservers) {
            if ('pushParams' in notifier)
                notifier.pushParams(params);
        }
    }

    popParams(params: [string, string][]) {
        for (const notifier of this.notificationObservers) {
            if ('popParams' in notifier)
                notifier.popParams(params);
        }
    }

    setVar(varname: string, object: any, varsource: string) {
        for (const notifier of this.notificationObservers) {
            if ('setVar' in notifier)
                notifier.setVar(varname, object, varsource);
        }
    }
}