
import { BaseObservableType } from "./observable-type";

export type GraphNodePayloadType = string | number;

export enum GraphType {
    DIRECTED,
    UNDIRECTED,
    BST,
    BT
}

export enum ParentSide {
    LEFT,
    RIGHT
}

export class NodeBase {
    protected graph: ObservableGraph = undefined;

    public label: string = "";
    public id: string = "";

    constructor(public value: GraphNodePayloadType) {
        this.label = value.toString();
        this.id = value.toString();
    }

    setParentGraph(graph: ObservableGraph) {
        this.graph = graph;
    }
}

export class ObservableGraph extends BaseObservableType<GraphVariableChangeCbk> {

    constructor(protected type: GraphType) {
        super();
    }

    empty() { throw "Not implemented"; }
    isEmpty(): boolean { throw "Not implemented"; }
    find(_value: GraphNodePayloadType): NodeBase { throw "Not implemented"; }
    accessValue(_value: GraphNodePayloadType) { throw "Not implemented"; }

    getType(): GraphType { return this.type; }

    getValue(): any { return this; }
    setValue(value: any) {
        for (let observer of this.observers) {
            observer.onSetEvent(this, undefined, value);
        }
    }

    // EVENTS
    onAccessNode(node: NodeBase) {
        for (let observer of this.observers) {
            observer.onAccessNode(this, node);
        }
    }

    onNodeAdded(node: NodeBase, side?: ParentSide) {
        if (!node)
            return;        

        for (let observer of this.observers) {        
            //@ts-ignore    
            observer.onAddNode(this, node, node.parent, side);
        }
    }

    onEdgeAdded(source: NodeBase, destination: NodeBase) {
        if (!source || !destination) return;

        for (let observer of this.observers) {
            observer.onAddEdge(this, source, destination);
        }
    }

    onNodeRemoved(node: NodeBase) {
        if (!node) return;

        for (let observer of this.observers) {
            observer.onRemoveNode(this, node);
        }
    }

    onEdgeRemoved(source: NodeBase, destination: NodeBase) {
        if (!source || !destination) return;

        for (let observer of this.observers) {
            observer.onRemoveEdge(this, source, destination);
        }
    }
}

export class GraphVariableChangeCbk {
    onSetEvent(_observable: ObservableGraph, _value: any, _newValue: any) { console.log("Method not implemented."); };

    onAccessNode(_observable: ObservableGraph, _node: NodeBase) { console.log("Method onAccessNode not implemented."); }

    onAddNode(_observable: ObservableGraph, _vertex: NodeBase, _parentValue?: NodeBase, _side?: ParentSide) { console.log("Method onAddVertex not implemented."); }
    onRemoveNode(_observable: ObservableGraph, _vertex: NodeBase) { console.log("Method onRemoveVertex not implemented."); }

    onAddEdge(_observable: ObservableGraph, _source: NodeBase, _destination: NodeBase) { console.log("Method onAddEdge not implemented."); };
    onRemoveEdge(_observable: ObservableGraph, _source: NodeBase, _destination: NodeBase) { console.log("Method onRemoveEdge not implemented."); };
}
