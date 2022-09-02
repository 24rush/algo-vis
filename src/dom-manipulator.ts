
export class PropCreator
{
    static fontSize(fontSize:number) {
        return {"font-size" : fontSize};
    }
}

export class DOMmanipulator
{
    // INDEXES
    static ids_added_index = 0;
    static addIndexesToIds(template: string) : string
    {
        var doc = new DOMParser().parseFromString(template, "text/html")
        let elementsWithId = doc.querySelectorAll("[id]")
        for (let element of elementsWithId) {            
            element.setAttribute('id', element.getAttribute('id') + this.ids_added_index.toString());
            this.ids_added_index++;
        }

        return doc.body.innerHTML;
    }

    // CREATORS
    static createElementSvgNS(type : string, props : any = undefined) : SVGElement
    {
        let newElem = document.createElementNS("http://www.w3.org/2000/svg", type);
        this.setSvgElementAttr(newElem, props);

        return newElem;
    }

    static createSvg(props: any = undefined) : SVGSVGElement
    {
        const svg = this.createElementSvgNS("svg") as SVGSVGElement;
        this.setSvgElementAttr(svg, props);

        return svg;
    }

    static createCircle(props: any = undefined) : SVGCircleElement
    {
        const circle = this.createElementSvgNS("circle") as SVGCircleElement;
        this.setSvgElementAttr(circle, props);
         
        return circle;
    }
    
    static createRect(props: any = undefined) : SVGRectElement
    {
        const rect = this.createElementSvgNS("rect") as SVGRectElement;
        this.setSvgElementAttr(rect, props);
         
        return rect;
    }

    static createText(text : string, props: any = undefined) : SVGTextElement
    {
        let newElem = this.createElementSvgNS("text") as SVGTextElement;
        this.setSvgElementAttr(newElem, props);

        newElem.textContent = text;

        return newElem;
    }

    static createElement(type : string, props: any = undefined ) : HTMLElement
    {
        let newElem = document.createElement(type);
        for (let prop in props)
        {
            newElem.setAttribute(prop, props[prop]);
        }

        return newElem;
    }

    // SETTERS
    static setSvgElementAttr(svgElement : Element, props : any = undefined)
    {
        if (!props)
            return;

        for (let prop in props)
        {
            svgElement.setAttribute(prop, props[prop]);
        }

        return svgElement;
    }

    static setElementIdAttr(id : string, props : any = undefined)
    {
        if (!props)
            return;

        let svgElement = document.getElementById(id);

        if (!svgElement)
            return;

        for (let prop in props)
        {
            svgElement.setAttribute(prop, props[prop]);
        }

        return svgElement;
    }

    static fromTemplate(templateStr: string) : SVGSVGElement
    {
        let templateElement = this.createSvg();
        templateElement.innerHTML = templateStr;

        return templateElement;
    }

    static generatedElement_Index: number = 0;

    static extractElementFromTemplateStr(template: string, id: string) : string
    {
        var doc = new DOMParser().parseFromString(template, "text/html");
        return doc.getElementById(id).outerHTML;
    }

    static textElementFromTemplate(template: SVGSVGElement, templateId: string) : SVGTextElement
    {
        let textElement = template.getElementById(templateId) as SVGTextElement;
        textElement.setAttribute('id', templateId + DOMmanipulator.generatedElement_Index++);

        return textElement;
    }

    static svgElementFromTemplate(template: SVGSVGElement, templateId: string) : SVGElement
    {
        let svgElement = template.getElementById(templateId) as SVGElement;

        return svgElement;
    }

    static elementStartsWithId<Type>(parent: SVGSVGElement, id: string) : Type 
    {
        return this.elementsStartsWithId<Type>(parent, id)[0];
    }

    static elementsStartsWithId<Type>(parent: SVGSVGElement, id: string) : Type[] 
    {
        let elements = [];
        for (let element of parent.querySelectorAll("[id^=" + id + "]"))
        {
            elements.push(element as unknown as Type);
        }

        return elements;
    }
}
