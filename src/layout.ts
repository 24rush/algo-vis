import { ObservableArrayType, ObservablePrimitiveType, ObservableTypes } from "./observable-type.js";
import { ArrayTypeVisualizer, BaseVisualizer, PrimitiveTypeVisualizer } from "./visualizers.js";

export class Layout {
    constructor(protected x: number, protected y: number, protected scene: HTMLElement) {
    }

    private observableToPrimitive: any = {}; // {key = scope.varname, {Visualizer, HTMLElement}}

    requestAppend(element: HTMLElement) {
        this.scene.append(element);
    }

    requestRemove(element: HTMLElement) {
        this.scene.removeChild(element);
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

        this.observableToPrimitive[key] = visualizer;
        visualizer.draw();
    }

    public remove(scopeName: string, observable: any) {
        let key = scopeName + "." + observable.name;
        if (!(key in this.observableToPrimitive))
            return;
            
        let visualizer = this.observableToPrimitive[key];        
        this.requestRemove(visualizer.getHTMLElement());
    }
}