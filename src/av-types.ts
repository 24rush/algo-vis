import { GraphNodePayloadType, GraphType, NodeBase, ObservableGraph, ParentSide } from "./av-types-interfaces";

class BinaryTreeNodeProxy {
    constructor(protected target: any) {
        return new Proxy(target, {
            set: (target, property, newValue, proxy) => {
                property in target ? target[property] = newValue : target = newValue;

                if (property === 'left') {
                    target.updateObject(ParentSide.LEFT, newValue);
                } else if (property === 'right') {
                    target.updateObject(ParentSide.RIGHT, newValue);
                }

                return true;
            },
            get: (target: any, property: any, _receiver: any) => {
                if (property === 'value') {
                    target.onGetValue();
                }

                return property in target ? target[property] : target;
            }
        });
    }
}

export class BinaryTreeNode extends NodeBase {
    left: BinaryTreeNode = undefined;
    right: BinaryTreeNode = undefined;
    parent: BinaryTreeNode = undefined;
    multiplicity: number = 0;
    offset: number = 0;

    private parentSide: ParentSide = undefined;

    constructor(value: any) {
        super(value);

        return new BinaryTreeNodeProxy(this) as unknown as BinaryTreeNode;
    }

    createChild(side: ParentSide, value: GraphNodePayloadType) {
        let addedNode = value != undefined ? new BinaryTreeNode(value) : undefined;
        this.setChild(side, addedNode);
    }

    setChild(side: ParentSide, addedNode: BinaryTreeNode) {
        (side === ParentSide.LEFT) ? this.left = addedNode : this.right = addedNode;
        this.updateObject(side, addedNode);
    }

    updateObject(side: ParentSide, addedNode: BinaryTreeNode) {
        if (!addedNode) return;

        if (this.graph.getType() == GraphType.BST) {
            if ((side == ParentSide.LEFT && addedNode.value > this.value) ||
                (side == ParentSide.RIGHT && addedNode.value < this.value))
                throw `Cannot add node as it doesn't follow convention: left < parent < right (${addedNode.value} ${this.value})`;
        }

        addedNode.parent = this;
        addedNode.parentSide = side;
        addedNode.setParentGraph(this.graph);

        if (!this.graph)
            throw 'Node not allocated to any tree: ' + addedNode.value;

        this.graph.onNodeAdded(addedNode, side);
        this.graph.onEdgeAdded(this, addedNode);
    }

    onGetValue() {
        this.graph?.onAccessNode(this);
    }

    isRoot() { return this.parent === undefined; }

    isLeftChild() { return this.parentSide === ParentSide.LEFT; }
    isRightChild() { return this.parentSide === ParentSide.RIGHT; }

    isOnlyChild(): boolean {
        if (!this.parent)
            return true;

        return !(this.parent.left && this.parent.right)
    }
}

export class GraphNode extends NodeBase {
    private adjacents: Set<any> = new Set();
    private adjacents_nodes: Map<any, NodeBase> = new Map();

    constructor(value: any) {
        super(value);
    }

    addAdjacent(value: any) {
        this.adjacents.add(value);

        if (!this.adjacents_nodes.has(value)) {
            this.adjacents_nodes.set(value, new NodeBase(value));
        }
    }

    removeAdjacent(value: any) {
        if (this.adjacents_nodes.has(value)) {
            this.adjacents_nodes.delete(value);
        }

        return this.adjacents.delete(value);
    }
}

export class Graph extends ObservableGraph {
    private nodes: Map<GraphNodePayloadType, GraphNode> = new Map();

    constructor(type: GraphType = GraphType.UNDIRECTED) {
        super(type);
    }

    override empty() { this.nodes.clear(); }
    override isEmpty(): boolean { return this.nodes.size == 0; }
    override find(value: any): GraphNode { return this.nodes.get(value); }
    override accessValue(value: GraphNodePayloadType) {
        let node = this.find(value);

        if (node) {
            this.onAccessNode(node);
        }
    }

    hasDirectedEdges(): boolean { return this.type == GraphType.DIRECTED; }
    
    fromAdjacencyMatrix(matrix: GraphNodePayloadType[][]) {
        for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
            for (let colIndex = this.type == GraphType.UNDIRECTED ? rowIndex : 0; colIndex < matrix[rowIndex].length; colIndex++) {
                let element = matrix[rowIndex][colIndex];
                
                if (element != 0) {
                    this.addEdge(rowIndex, colIndex);
                }
            }
        }
    }

    addVertex(value: GraphNodePayloadType): GraphNode {
        if (this.nodes.has(value)) {
            return this.nodes.get(value);
        }

        const node = new GraphNode(value);
        this.nodes.set(value, node);
        node.setParentGraph(this);
        this.onNodeAdded(node);

        return node;
    }

    removeVertex(value: GraphNodePayloadType) {
        const current = this.nodes.get(value);
        if (current) {
            Array.from(this.nodes.values()).forEach((node) => node.removeAdjacent(current.value));
            this.onNodeRemoved(current);
        }
    }

    addEdge(source: GraphNodePayloadType, destination: GraphNodePayloadType) {
        if (source == undefined || destination == undefined) {
            throw 'You must specify both source and destination';
        }

        const sourceNode = this.addVertex(source);
        const destinationNode = this.addVertex(destination);

        sourceNode.addAdjacent(destinationNode);

        if (this.type === GraphType.UNDIRECTED) {
            destinationNode.addAdjacent(sourceNode);
        }

        this.onEdgeAdded(sourceNode, destinationNode);

        return [sourceNode, destinationNode];
    }

    removeEdge(source: GraphNodePayloadType, destination: GraphNodePayloadType) {
        const sourceNode = this.nodes.get(source);
        const destinationNode = this.nodes.get(destination);

        if (sourceNode && destinationNode) {
            sourceNode.removeAdjacent(destinationNode);

            if (this.type === GraphType.UNDIRECTED) {
                destinationNode.removeAdjacent(sourceNode);
            }

            this.onEdgeRemoved(sourceNode, destinationNode);
        }
    }
}

type NodeMatcherFunc = (node: NodeBase) => boolean;

export class BinaryTree extends ObservableGraph {
    protected root: BinaryTreeNode = undefined;

    constructor(type: GraphType = GraphType.BT) {
        super(type);
    }

    override empty() { this.root = undefined; }
    override isEmpty(): boolean { return this.root == undefined; }
    override find(value: any): BinaryTreeNode {
        return this.findExhaustive(value);
    }
    override accessValue(value: GraphNodePayloadType) {
        let node = this.find(value);

        if (node) {
            this.onAccessNode(node);
        }
    }

    createRoot(value: any): BinaryTreeNode {
        if (this.root)
            return this.root;

        this.root = new BinaryTreeNode(value);
        this.root.setParentGraph(this);
        this.onNodeAdded(this.root);

        return this.root;
    }

    add(valueToAdd: BinaryTreeNode | GraphNodePayloadType, forcedParentValue: GraphNodePayloadType, forcedSideToAdd: ParentSide) {
        let value = (valueToAdd instanceof BinaryTreeNode) ? valueToAdd.value : valueToAdd;

        if (this.root && (forcedParentValue == undefined || forcedSideToAdd == undefined))
            throw 'Adding in binary trees requires specifying the parent and the side to add to'

        if (!this.root) {
            this.root = this.createRoot(value);
            return this.root;
        }

        let foundNode = this.findExhaustive(value, this.root);

        if (foundNode) {
            foundNode.multiplicity = (foundNode.multiplicity || 1) + 1;
            return;
        }

        let futureParent = this.findExhaustive(forcedParentValue, this.root);
        futureParent.createChild(forcedSideToAdd, value);
    }

    remove(value: GraphNodePayloadType) {
        let nodeToRemove = this.findExhaustive(value, this.root);
        this.removeNodeWithParent(nodeToRemove, nodeToRemove ? nodeToRemove.parent : undefined);
    }

    findNodeWithId(id: string): BinaryTreeNode {
        return this.findExhaustiveUtil(this.root, (node: NodeBase) => { return node.id === id; })
    }

    findExhaustive(value: GraphNodePayloadType, node: BinaryTreeNode = this.root): BinaryTreeNode {
        return this.findExhaustiveUtil(node, (node: NodeBase) => { return node.value === value; })
    }

    // PRIVATES

    private findExhaustiveUtil(node: BinaryTreeNode, matcher: NodeMatcherFunc) {
        if (!node)
            return undefined;

        if (matcher(node))
            return node;

        let found: BinaryTreeNode;

        if (node.left)
            found = this.findExhaustiveUtil(node.left, matcher);
        if (node.right && !found)
            found = this.findExhaustiveUtil(node.right, matcher);

        return found;
    }

    protected getLeftmost(node = this.root): BinaryTreeNode {
        if (!node || !node.left) {
            return node;
        }

        return this.getLeftmost(node.left);
    }

    protected removeNodeWithParent(nodeToRemove: BinaryTreeNode, parent: BinaryTreeNode) {
        if (!nodeToRemove)
            return;

        if (nodeToRemove.multiplicity > 1) {
            nodeToRemove.multiplicity -= 1;
            return;
        }        

        this.onNodeRemoved(nodeToRemove);

        // Combine left and right children into one subtree without nodeToRemove
        let childrenOfRemovedNode = nodeToRemove.left;

        if (nodeToRemove.right) {
            const leftmost = this.getLeftmost(nodeToRemove.right);
            leftmost.setChild(ParentSide.LEFT, nodeToRemove.left);
            childrenOfRemovedNode = nodeToRemove.right;
        }

        if (nodeToRemove === this.root) {
            this.root = childrenOfRemovedNode;
            if (this.root) { this.root.parent = null; }
        } else {
            parent.setChild(nodeToRemove.isLeftChild() ? ParentSide.LEFT : ParentSide.RIGHT, childrenOfRemovedNode);
        }        
    }
}

export class BinarySearchTree extends BinaryTree {

    constructor() {
        super(GraphType.BST);
    }

    createNode(value: any): BinaryTreeNode {
        if (!this.root) {
            this.root = new BinaryTreeNode(value);
            this.root.setParentGraph(this);
            this.onNodeAdded(this.root);
            return this.root;
        }

        return new BinaryTreeNode(value);
    }

    override createRoot(_value: any): BinaryTreeNode {
        throw 'Cannot explicitly createRoot in a binary search tree. Use .createNode or .add method instead.'
    }

    override add(valueToAdd: BinaryTreeNode | GraphNodePayloadType) {
        let value = (valueToAdd instanceof BinaryTreeNode) ? valueToAdd.value : valueToAdd;

        if (!this.root) {
            this.root = this.createNode(value);
            return this.root;
        }

        let [foundNode, futureParent] = this.findNodeAndFutureParent(value, this.root);

        if (foundNode) {
            foundNode.multiplicity = (foundNode.multiplicity || 1) + 1;
            return;
        }

        futureParent.createChild(value < futureParent.value ? ParentSide.LEFT : ParentSide.RIGHT, value);
    }

    override remove(value: GraphNodePayloadType) {
        let [nodeToRemove, parent] = this.findNodeAndFutureParent(value, this.root);
        this.removeNodeWithParent(nodeToRemove, parent);
    }

    override find(value: any): BinaryTreeNode {
        return this.findNodeAndFutureParent(value, this.root)[0];
    }

    override accessValue(value: GraphNodePayloadType) {
        let node = this.find(value);

        if (node) {
            this.onAccessNode(node);
        }
    }

    // PRIVATES
    private findNodeAndFutureParent(value: any, node: BinaryTreeNode, parent: BinaryTreeNode = null): [BinaryTreeNode, BinaryTreeNode] {
        if (!node || node.value === value) {
            return [node, parent];
        }

        if (value < node.value) {
            return this.findNodeAndFutureParent(value, node.left, node);
        }

        return this.findNodeAndFutureParent(value, node.right, node);
    }
}