import { GraphVariableChangeCbk } from "./av-types-interfaces";
import { CodeExecutorCommands } from "./code-executor";

export interface CodeExecutorEvents extends GraphVariableChangeCbk {
    forceMarkLine(lineNumber: number): void;
    markStartCodeLine(lineNumber: number): void;

    startScope(scopeName: string): void;
    endScope(scopeName: string): void;

    pushParams(params: [string, string][]): void;
    popParams(params: [string, string][]): void;

    setVar(varname: string, object: any, varsource: string): void;
}

export class CodeExecutorProxy {
    getFirstCodeLineNumber(): Promise<number> {
        return this.promiseWrapper<number>(CodeExecutorCommands.getFirstCodeLineNumber);
    }
    getNextCodeLineNumber(): Promise<number> {
        return this.promiseWrapper<number>(CodeExecutorCommands.getNextCodeLineNumber);
    }
    isReplayFinished(): Promise<boolean> {
        return this.promiseWrapper<boolean>(CodeExecutorCommands.isReplayFinished);
    }
    isWaiting(): Promise<boolean> {
        return this.promiseWrapper<boolean>(CodeExecutorCommands.isWaiting);
    }
    advanceOneCodeLine() {
        return this.promiseWrapper<void>(CodeExecutorCommands.advanceOneCodeLine);
    }
    startReplay(...args: any[]): Promise<void> {
        return this.promiseWrapper<void>(CodeExecutorCommands.startReplay, ...args);
    }
    execute(): Promise<boolean> {
        return this.promiseWrapper<boolean>(CodeExecutorCommands.execute);
    }
    setSourceCode(...args: any[]): Promise<boolean> {
        return this.promiseWrapper<boolean>(CodeExecutorCommands.setSourceCode, ...args);
    }

    private promiseWrapper<T>(cmd: CodeExecutorCommands, ...args: any[]): Promise<T> {
        return new Promise((result, reject) => {
            const channel = new MessageChannel();

            channel.port1.onmessage = ({ data }) => {
                channel.port1.close();
                if (data.error) {
                    reject(data.error);
                } else {
                    console.log(`RET cmd: ${data.cmd} result = ${data.result}`);
                    result(data.result);
                }
            };

            this.oprecWorker.postMessage({
                cmd: cmd,
                params: Array.from(args)
            }, [channel.port2]);
        });
    }

    setWaiting(status: boolean) {
        throw new Error("Method not implemented.");
    }

    //@ts-ignore
    private oprecWorker = new Worker(new URL('./code-executor.ts', import.meta.url));
    private codeExecutorEventHandler: CodeExecutorEvents = undefined;

    constructor(eventHandler: CodeExecutorEvents) {
        this.codeExecutorEventHandler = eventHandler;

        this.oprecWorker.onmessage = (event) => {
            console.log("Message from worker:", event.data);
            let params = event.data.params;

            switch (event.data.cmd) {
                case CodeExecutorCommands.setVar:
                    this.codeExecutorEventHandler.setVar(params[0], params[1], params[2]);
                    break;
                case CodeExecutorCommands.markStartCodeLine:
                    this.codeExecutorEventHandler.markStartCodeLine(params[0]);
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
                default:
                    throw 'Cant handle ' + event.data.cmd;
            }
        };
    }
}