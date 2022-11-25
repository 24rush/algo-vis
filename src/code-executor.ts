import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./av-types";
import { NodeBase, GraphType, ParentSide, GraphVariableChangeCbk, ObservableGraph } from './av-types-interfaces'

export enum CodeExecutorMessages {
    NoOp = 0,
    Wait,
    Wakeup,
    Stop
}

export enum CodeExecutorSlots {
    Main = 0,
    Aux = 1
}

export enum CodeExecutorCommands {
    sharedMem,

    setSourceCode,
    execute,
    executionFinished,
    isWaiting,
    advanceOneCodeLine,

    // EVENTS
    setVar,
    markStartCodeLine,
    forceMarkLine,
    startScope,
    endScope,

    pushParams,
    popParams,

    // Graph
    onAddNode,
    onAddEdge,
    onRemoveEdge,
    onRemoveNode
}

let codeExec = () : CodeExecutor => {
    let oprec = (self as any).this;

    if (!oprec)
        (self as any).this = new CodeExecutor();

    return (self as any).this;
}

self.onmessage = (event) => {
    console.log(event.data);
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

        switch (event.data.cmd) {
            case CodeExecutorCommands.sharedMem:
                if (codex.advanceFlag == undefined)
                    codex.advanceFlag = new Int32Array(event.data.params);
                break;
            case CodeExecutorCommands.setSourceCode:
                codex.setSourceCode(event.data.params);
                break;
            case CodeExecutorCommands.execute:
                codex.execute();
                break;
 
            case CodeExecutorCommands.advanceOneCodeLine:
                codex.advanceOneCodeLine();
                break;

            default:
                throw 'Cant handle ' + event.data.cmd;
        }
    });
};

export class CodeExecutor implements GraphVariableChangeCbk {
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

    protected origCode: string;
    protected advanceOneLineReceived: boolean = false;
    public advanceFlag: Int32Array = undefined;

    constructor() {
    }

    public setSourceCode(code: string) {
        this.origCode = code;
    }

    public execute() {
        let prevFcn = this.hookConsoleLog(undefined);

        try {
            var Types = {
                Graph: Graph, GraphType: GraphType, GraphNode: NodeBase, BinaryTreeNode: BinaryTreeNode,
                BinaryTree: BinaryTree, BinarySearchTree: BinarySearchTree, ParentSide: ParentSide,
            };

            var Funcs = {
                markcl: this.markStartCodeLine,
                setVar: this.setVar,
                startScope: this.startScope,
                endScope: this.endScope,
                pushParams: this.pushParams,
                popParams: this.popParams,
                forcemarkcl: this.forceMarkLine
            };

            let code = "\"use strict\"; \
                         let BinarySearchTree = Types.BinarySearchTree; \
                         let BinaryTree = Types.BinaryTree;\
                         let Graph = Types.Graph;\
                         let GraphType = Types.GraphType; \
                         let GraphNode = Types.GraphNode; \
                         let BinaryTreeNode = Types.BinaryTreeNode; \
                         let TreeNodeSide = Types.ParentSide;       \
                         let markcl = Funcs.markcl; \
                         let forcemarkcl = Funcs.forcemarkcl; \
                         let setVar = Funcs.setVar; \
                         let startScope = Funcs.startScope; \
                         let endScope = Funcs.endScope; \
                         let pushParams = Funcs.pushParams; \
                         let popParams = Funcs.popParams; \
                        " + this.origCode;

            eval(code);
            this.hookConsoleLog(prevFcn, false);

            this.onExecutionFinished();
        } catch (e) {
            console.log(e);
            throw e;
            this.hookConsoleLog(prevFcn, false);
            let message = (typeof e == 'object' && 'message' in e) ? e.message : e;
            //TODO this.onExceptionMessage(true, message);

            return false;
        }
    }

    private onExecutionFinished() {
        self.postMessage({
            cmd: CodeExecutorCommands.executionFinished,
        });
    }

    public forceMarkLine(lineNumber: number) {
        self.postMessage({
            cmd: CodeExecutorCommands.forceMarkLine,
            params: Array.from(arguments)
        });
    }

    public advanceOneCodeLine() {
        let codex = codeExec();

        console.log('Advance received');
        codex.advanceOneLineReceived = true;
    }

    public markStartCodeLine(lineNumber: number) {
        let codex = codeExec();

        if (!codex.advanceFlag) {
            throw 'AdvanceFlag not received';
        }

        console.log('markStartCodeLine ' + lineNumber);

        self.postMessage({
            cmd: CodeExecutorCommands.markStartCodeLine,
            params: Array.from(arguments)
        });

        while (true) {
            let status = Atomics.wait(codex.advanceFlag, 0, CodeExecutorMessages.Wait);

            if (status != 'not-equal') {
                let auxFlag : number = Atomics.load(codex.advanceFlag as Int32Array, 1);

                if (auxFlag == CodeExecutorMessages.Stop) {
                    console.log('THRIE');
                    throw "STOP";
                }

                break;
            }
        }
    }

    public startScope(scopeName: string) {
        self.postMessage({
            cmd: CodeExecutorCommands.startScope,
            params: Array.from(arguments)
        });
    }

    public endScope(scopeName: string) {
        self.postMessage({
            cmd: CodeExecutorCommands.endScope,
            params: Array.from(arguments)
        });
    }

    public pushParams(params: [string, string][]) {
        self.postMessage({
            cmd: CodeExecutorCommands.pushParams,
            params: Array.from(arguments)
        });
    }

    public popParams(params: [string, string][]) {
        self.postMessage({
            cmd: CodeExecutorCommands.popParams,
            params: Array.from(arguments)
        });
    }

    public setVar(varname: string, object: any, varsource: string) {
        self.postMessage({
            cmd: CodeExecutorCommands.setVar,
            params: Array.from(arguments)
        });

        if (typeof object == 'object' && '__isGraphType__' in object) {
            let graph = object as ObservableGraph;
            let codex = codeExec();

            graph.registerObserver(codex);
        }
    }

    private hookConsoleLog(prevFcn: any, hook: boolean = true): any {
        if (hook) {
            if (prevFcn == undefined)
                prevFcn = console.log;

            console.log = (message: any) => {
                //TODO this.addOperation(OperationType.TRACE, new TraceOperationPayload(message));
                prevFcn.apply(console, [message]);
            };
        } else {
            console.log = prevFcn;
        }

        return prevFcn;
    }
}