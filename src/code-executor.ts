import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./av-types";
import { NodeBase, GraphType, ParentSide, GraphVariableChangeCbk, ObservableGraph } from './av-types-interfaces'
import { MarkerFunctionEvents, UserInteractionEvents } from "./code-executor-proxy";

export enum UserInteractionType {
    Alert,
    Confirm,
    Prompt
}

export enum CodeExecutorMessages {
    NoOp = 0,
    Wait,
    Wakeup,
    Stop,

    UserInteractionResponse
}

export enum CodeExecutorSlots {
    Main = 0,
    Aux,

    MessageSize,
}

export enum CodeExecutorCommands {
    sharedMem,

    setSourceCode,
    execute,
    executionFinished,
    isWaiting,

    userInteractionRequest,
    userInteractionResponse,

    // EVENTS
    setVar,
    markcl,
    forcemarkcl,
    startScope,
    endScope,

    pushParams,
    popParams,

    // Graph
    onAddNode,
    onAddEdge,
    onRemoveEdge,
    onRemoveNode,

    onExceptionRaised,
    onConsoleLog
}

let codeExec = (): CodeExecutor => {
    let oprec = (self as any).this;

    if (!oprec)
        (self as any).this = new CodeExecutor();

    return (self as any).this;
}

self.onmessage = (event) => {
    if (event.data.cmd === undefined)
        return;

    let wrapMessageHandler = (event: MessageEvent<any>, handler: any) => {
        try {
            event.ports[0].postMessage({
                cmd: event.data.cmd,
                result: handler()
            });
        } catch (e) {
            console.log(e);
            event.ports[0].postMessage({ error: e });
        }
    };

    wrapMessageHandler(event, () => {
        let codex = codeExec();
        // MESSAGES from CodeExecutorProxy
        switch (event.data.cmd) {
            case CodeExecutorCommands.sharedMem:
                if (codex.advanceFlag == undefined)
                    codex.advanceFlag = new Int32Array(event.data.params);
                break;
            case CodeExecutorCommands.setSourceCode:
                codex.setSourceCode(event.data.params[0]);
                break;
            case CodeExecutorCommands.execute:
                codex.execute();
                break;

            default:
                throw 'Cant handle ' + event.data.cmd;
        }
    });
};

export class CodeExecutor implements GraphVariableChangeCbk, MarkerFunctionEvents, UserInteractionEvents {
    // Events sent to CodeExecutorProxy
    onSetEvent(_observable: ObservableGraph, _value: any, _newValue: any): void {
        throw new Error("Method not implemented.");
    }
    onAccessNode(_observable: ObservableGraph, _node: NodeBase): void {
        throw new Error("Method not implemented.");
    }
    onAddNode(_observable: ObservableGraph, _vertex: NodeBase, _parentValue?: NodeBase, _side?: ParentSide): void {
        self.postMessage({
            cmd: CodeExecutorCommands.onAddNode,
            params: Array.from(arguments)
        });
    }
    onRemoveNode(_observable: ObservableGraph, _vertex: NodeBase): void {
        self.postMessage({
            cmd: CodeExecutorCommands.onRemoveNode,
            params: Array.from(arguments)
        });
    }
    onAddEdge(_observable: ObservableGraph, _source: NodeBase, _destination: NodeBase): void {
        self.postMessage({
            cmd: CodeExecutorCommands.onAddEdge,
            params: Array.from(arguments)
        });
    }
    onRemoveEdge(_observable: ObservableGraph, _source: NodeBase, _destination: NodeBase): void {
        self.postMessage({
            cmd: CodeExecutorCommands.onRemoveEdge,
            params: Array.from(arguments)
        });
    }

    onExceptionRaised(status: boolean, message?: string): void {
        self.postMessage({
            cmd: CodeExecutorCommands.onExceptionRaised,
            params: Array.from(arguments)
        });
    }

    onConsoleLog(message: string): void {
        self.postMessage({
            cmd: CodeExecutorCommands.onConsoleLog,
            params: Array.from(arguments)
        });
    }

    protected code: string;
    private lastLineNo: number = -1;
    public advanceFlag: Int32Array = undefined;

    public setSourceCode(code: string) {
        this.lastLineNo = -1;
        this.code = code;
    }

    public execute() {
        let prevFcn = this.hookConsoleLog(undefined);

        try {
            var Types = {
                Graph: Graph, GraphType: GraphType, GraphNode: NodeBase, BinaryTreeNode: BinaryTreeNode,
                BinaryTree: BinaryTree, BinarySearchTree: BinarySearchTree, ParentSide: ParentSide,
            };

            var Funcs = this;

            eval(this.code);

            this.hookConsoleLog(prevFcn, false);
            this.onExecutionFinished();
        } catch (e) {
            this.hookConsoleLog(prevFcn, false);

            console.log(e);

            if (e != "__STOP__") {
                let message = (typeof e == 'object' && 'message' in e) ? e.message : e;
                this.onExceptionRaised(true, message);
            }

            return false;
        }
    }

    private onExecutionFinished() {
        self.postMessage({
            cmd: CodeExecutorCommands.executionFinished,
        });
    }

    forcemarkcl(lineNumber: number): boolean {
        let codex = codeExec();

        if (codex.lastLineNo == lineNumber)
            return;

        if (!codex.advanceFlag) {
            throw 'AdvanceFlag not received';
        }

        self.postMessage({
            cmd: CodeExecutorCommands.forcemarkcl,
            params: Array.from(arguments)
        });

        while (true) {
            let status = Atomics.wait(codex.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);

            if (status != 'not-equal') {
                let auxFlag: number = Atomics.load(codex.advanceFlag as Int32Array, CodeExecutorSlots.Aux);

                if (auxFlag == CodeExecutorMessages.Stop) {
                    throw "__STOP__";
                }

                break;
            }
        }

        codex.lastLineNo = lineNumber;

        return true;
    }

    markcl(lineNumber: number) {
        let codex = codeExec();

        if (!codex.advanceFlag) {
            throw 'AdvanceFlag not received';
        }

        self.postMessage({
            cmd: CodeExecutorCommands.markcl,
            params: Array.from(arguments)
        });

        while (true) {
            let status = Atomics.wait(codex.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);

            if (status != 'not-equal') {
                let auxFlag: number = Atomics.load(codex.advanceFlag as Int32Array, CodeExecutorSlots.Aux);

                if (auxFlag == CodeExecutorMessages.Stop) {
                    throw "__STOP__";
                }

                break;
            }
        }

        codex.lastLineNo = lineNumber;
    }

    startScope(scopeName: string) {
        self.postMessage({
            cmd: CodeExecutorCommands.startScope,
            params: Array.from(arguments)
        });
    }

    endScope(scopeName: string) {
        self.postMessage({
            cmd: CodeExecutorCommands.endScope,
            params: Array.from(arguments)
        });
    }

    pushParams(params: [string, string][]) {
        self.postMessage({
            cmd: CodeExecutorCommands.pushParams,
            params: Array.from(arguments)
        });
    }

    popParams(params: [string, string][]) {
        self.postMessage({
            cmd: CodeExecutorCommands.popParams,
            params: Array.from(arguments)
        });
    }

    setVar(varname: string, object: any, varsource: string) {
        self.postMessage({
            cmd: CodeExecutorCommands.setVar,
            params: Array.from(arguments)
        });

        if (object && typeof object == 'object' && '__isGraphType__' in object) {
            let graph = object as ObservableGraph;
            let codex = codeExec();

            graph.registerObserver(codex);
        }
    }

    funcWrap(func: any) : any {        
        //@ts-ignore
        return (arguments as unknown)[0].f();
    }

    promptWrap(title?: string, defValue?: string): string {
        return codeExec().userInteractionRequest(UserInteractionType.Prompt, title, defValue) as string;
    }

    alertWrap(title?: string) {
        codeExec().userInteractionRequest(UserInteractionType.Alert, title);
    }

    confirmWrap(title?: string): boolean {
        return codeExec().userInteractionRequest(UserInteractionType.Confirm, title) as boolean;
    }

    private hookConsoleLog(prevFcn: any, hook: boolean = true): any {
        if (hook) {
            if (prevFcn == undefined)
                prevFcn = console.log;

            console.log = (message: any) => {
                this.onConsoleLog(message);
                prevFcn.apply(console, [message]);
            };
        } else {
            console.log = prevFcn;
        }

        return prevFcn;
    }

    private userInteractionRequest(_userInteraction: UserInteractionType, _title?: string, _defValue?: string): string | boolean {
        let codex = codeExec();

        if (!codex.advanceFlag) {
            throw 'AdvanceFlag not received';
        }

        self.postMessage({
            cmd: CodeExecutorCommands.userInteractionRequest,
            params: Array.from(arguments)
        });

        while (true) {
            let status = Atomics.wait(codex.advanceFlag, CodeExecutorSlots.Main, CodeExecutorMessages.Wait);

            if (status != 'not-equal') {
                let auxFlag: number = Atomics.load(codex.advanceFlag, CodeExecutorSlots.Aux);

                if (auxFlag == CodeExecutorMessages.UserInteractionResponse) {
                    let interactionType: number = Atomics.load(codex.advanceFlag, CodeExecutorSlots.MessageSize);

                    switch (interactionType) {
                        case UserInteractionType.Alert:
                            return undefined;
                        case UserInteractionType.Confirm:
                            console.log(Atomics.load(codex.advanceFlag, CodeExecutorSlots.MessageSize + 1))
                            return Atomics.load(codex.advanceFlag, CodeExecutorSlots.MessageSize + 1) == 1;
                        case UserInteractionType.Prompt: {
                            let msgSize: number = Atomics.load(codex.advanceFlag, CodeExecutorSlots.MessageSize + 1);

                            let msg = msgSize == -1 ? null : "";
                            if (msgSize > 0) {
                                msg = "";
                                for (let idx = 0; idx < msgSize; idx++) {
                                    msg += String.fromCharCode(Atomics.load(codex.advanceFlag, CodeExecutorSlots.MessageSize + idx + 2));
                                }
                            }

                            return msg;
                        }
                    }
                }
            }
        }
    }
}
