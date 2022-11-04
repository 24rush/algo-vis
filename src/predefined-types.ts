import { BaseObservableType } from "./observable-type";

export enum GraphType {
    DIRECTED,
    UNDIRECTED
}

export enum TreeType {
    BST,
}

export class GraphVariableChangeCbk {
    onSetEvent(_observable: ObservableGraphTypes | ObservableTree, _value: any, _newValue: any) { console.log("Method not implemented."); };

    onAddNode(_observable: ObservableGraphTypes, _vertex: any) { console.log("Method onAddVertex not implemented."); }
    onRemoveNode(_observable: ObservableGraphTypes, _vertex: any) { console.log("Method onRemoveVertex not implemented."); }

    onAddEdge(_observable: ObservableGraphTypes, _source: any, _destination: any) { console.log("Method onAddEdge not implemented."); };
    onRemoveEdge(_observable: ObservableGraphTypes, _source: any, _destination: any) { console.log("Method onRemoveEdge not implemented."); };
}

class Node {
    private adjacents: Set<any> = new Set();

    constructor(protected value: any) {
    }

    addAdjacent(node: any) {
        this.adjacents.add(node);
    }

    removeAdjacent(node: any) {
        return this.adjacents.delete(node);
    }
}

enum ParentSide {
    LEFT,
    RIGHT
}

class BinaryTreeNode {
    left: BinaryTreeNode;
    right: BinaryTreeNode;
    parent: BinaryTreeNode;

    multiplicity: number = 0;
    offset: number = 0;
    parentSide: ParentSide;

    constructor(public value: any) {
    }

    setChild(side: ParentSide, childNode: BinaryTreeNode) {
        if (side == ParentSide.LEFT) {
            this.left = childNode;
        } else {
            this.right = childNode;
        }

        if (childNode) {
            childNode.parent = this;
            childNode.parentSide = side;
        }

    }

    isLeftChild() { return this.parentSide === ParentSide.LEFT; }
    isRightChild() { return this.parentSide === ParentSide.RIGHT; }
    isRoot() { return this.parent === undefined; }
}

export class ObservableTree extends BaseObservableType<GraphVariableChangeCbk> {
    protected root: any;
    public name: string = "";

    constructor(protected type = TreeType.BST) {
        super();
    }

    public empty() { this.root = undefined; }
    public isEmpty() { return this.root == undefined; }
    public hasDirectedEdges(): boolean { return false; }

    public getValue(): any { return this; }
    public setValue(value: any) {
        for (let observer of this.observers) {
            observer.onSetEvent(this, undefined, value);
        }
    }

    isNodeOnlyChild(node: BinaryTreeNode) : boolean {
        if (!node || !node.parent)
            return true;

        if (node.parent.left && node.parent.right)
            return false;

        return true;
    }

    find(value: any) : BinaryTreeNode {
        return this.findNodeAndParent(value, this.root)[0];
    }

    add(value: any) {
        let nodeToAdd: BinaryTreeNode;

        if (!this.root) {
            nodeToAdd = new BinaryTreeNode(value);
            this.root = nodeToAdd;

            this.notifyOnNodeAdded(nodeToAdd);
            return this.root;
        }

        const [foundNode, parent] = this.findNodeAndParent(value, this.root);

        if (foundNode) {
            foundNode.multiplicity = (foundNode.multiplicity || 1) + 1;
        } else {
            nodeToAdd = new BinaryTreeNode(value);
            parent.setChild(value < parent.value ? ParentSide.LEFT : ParentSide.RIGHT, nodeToAdd);

            this.notifyOnNodeAdded(nodeToAdd);
            this.notifyOnEdgeAdded(parent, nodeToAdd);
        }
    }

    remove(value: any) {
        const [nodeToRemove, parent] = this.findNodeAndParent(value, this.root);

        if (!nodeToRemove)
            return;

        if (nodeToRemove.multiplicity > 1) {
            nodeToRemove.multiplicity -= 1;
            return;
        }

        this.notifyOnNodeRemoved(nodeToRemove);

        // Combine left and right children into one subtree without nodeToRemove
        let childrenOfRemovedNode: BinaryTreeNode = nodeToRemove.left;

        if (nodeToRemove.right) {
            const leftmost = this.getLeftmost(nodeToRemove.right);
            leftmost.setChild(ParentSide.LEFT, nodeToRemove.left);            
            childrenOfRemovedNode = nodeToRemove.right;           
            this.notifyOnEdgeAdded(nodeToRemove.left, leftmost); 
        }

        if (nodeToRemove === this.root) {
            this.root = childrenOfRemovedNode;
            if (this.root) { this.root.parent = null; }
        } else {
            this.notifyOnEdgeAdded(parent, childrenOfRemovedNode);
            parent.setChild(nodeToRemove.isLeftChild() ? ParentSide.LEFT : ParentSide.RIGHT, childrenOfRemovedNode);
        }
    }

    private notifyOnNodeAdded(node: BinaryTreeNode) {
        for (let observer of this.observers) {
            observer.onAddNode(this, node.value);
        }
    }

    private notifyOnNodeRemoved(node: BinaryTreeNode) {
        for (let observer of this.observers) {
            observer.onRemoveNode(this, node.value);
        }
    }

    private notifyOnEdgeAdded(source: BinaryTreeNode, destination: BinaryTreeNode) {
        if (!source || !destination) return; 
        for (let observer of this.observers) {
            observer.onAddEdge(this, source.value, destination.value);
        }
    }

    private findNodeAndParent(value: any, node: BinaryTreeNode, parent: BinaryTreeNode = null): [BinaryTreeNode, BinaryTreeNode] {
        if (!node || node.value === value) {
            return [node, parent];
        }

        if (value < node.value) {
            return this.findNodeAndParent(value, node.left, node);
        }

        return this.findNodeAndParent(value, node.right, node);
    }

    private getLeftmost(node = this.root): BinaryTreeNode {
        if (!node || !node.left) {
            return node;
        }

        return this.getLeftmost(node.left);
    }
}

export class ObservableGraph extends BaseObservableType<GraphVariableChangeCbk> {
    private nodes: Map<any, Node> = new Map();
    public name: string = "";

    constructor(protected edgeDirection = GraphType.DIRECTED) {
        super();
    }

    public empty() { this.nodes.clear(); }
    public isEmpty() { return this.nodes.size == 0; }
    public hasDirectedEdges(): boolean { return this.edgeDirection == GraphType.DIRECTED; }

    public getValue(): any { return this; }
    public setValue(value: any) {
        for (let observer of this.observers) {
            observer.onSetEvent(this, undefined, value);
        }
    }

    addNode(value: any) {
        if (this.nodes.has(value)) {
            return this.nodes.get(value);
        }

        const node = new Node(value);
        this.nodes.set(value, node);

        for (let observer of this.observers) {
            observer.onAddNode(this, value);
        }

        return node;
    }

    removeNode(value: any) {
        const current = this.nodes.get(value);
        if (current) {
            Array.from(this.nodes.values()).forEach((node) => node.removeAdjacent(current));

            for (let observer of this.observers) {
                observer.onRemoveNode(this, value);
            }
        }
    }

    addEdge(source: any, destination: any) {
        if (!source || !destination) {
            throw 'You must specify both source and destination';
        }

        const sourceNode = this.addNode(source);
        const destinationNode = this.addNode(destination);

        sourceNode.addAdjacent(destinationNode);

        if (this.edgeDirection === GraphType.UNDIRECTED) {
            destinationNode.addAdjacent(sourceNode);
        }

        for (let observer of this.observers) {
            observer.onAddEdge(this, source, destination);
        }

        return [sourceNode, destinationNode];
    }

    removeEdge(source: any, destination: any) {
        const sourceNode = this.nodes.get(source);
        const destinationNode = this.nodes.get(destination);

        if (sourceNode && destinationNode) {
            sourceNode.removeAdjacent(destinationNode);

            if (this.edgeDirection === GraphType.UNDIRECTED) {
                destinationNode.removeAdjacent(sourceNode);
            }

            for (let observer of this.observers) {
                observer.onRemoveEdge(this, source, destination);
            }
        }
    }
}

export type ObservableGraphTypes = ObservableGraph | ObservableTree;
