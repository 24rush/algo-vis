import { GraphVariableChangeCbk } from "./av-types-interfaces";
import { CodeExecutorCommands, CodeExecutorMessages, CodeExecutorSlots } from "./code-executor";

export interface CodeExecutorEvents extends GraphVariableChangeCbk {
    forceMarkLine(lineNumber: number): void;
    markStartCodeLine(lineNumber: number): void;

    startScope(scopeName: string): void;
    endScope(scopeName: string): void;

    pushParams(params: [string, string][]): void;
    popParams(params: [string, string][]): void;

    setVar(varname: string, object: any, varsource: string): void;
    promptRequest(title?: string, defValue?: string): void;

    onExecutionCompleted(): void;
    onExceptionMessage(status: boolean, message?: string): void;
    onTraceMessage(message: string): void;
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
    promptReply(value?: string) {
        Atomics.store(this.advanceFlag, CodeExecutorSlots.MessageSize, value == null ? 0 : value.length);
        if (value != null) {
            for (let idx = 0; idx < value.length; idx++) {
                Atomics.store(this.advanceFlag, CodeExecutorSlots.MessageSize + idx + 1, value.charCodeAt(idx));
            }
        }

        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.PromptReply);
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
    private codeExecutorEventHandler: CodeExecutorEvents = undefined;
    private sharedMem = new SharedArrayBuffer(128 * Int16Array.BYTES_PER_ELEMENT);
    private advanceFlag = new Int32Array(this.sharedMem);
    private executionHalted = false; // for prompts

    constructor(eventHandler: CodeExecutorEvents) {
        Atomics.store(this.advanceFlag, 0, CodeExecutorMessages.Wait);

        this.codeExecutorEventHandler = eventHandler;

        // MESSAGES from CodeExecutor
        this.codexWorker.onmessage = (event) => {
            let params = event.data.params;

            switch (event.data.cmd) {
                case CodeExecutorCommands.setVar:
                    this.codeExecutorEventHandler.setVar(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.executionFinished:
                    this.codeExecutorEventHandler.onExecutionCompleted();
                    break;
                case CodeExecutorCommands.markStartCodeLine:
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.codeExecutorEventHandler.markStartCodeLine(params[0]);
                    break;
                case CodeExecutorCommands.promptRequest:
                    this.executionHalted = true;
                    Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);
                    this.codeExecutorEventHandler.promptRequest(params[0], params[1]);
                    break;
                case CodeExecutorCommands.forceMarkLine:
                    this.codeExecutorEventHandler.forceMarkLine(params[0])
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
                case CodeExecutorCommands.onExceptionMessage:
                    this.codeExecutorEventHandler.onExceptionMessage(params[0], params[1]);
                    break;
                case CodeExecutorCommands.onTraceMessage:
                    this.codeExecutorEventHandler.onTraceMessage(params[0]);
                    break;
                default:
                    throw 'Cant handle ' + event.data.cmd;
            }
        };
    }

    public init() {
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Aux, CodeExecutorMessages.Stop);
        Atomics.store(this.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wakeup);

        return this.sendSharedMem(this.sharedMem);
    }
}