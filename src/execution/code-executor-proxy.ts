import { NodeAccessType } from "./../types/graph-base";
import { CodeExecutorCommands, CodeExecutorMessages, CodeExecutorSlots, UserInteractionType } from "./code-executor";
import { NotificationBus, NotificationTypes } from "./../types/notification-bus";

export interface UserInteractionEvents {
    funcWrap(func: any): any;
    promptWrap(title?: string, defValue?: string): string;
    alertWrap(title?: string): void;
    confirmWrap(title?: string): boolean;
}

export interface MarkerFunctionEvents {
    forcemarkcl(lineNumber: number): void;
    markcl(lineNumber: number): void;

    startScope(scopeName: string): void;
    endScope(scopeName: string): void;

    pushParams(params: [string, string][]): void;
    popParams(params: [string, string][]): void;

    setVar(varname: string, object: any, varsource: string): void;
}

export interface CodeExecutorEvents extends MarkerFunctionEvents, UserInteractionEvents {
    onExecutionFinished(): void;
    onExceptionMessage(status: boolean, message?: string): void;
    onTraceMessage(message: string): void;
    onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string): void;

    onAccessNode(observable: any, node: any, accessType: NodeAccessType): void;
    onAddEdge(observable: any, source: any, destination: any): void;
    onAddNode(observable: any, vertex: any, parentValue: any, side: any): void;
    onRemoveNode(observable: any, vertex: any): void;
    onRemoveEdge(observable: any, source: any, destination: any): void;
}

// MESSAGES from CODE DEBUGGER (user)
export class CodeExecutorProxy {    
    sendSharedMem(sharedMem: SharedArrayBuffer) {
        return this.sendWorkerMessage(CodeExecutorCommands.sharedMem, sharedMem);        
    }

    advanceOneCodeLine() {
        if (this.executionHalted)
            return;

        Atomics.notify(this.advanceFlag, CodeExecutorSlots.Main);
    }

    stopExecution() {
        if (this.executionHalted)
            return;

        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.Stop);
        Atomics.notify(this.advanceFlag, 0);
    }
    execute() {
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.NoOp);
        this.sendWorkerMessage(CodeExecutorCommands.execute);
    }
    setSourceCode(code: string) {
        this.sendWorkerMessage(CodeExecutorCommands.setSourceCode, code);
    }
    userInteractionResponse(interactionType: UserInteractionType, value?: string | boolean) {
        let valueAsInt = 0;

        switch (interactionType) {
            case UserInteractionType.Alert:
                valueAsInt = 0;
                break;
            case UserInteractionType.Confirm:
                valueAsInt = (value as boolean) ? 1 : 0;
                break;
            case UserInteractionType.Prompt:
                let valueAsString = value as string;
                valueAsInt = valueAsString != null ? valueAsString.length : -1;
                break;
        }

        Atomics.store(this.advanceFlag, CodeExecutorSlots.MessageSize, interactionType);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.MessageSize + 1, valueAsInt);

        if (interactionType == UserInteractionType.Prompt) {
            for (let idx = 0; idx < valueAsInt; idx++) {
                Atomics.store(this.advanceFlag, CodeExecutorSlots.MessageSize + 2 + idx, (value as string).charCodeAt(idx));
            }
        }

        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.UserInteractionResponse);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Proceed);
        Atomics.notify(this.advanceFlag, 0);

        this.executionHalted = false;
    }

    private sendWorkerMessage(cmd: CodeExecutorCommands, ...args: any[]) {
        this.codexWorker.postMessage({
            cmd: cmd,
            params: args
        });
    }

    //@ts-ignore
    private codexWorker = new Worker(/* webpackChunkName: "av0-worker" */new URL('./code-executor.ts', import.meta.url));    
    private sharedMem = new SharedArrayBuffer(128 * Int16Array.BYTES_PER_ELEMENT);
    private advanceFlag = new Int32Array(this.sharedMem);
    private executionHalted = false; // for prompts

    constructor(private notificationBus : NotificationBus) {
        Atomics.store(this.advanceFlag, 0, CodeExecutorMessages.Wait);

        // MESSAGES from CodeExecutor
        this.codexWorker.onmessage = (event) => {
            let params = event.data.params;

            switch (event.data.cmd) {
                case CodeExecutorCommands.setVar:
                    this.notificationBus.setVar(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.executionFinished:
                    this.notificationBus.onExecutionFinished();
                    break;
                case CodeExecutorCommands.markcl:
                    this.notificationBus.markcl(params[0]);
                    break;
                case CodeExecutorCommands.userInteractionRequest:
                    this.executionHalted = true;
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.notificationBus.onUserInteractionRequest(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.forcemarkcl:
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.notificationBus.forcemarkcl(params[0])
                    break;
                case CodeExecutorCommands.startScope:
                    this.notificationBus.startScope(params[0]);
                    break;
                case CodeExecutorCommands.endScope:
                    this.notificationBus.endScope(params[0]);
                    break;
                case CodeExecutorCommands.pushParams:
                    this.notificationBus.pushParams(params[0]);
                    break;
                case CodeExecutorCommands.popParams:
                    this.notificationBus.popParams(params[0]);
                    break;
                case CodeExecutorCommands.onAddNode:
                    this.notificationBus.onAddNode(params[0], params[1], params[2], params[3]);
                    break;
                case CodeExecutorCommands.onAddEdge:
                    this.notificationBus.onAddEdge(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.onRemoveNode:
                    this.notificationBus.onRemoveNode(params[0], params[1]);
                    break;
                case CodeExecutorCommands.onRemoveEdge:
                    this.notificationBus.onRemoveEdge(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.onAccessNode:
                    this.notificationBus.onAccessNode(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.onExceptionRaised:
                    this.notificationBus.onExceptionMessage(params[0], params[1]);
                    break;
                case CodeExecutorCommands.onConsoleLog:
                    this.notificationBus.onTraceMessage(params[0]);
                    break;
                default:
                    throw 'Cant handle ' + event.data.cmd;
            }
        };
    }

    public init() {
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.Stop);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Proceed);

        return this.sendSharedMem(this.sharedMem);
    }
}