import { CodeExecutorCommands, CodeExecutorMessages, CodeExecutorSlots, UserInteractionType } from "./code-executor";
import { NotificationEmitter, NotificationTypes } from "./notification-emitter";

export interface UserInteractionEvents {
    funcWrap(func: any) : any;
    promptWrap(title?: string, defValue?: string): string;
    alertWrap(title?: string) : void;
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

    onAddEdge(observable: any, source: any, destination: any): void;
    onAddNode(observable: any, vertex: any, parentValue: any, side: any): void;
    onRemoveNode(observable: any, vertex: any): void;
    onRemoveEdge(observable: any, source: any, destination: any): void;
}

export class CodeExecutorProxy {
    // MESSAGES from OPERATION RECORDER
    sendSharedMem(sharedMem: SharedArrayBuffer) {
        return this.promiseWrapperDirectPassParams<void>(CodeExecutorCommands.sharedMem, sharedMem);
    }
    isWaiting(): Promise<boolean> {
        return this.promiseWrapperCopyParams<boolean>(CodeExecutorCommands.isWaiting);
    }
    advanceOneCodeLine() {
        if (this.executionHalted)
            return;

        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.NoOp);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wakeup);
        Atomics.notify(this.advanceFlag, CodeExecutorSlots.Main);
    }

    stopExecution() {
        if (this.executionHalted)
            return;

        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.Stop);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wakeup);
        Atomics.notify(this.advanceFlag, 0);
    }
    execute(): Promise<boolean> {
        return this.promiseWrapperCopyParams<boolean>(CodeExecutorCommands.execute);
    }
    setSourceCode(...args: any[]): Promise<boolean> {
        return this.promiseWrapperCopyParams<boolean>(CodeExecutorCommands.setSourceCode, ...args);
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
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wakeup);
        Atomics.notify(this.advanceFlag, 0);

        this.executionHalted = false;
    }

    private promiseWrapperDirectPassParams<T>(cmd: CodeExecutorCommands, sharedMem: SharedArrayBuffer): Promise<T> {
        return new Promise((result, reject) => {
            const channel = new MessageChannel();

            channel.port1.onmessage = ({ data }) => {
                channel.port1.close();
                data.error ? reject(data.error) : result(data.result);
            };

            this.codexWorker.postMessage({
                cmd: cmd,
                params: sharedMem
            }, [channel.port2]);
        });
    }

    private promiseWrapperCopyParams<T>(cmd: CodeExecutorCommands, ...args: any[]): Promise<T> {
        return new Promise((result, reject) => {
            const channel = new MessageChannel();

            channel.port1.onmessage = ({ data }) => {
                channel.port1.close();
                data.error ? reject(data.error) : result(data.result);
            };

            this.codexWorker.postMessage({
                cmd: cmd,
                params: Array.from(args)
            }, [channel.port2]);
        });
    }

    //@ts-ignore
    private codexWorker = new Worker(new URL('./code-executor.ts', import.meta.url));
    private codeExecutorEventHandler: NotificationEmitter = new NotificationEmitter();
    private sharedMem = new SharedArrayBuffer(128 * Int16Array.BYTES_PER_ELEMENT);
    private advanceFlag = new Int32Array(this.sharedMem);
    private executionHalted = false; // for prompts

    constructor() {
        Atomics.store(this.advanceFlag, 0, CodeExecutorMessages.Wait);

        // MESSAGES from CodeExecutor
        this.codexWorker.onmessage = (event) => {
            let params = event.data.params;

            switch (event.data.cmd) {
                case CodeExecutorCommands.setVar:
                    this.codeExecutorEventHandler.setVar(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.executionFinished:
                    this.codeExecutorEventHandler.onExecutionFinished();
                    break;
                case CodeExecutorCommands.markcl:
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.codeExecutorEventHandler.markcl(params[0]);
                    break;
                case CodeExecutorCommands.userInteractionRequest:
                    this.executionHalted = true;
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.codeExecutorEventHandler.onUserInteractionRequest(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.forcemarkcl:
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.codeExecutorEventHandler.forcemarkcl(params[0])
                    break;
                case CodeExecutorCommands.startScope:
                    this.codeExecutorEventHandler.startScope(params[0]);
                    break;
                case CodeExecutorCommands.endScope:
                    this.codeExecutorEventHandler.endScope(params[0]);
                    break;
                case CodeExecutorCommands.pushParams:
                    this.codeExecutorEventHandler.pushParams(params[0]);
                    break;
                case CodeExecutorCommands.popParams:
                    this.codeExecutorEventHandler.popParams(params[0]);
                    break;
                case CodeExecutorCommands.onAddNode:
                    this.codeExecutorEventHandler.onAddNode(params[0], params[1], params[2], params[3]);
                    break;
                case CodeExecutorCommands.onAddEdge:
                    this.codeExecutorEventHandler.onAddEdge(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.onRemoveNode:
                    this.codeExecutorEventHandler.onRemoveNode(params[0], params[1]);
                    break;
                case CodeExecutorCommands.onRemoveEdge:
                    this.codeExecutorEventHandler.onRemoveEdge(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.onExceptionRaised:
                    this.codeExecutorEventHandler.onExceptionMessage(params[0], params[1]);
                    break;
                case CodeExecutorCommands.onConsoleLog:
                    this.codeExecutorEventHandler.onTraceMessage(params[0]);
                    break;
                default:
                    throw 'Cant handle ' + event.data.cmd;
            }
        };
    }

    public registerNotificationObserver(notifier: NotificationTypes) {
        this.codeExecutorEventHandler.registerNotificationObserver(notifier);
    }

    public init() {
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.Stop);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wakeup);

        return this.sendSharedMem(this.sharedMem);
    }
}