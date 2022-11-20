import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from "./av-types";
import { NodeBase, GraphType, ParentSide, GraphVariableChangeCbk, ObservableGraph } from './av-types-interfaces'




export enum CodeExecutorCommands {
    setSourceCode,
    execute,
    startReplay,
    getNextCodeLineNumber,
    getFirstCodeLineNumber,
    isWaiting,
    isReplayFinished,
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

let codeExec = () => {
    let oprec = (self as any).this;

    if (!oprec)
        (self as any).this = new CodeExecutor();

    return (self as any).this;
}

self.onmessage = (event) => {
    if (event.data.cmd === undefined)
        return;

    console.log(event.data);

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
            case CodeExecutorCommands.setSourceCode:
                codex.setSourceCode(event.data.params);
                break;
            case CodeExecutorCommands.execute:
                codex.execute();
                break;
            case CodeExecutorCommands.startReplay:
                codex.startReplay();

            case CodeExecutorCommands.getFirstCodeLineNumber:
                return codex.getFirstCodeLineNumber();

            case CodeExecutorCommands.getNextCodeLineNumber:
                return codex.getNextCodeLineNumber();

            case CodeExecutorCommands.isWaiting:
                return codex.isWaiting();

            case CodeExecutorCommands.advanceOneCodeLine:
                codex.advanceOneCodeLine();
                break;

            case CodeExecutorCommands.isReplayFinished:
                return codex.isReplayFinished();

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

    protected code: string;

    public setSourceCode(code: string) {
        this.code = code;
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

            this.code = "\"use strict\"; \
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
                        " + this.code;

            eval(this.code);

            this.hookConsoleLog(prevFcn, false);
        } catch (e) {
            console.log(e);
            this.hookConsoleLog(prevFcn, false);
            let message = (typeof e == 'object' && 'message' in e) ? e.message : e;
            //TODO this.onExceptionMessage(true, message);

            return false;
        }
    }

    public getFirstCodeLineNumber(): number {
        return -1;
    }

    public getNextCodeLineNumber(): number {
        return -1;
    }

    public forceMarkLine(lineNumber: number) {
        self.postMessage({
            cmd: CodeExecutorCommands.forceMarkLine,
            params: Array.from(arguments)
        });
    }

    public markStartCodeLine(lineNumber: number) {
        self.postMessage({
            cmd: CodeExecutorCommands.markStartCodeLine,
            params: Array.from(arguments)
        });
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