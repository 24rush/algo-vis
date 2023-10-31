
export type GraphNodePayloadType = string | number;
export type AdjacencyList = Map<GraphNodePayloadType, GraphNodePayloadType[]>;

export enum GraphType {
    DIRECTED,
    UNDIRECTED,
    BST,
    BT
}

export enum ChildSide {
    LEFT,
    RIGHT
}

export enum NodeAccessType {
    Access,
    Mark
}

export class BaseObservableType<NotifyCbkType>
{
    protected observers: NotifyCbkType[] = [];

    public name: string;

    registerObserver(notifyCbk: NotifyCbkType) {
        if (!this.observers.find((notif) => notif == notifyCbk))
            this.observers.push(notifyCbk);
    }

    unregisterObserver(notifyCbk: NotifyCbkType) {
        this.observers = this.observers.filter((elem) => elem != notifyCbk);
    }

    getName(): string {
        return this.name.toString();
    }
}

export class NodeBase {
    public type: string = "NodeBase";    

    public label: string = "";
    public id: string = "";
    public value: GraphNodePayloadType = undefined;

    constructor(value: GraphNodePayloadType) {
        this.value = value;
        this.label = value.toString();
        this.id = value.toString();
    }

    toNodeBase(): NodeBase {
        let nodeBase = new NodeBase(this.value);
        nodeBase.id = this.id;
        nodeBase.label = this.label;

        return nodeBase;
    }
}

export class ParentRefNode extends NodeBase {
    protected graph: ObservableGraph = undefined;

    setParentGraph(graph: ObservableGraph) {
        this.graph = graph;
    }
}

export class ObservableGraph extends BaseObservableType<GraphVariableChangeCbk> {
    public __isGraphType__: boolean = true;
    public id: number = 0;

    private static id_counter: number = 0;

    constructor(protected type: GraphType = GraphType.UNDIRECTED) {
        super();

        this.id = ObservableGraph.id_counter++;
    }

    generate(node_count: number) { throw "Not implemented" }
    generate_with(nodes: GraphNodePayloadType[]) { throw "Not implemented" }

    copyFrom(other: ObservableGraph): ObservableGraph {
        this.__isGraphType__ = true;

        this.id = other.id;
        this.type = other.type;
        this.name = other.name;

        return this;
    }

    toObservableGraph(): ObservableGraph {
        return (new ObservableGraph()).copyFrom(this);
    }

    empty() { throw "Not implemented"; }
    isEmpty(): boolean { throw "Not implemented"; }
    find(_value: GraphNodePayloadType): NodeBase { throw "Not implemented"; }
    accessValue(_value: GraphNodePayloadType, _accessType: NodeAccessType) { throw "Not implemented"; }

    getType(): GraphType { return this.type; }

    getValue(): any { return this; }
    setValue(value: any) {
        for (let observer of this.observers) {
            observer.onSetEvent(this, undefined, value);
        }
    }

    // EVENTS
    onAccessNode(node: NodeBase, accessType: NodeAccessType) {
        for (let observer of this.observers) {
            observer.onAccessNode(this, node, accessType);
        }
    }

    onNodeAdded(node: NodeBase, side?: ChildSide) {
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
    onAccessNode(_observable: ObservableGraph, _node: NodeBase, accessType: NodeAccessType) { console.log("Method onAccessNode not implemented."); }

    onAddNode(_observable: ObservableGraph, _vertex: NodeBase, _parentValue?: NodeBase, _side?: ChildSide) { console.log("Method onAddVertex not implemented."); }
    onRemoveNode(_observable: ObservableGraph, _node: NodeBase) { console.log("Method onRemoveVertex not implemented."); }

    onAddEdge(_observable: ObservableGraph, _sourceNode: NodeBase, _destNode: NodeBase) { console.log("Method onAddEdge not implemented."); };
    onRemoveEdge(_observable: ObservableGraph, _sourceNode: NodeBase, _destNode: NodeBase) { console.log("Method onRemoveEdge not implemented."); };
}
