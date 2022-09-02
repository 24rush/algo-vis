import { BaseVisualizer, PrimitiveTypeVisualizer } from "./visualizers";

export class Layout
{
    protected currentDomRect : DOMRect = undefined;

    constructor(protected x: number, protected y: number, protected scene : SVGSVGElement) {
        this.currentDomRect = new DOMRect(x, y, 0, 0);
    }

    requestAppend(element : SVGElement) {
        this.scene.append(element);
    }

    requestRemove(element: SVGElement) {
        this.scene.removeChild(element);
    }

    first(visualizer : BaseVisualizer) {        
        visualizer.draw(this.currentDomRect, this);
        this.currentDomRect = visualizer.getBBox();    
    }

    below(visualizer : BaseVisualizer) {        
        this.currentDomRect.y = (this.currentDomRect.bottom);

        visualizer.draw(this.currentDomRect, this);
        this.currentDomRect = visualizer.getBBox();
    }

    right(visualizer : BaseVisualizer) {
        this.currentDomRect.x = (this.currentDomRect.right);        

        visualizer.draw(this.currentDomRect, this);
        this.currentDomRect = visualizer.getBBox();
    }
}