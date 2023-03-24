
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
        this.setElementAttr(newElem, props);

        return newElem;
    }

    static createSvg(props: any = undefined) : SVGSVGElement
    {
        const svg = this.createElementSvgNS("svg") as SVGSVGElement;
        this.setElementAttr(svg, props);

        return svg;
    }

    static createDiv(props: any = undefined) : HTMLElement
    {
        return this.createElement('div', props);
    }

    static createSpan(props: any = undefined) : HTMLElement
    {
        return this.createElement('span', props);
    }

    static createCircle(props: any = undefined) : SVGCircleElement
    {
        const circle = this.createElementSvgNS("circle") as SVGCircleElement;
        this.setElementAttr(circle, props);
         
        return circle;
    }
    
    static createRect(props: any = undefined) : SVGRectElement
    {
        const rect = this.createElementSvgNS("rect") as SVGRectElement;
        this.setElementAttr(rect, props);
         
        return rect;
    }

    static createText(text : string, props: any = undefined) : SVGTextElement
    {
        let newElem = this.createElementSvgNS("text") as SVGTextElement;
        this.setElementAttr(newElem, props);

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
    static setElementAttr(htmlElement : Element, props : any = undefined)
    {
        if (!props)
            return;

        for (let prop in props)
        {
            htmlElement.setAttribute(prop, props[prop]);
        }

        return htmlElement;
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

    static svgFromTemplate(templateStr: string) : SVGSVGElement
    {
        let templateElement = this.createSvg();
        templateElement.innerHTML = templateStr;

        return templateElement;
    }

    static fromTemplate(templateStr: string) : HTMLElement 
    {
        let templateElement = document.createElement('div');
        templateElement.innerHTML = templateStr.trim();

        return templateElement.firstChild as HTMLElement;
    }

    static elemsFromTemplate(templateStr: string) : HTMLCollection
    {
        let templateElement = document.createElement('div');
        templateElement.innerHTML = templateStr.trim();

        return templateElement.children;
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

    static elementStartsWithId(parent: HTMLElement, id: string) : HTMLElement
    {
        return this.elementsStartsWithId<HTMLElement>(parent, id)[0];
    }

    static elementsStartsWithId<Type>(parent: HTMLElement, id: string) : Type[] 
    {
        let elements = [];
        for (let element of parent.querySelectorAll("[id^=" + id + "]"))
        {
            elements.push(element as unknown as Type);
        }

        return elements;
    }
}
