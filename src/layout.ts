import { ObservableArrayType, ObservablePrimitiveType, ObservableTypes } from "./observable-type.js";
import { ArrayTypeVisualizer, BaseVisualizer, PrimitiveTypeVisualizer } from "./visualizers.js";

export class Layout {
    constructor(protected scene: HTMLElement) {
    }

    private observableToPrimitive: any = {}; // {key = scope.varname, {Visualizer}}

    clearAll() {
        for (let key of Object.keys(this.observableToPrimitive)) {
            this.detachElement(this.observableToPrimitive[key]);            
        };

        this.observableToPrimitive = {};
    }

    requestAppend(element: HTMLElement) {
        this.scene.append(element);
    }

    requestRemove(element: HTMLElement) {        
        for (let key of Object.keys(this.observableToPrimitive)) {
            let visualizer = this.observableToPrimitive[key];
            if (visualizer.getHTMLElement() == element) {
                this.detachElement(visualizer);
                delete this.observableToPrimitive[key];

                break;
            }
        }
    }

    private detachElement(visualizer: any) {
        visualizer.detach();
        this.scene.removeChild(visualizer.getHTMLElement());
    }

    public add(scopeName: string, observable: any) {
        let key = scopeName + "." + observable.name;

        if (key in this.observableToPrimitive)
            return;

        let visualizer;
        if (observable instanceof ObservablePrimitiveType)
            visualizer = new PrimitiveTypeVisualizer(observable, this);
        if (observable instanceof ObservableArrayType)
            visualizer = new ArrayTypeVisualizer(observable, this);

        visualizer.draw();
        this.observableToPrimitive[key] = visualizer;        
    }

    public remove(scopeName: string, observable: any) {
        let key = scopeName + "." + observable.name;
        if (!(key in this.observableToPrimitive))
            return;
            
        let visualizer = this.observableToPrimitive[key];        
        this.requestRemove(visualizer.getHTMLElement());
    }
}