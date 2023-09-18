import { NodeAccessType, NodeBase, ObservableGraph, ParentSide } from "./av-types-interfaces";
import { UserInteractionType } from "./code-executor";
import { ObservableJSVariable } from "./observable-type";

export interface VariableScopingNotification {
    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable): void;
    onExitScopeVariable(scopeName: string, observable?: ObservableJSVariable): void;
}

export interface MessageNotification {
    onTraceMessage(message: string): void;
    onCompilationError(status: boolean, message?: string): void;
    onExceptionMessage(status: boolean, message: string): void;
    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string): void;
}

export interface ExecutionStatus {
    onLineExecuted(lineNo: number): void;
    onExecutionFinished(): void;
}

interface GraphNotification {
    onAccessNode(observable: ObservableGraph, node: NodeBase, accessType: NodeAccessType): void;
    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void;
    onAddNode(observable: ObservableGraph, node: NodeBase, parentValue: NodeBase, side: ParentSide): void;
    onRemoveNode(observable: ObservableGraph, node: NodeBase): void;
    onRemoveEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase): void;
}

interface MarkerNotification {
    forcemarkcl(lineNumber: number): void;
    markcl(lineNumber: number): void;

    startScope(scopeName: string): void;
    endScope(scopeName: string): void;

    pushParams(params: [string, string][]): void;
    popParams(params: [string, string][]): void;

    setVar(varname: string, object: any, varsource: string): void;
}

export type NotificationTypes = VariableScopingNotification | MessageNotification | GraphNotification | MarkerNotification | ExecutionStatus;

export class NotificationEmitter implements VariableScopingNotification, MessageNotification, ExecutionStatus, MarkerNotification {
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
            if ('onTraceMessage' in notifier || 'onExceptionMessage' in notifier || "onCompilationError" in notifier || "onUserInteractionRequest" in notifier)
                notifiers.push(notifier as MessageNotification);
        }

        return notifiers;
    }

    private executionStatusNotifications(): ExecutionStatus[] {
        let notifiers: ExecutionStatus[] = [];

        for (const notifier of this.notificationObservers) {
            if ('onLineExecuted' in notifier || "onExecutionFinished" in notifier)
                notifiers.push(notifier as ExecutionStatus);
        }

        return notifiers;
    }

    private graphNotifications(): GraphNotification[] {
        let notifiers: GraphNotification[] = [];

        for (const notifier of this.notificationObservers) {
            if ("onAccessNode" in notifier || "onAddEdge" in notifier || "onAddNode" in notifier || "onRemoveNode" in notifier || "onRemoveEdge" in notifier) {
                notifiers.push(notifier as GraphNotification);
            }
        }

        return notifiers;
    }

    private markerNotifications(): MarkerNotification[] {
        let notifiers: MarkerNotification[] = [];

        for (const notifier of this.notificationObservers) {
            if ("forcemarkcl" in notifier || "markcl" in notifier || "startScope" in notifier || "endScope" in notifier ||
                "pushParams" in notifier || "popParams" in notifier || "setVar" in notifier) {
                notifiers.push(notifier as MarkerNotification);
            }
        }

        return notifiers;
    }

    onEnterScopeVariable(scopeName: string, observable: ObservableJSVariable) {
        for (const notifier of this.variableScopingNotifications()) {
            notifier.onEnterScopeVariable(scopeName, observable);
        }
    }
    onExitScopeVariable(scopeName: string, observable?: ObservableJSVariable) {
        for (const notifier of this.variableScopingNotifications()) {
            notifier.onExitScopeVariable(scopeName, observable);
        };
    }

    onTraceMessage(message: string): void {
        for (const notifier of this.traceMessageNotifications()) {
            notifier.onTraceMessage(message);
        };
    }

    onExceptionMessage(status: boolean, message?: string) {
        for (const notifier of this.traceMessageNotifications()) {
            notifier.onExceptionMessage(status, message);
        };
    }

    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string) {
        for (const notifier of this.traceMessageNotifications()) {
            notifier.onUserInteractionRequest(userInteraction, title, defValue);
        };
    }

    onCompilationError(status: boolean, message?: string) {
        for (const notifier of this.traceMessageNotifications()) {
            notifier.onCompilationError(status, message);
        };
    }

    onLineExecuted(lineNo: number) {
        for (const notifier of this.executionStatusNotifications()) {
            notifier.onLineExecuted(lineNo);
        }
    }

    onExecutionFinished() {
        for (const notifier of this.executionStatusNotifications()) {
            notifier.onExecutionFinished();
        }
    }

    // GraphNotifications
    onAccessNode(observable: ObservableGraph, node: NodeBase, accessType: NodeAccessType) {
        for (const notifier of this.graphNotifications()) {
            notifier.onAccessNode(observable, node, accessType);
        }
    }

    onAddEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase) {
        for (const notifier of this.graphNotifications()) {
            notifier.onAddEdge(observable, source, destination);
        }
    }

    onAddNode(observable: ObservableGraph, vertex: NodeBase, parentValue: NodeBase, side: ParentSide) {
        for (const notifier of this.graphNotifications()) {
            notifier.onAddNode(observable, vertex, parentValue, side);
        }
    }

    onRemoveNode(observable: ObservableGraph, vertex: NodeBase) {
        for (const notifier of this.graphNotifications()) {
            notifier.onRemoveNode(observable, vertex);
        }
    }

    onRemoveEdge(observable: ObservableGraph, source: NodeBase, destination: NodeBase) {
        for (const notifier of this.graphNotifications()) {
            notifier.onRemoveEdge(observable, source, destination);
        }
    }

    // Marker operations
    forcemarkcl(lineNumber: number) {
        for (const notifier of this.markerNotifications()) {
            notifier.forcemarkcl(lineNumber);
        }
    }

    markcl(lineNumber: number) {
        for (const notifier of this.markerNotifications()) {
            notifier.markcl(lineNumber);
        }
    }

    startScope(scopeName: string) {
        for (const notifier of this.markerNotifications()) {
            notifier.startScope(scopeName);
        }
    }

    endScope(scopeName: string) {
        for (const notifier of this.markerNotifications()) {
            notifier.endScope(scopeName);
        }
    }

    pushParams(params: [string, string][]) {
        for (const notifier of this.markerNotifications()) {
            notifier.pushParams(params);
        }
    }

    popParams(params: [string, string][]) {
        for (const notifier of this.markerNotifications()) {
            notifier.popParams(params);
        }
    }

    setVar(varname: string, object: any, varsource: string) {
        for (const notifier of this.markerNotifications()) {
            notifier.setVar(varname, object, varsource);
        }
    }
}