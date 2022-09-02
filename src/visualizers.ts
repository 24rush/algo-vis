import { DOMmanipulator, PropCreator } from "./dom-manipulator.js";
import { Layout } from "./layout.js";
import { ObservablePrimitiveType, ObservableArrayType, PrimitiveTypeChangeCbk, ArrayTypeChangeCbk } from "./observable-type.js"

class FontSizeCache {
    // elementId: { textLength : fontSize }
    public static cache: any = {};

    public static getFontSize(id: string, text: string): number {
        if (id in this.cache && text.length in this.cache[id])
            return this.cache[id][text.length];

        return 0;
    }

    public static setFontSize(id: string, text: string, fontSize: number) {
        if (!(id in this.cache))
            this.cache[id] = {};

        this.cache[id][text.length] = fontSize;
    }
}

export class BaseVisualizer {
    protected svgElement: SVGSVGElement = undefined;

    public getBBox(): DOMRect {
        return this.svgElement.getBoundingClientRect();
    }

    public draw(startXY: DOMRect, layout: Layout) { };

    public fitText(text: SVGTextElement, textValue: string, maxWidth: number, maxHeight: number) {
        text.textContent = textValue;

        if (text.textContent == "")
            return;

        let fontSizeForNewValue = FontSizeCache.getFontSize(text.id, textValue);
        let currentFontSize = Number.parseInt(text.getAttribute('font-size') ?? '14');

        if (fontSizeForNewValue > 0 && fontSizeForNewValue == currentFontSize) {
            return;
        }

        let directionToBounds = (w: number, h: number) => {
            let paddingPercent = 1.2;
            w *= paddingPercent; h *= paddingPercent;

            if (w > maxWidth || h > maxHeight)
                return -1;
            if (w < maxWidth && h < maxHeight)
                return 1;

            return 0;
        };

        let currBbox = text.getBBox();
        let currDirectionToBounds = directionToBounds(currBbox.width, currBbox.height);

        if (currDirectionToBounds == 0) {
            return;
        }

        let newFontSize = currentFontSize;

        do {
            DOMmanipulator.setSvgElementAttr(text, PropCreator.fontSize(newFontSize += currDirectionToBounds));
            currBbox = text.getBBox();
        } while (directionToBounds(currBbox.width, currBbox.height) == currDirectionToBounds);

        FontSizeCache.setFontSize(text.id, text.textContent, newFontSize);
    }

    public MustacheIt(textTemplate: string, props: any = undefined) : string {
        //@ts-ignore
        return Mustache.render(textTemplate, props);
    }

    public getTextLength(textTemplate: string, layout: Layout, props: any = undefined): number {
        let svg = DOMmanipulator.fromTemplate(this.MustacheIt(textTemplate, props));
        svg.setAttribute('x', '10000');
        layout.requestAppend(svg);

        let textLength = svg.getBBox().width;
        layout.requestRemove(svg);

        return textLength;
    }
}

export class PrimitiveTypeVisualizer<Type> extends BaseVisualizer implements PrimitiveTypeChangeCbk<Type>{
    protected readonly height: number = 40;
    protected readonly width: number = 40;
    protected x: number = 0
    protected y: number = 0;

    protected text: SVGTextElement = undefined;
    protected animRead: SVGAnimateElement = undefined;
    protected animWrite: SVGAnimateElement = undefined;

    protected templateDOM: SVGSVGElement = undefined;

    private readonly template: string = '<text id="var-name" x="0" y="{{p_name_y}}" {{&nametext_style}}>{{name}}:</text> \
                                         <svg x="{{p_value_x}}" y="{{p_value_y}}" width="{{width}}" height="{{height}}"> \
                                            <rect {{&valuerect_style}}> \
                                            <animate id="var-anim-read" \
                                            attributeName="fill"\
                                            values="#0C4;#0C4;#0E4;#0E4"\
                                            dur="0.2s"\
                                            repeatCount="3"/>\
                                            <animate id="var-anim-write" \
                                            attributeName="fill"\
                                            values="#C24;#C24;#C54;#C54"\
                                            dur="0.2s"\
                                            repeatCount="3"/>\
                                            </rect> \
                                            <text id="var-value" {{&valuetext_style}}></text> \
                                         </svg>';

    protected nameText_style: string = 'text-anchor="left" dominant-baseline="middle" font-size="20"';
    protected valueRect_style: any = 'width="100%" height="100%" stroke="black" fill="none"';
    protected valueText_style: any = 'x="50%" y="50%" text-anchor="middle" dominant-baseline="central"';

    constructor(protected observable: ObservablePrimitiveType<Type>) {
        super();
    }
    onSet(observable: ObservablePrimitiveType<Type>, value: Type, newValue: Type): void {
        this.fitText(this.text, newValue.toString(), this.width, this.height);
        this.animWrite.beginElement();
    }
    onGet(): void {
        this.animRead.beginElement();
    }

    draw(startXY: DOMRect, layout: Layout): void {
        let textElementStr = DOMmanipulator.extractElementFromTemplateStr(this.template, "var-name");
        let nameTextOffset = this.getTextLength(textElementStr, layout, {
            name: this.observable.name,
            nametext_style: this.nameText_style,
        }) + 5;

        let rendered = this.MustacheIt(this.template, {
            name: this.observable.name,

            p_name_x: startXY.x, p_name_y: startXY.y + this.height / 2,
            p_value_x: nameTextOffset, p_value_y: startXY.y,

            width: this.width, height: this.height, font_size: this.height,

            nametext_style: this.nameText_style,
            valuerect_style: this.valueRect_style,
            valuetext_style: this.valueText_style,
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.svgElement = DOMmanipulator.fromTemplate(indexedTemplate);

        layout.requestAppend(this.svgElement);

        this.text = DOMmanipulator.elementStartsWithId<SVGTextElement>(this.svgElement, 'var-value');
        this.fitText(this.text, this.observable.getValue().toString(), this.width, this.height);

        this.animRead = DOMmanipulator.elementStartsWithId<SVGAnimateElement>(this.svgElement, "var-anim-read");
        this.animWrite = DOMmanipulator.elementStartsWithId<SVGAnimateElement>(this.svgElement, "var-anim-write");

        this.observable.registerObserver(this);
    }
}

// ARRAY
export class ArrayTypeVisualizer<Type> extends BaseVisualizer implements ArrayTypeChangeCbk<Type> {
    protected readonly height: number = 40;
    protected readonly width: number = 40;
    private textValueElements: SVGTextElement[] = [];
    protected animRead: SVGAnimateElement[] =[];
    protected animWrite: SVGAnimateElement[] = [];

    protected readonly padding: number = -1;

    private readonly template = '<text id="var-name" x="0" y="{{p_name_y}}" {{&nametext_style}}>{{name}}:</text> \
                                 {{#data}} \
                                 <text x="{{index_x}}" y="{{index_y}}" {{&indextext_style}}>{{index}}</text> \
                                 <svg x="{{x}}" y="{{y}}" width="{{width}}" height="{{height}}"> \
                                    <rect {{&valuerect_style}}> \
                                    <animate id="var-anim-read" \
                                            attributeName="fill"\
                                            values="#0C4;#0C4;#0E4;#0E4"\
                                            dur="0.2s"\
                                            repeatCount="3"/>\
                                    <animate id="var-anim-write" \
                                            attributeName="fill"\
                                            values="#C24;#C24;#C54;#C54"\
                                            dur="0.2s"\
                                            repeatCount="3"/>\</rect> \
                                    <text id="var-value" {{&valuetext_style}}"></text> \
                                 </svg> \
                                 {{/data}}';

    protected indexText_style: string = 'text-anchor="middle" dominant-baseline="hanging" font-size="10" font-style="italic"';
    protected nameText_style: string = 'text-anchor="left" dominant-baseline="middle" font-size="20"';
    protected valueRect_style: any = 'width="100%" height="100%" stroke="black" fill="none"';
    protected valueText_style: any = 'x="50%" y="50%" text-anchor="middle" dominant-baseline="central"';

    constructor(protected observable: ObservableArrayType<Type>) {
        super();
    }
    onSetAtIndex(observable: ObservableArrayType<Type>, oldValue: Type, newValue: Type, index: number): void {
        this.fitText(this.textValueElements[index], newValue.toString(), this.width, this.height);
        this.animWrite[index].beginElement();
    }
    onGetAtIndex(observable: ObservableArrayType<Type>, value: Type, index: number): void {
        this.animRead[index].beginElement();
    }

    draw(startXY: DOMRect, layout: Layout) {
        let textElement = DOMmanipulator.extractElementFromTemplateStr(this.template, "var-name");
        let nameTextOffset = this.getTextLength(textElement, layout, {
            name: this.observable.name,
            nametext_style: this.nameText_style,
        }) + 5;

        let array_context_data = [];
        let index = 0;
        for (let element of this.observable.getValues()) {
            let context_data = {
                x: nameTextOffset + (this.padding + this.width) * index, y: startXY.y,

                width: this.width, height: this.height,

                index_x: nameTextOffset + this.width / 2 + (this.padding + this.width) * index,
                index_y: startXY.y + 3 + this.height,

                indextext_style: this.indexText_style,
                valuerect_style: this.valueRect_style,
                valuetext_style: this.valueText_style,

                index: index
            };

            array_context_data.push(context_data);

            index++;
        }

        let rendered = this.MustacheIt(this.template, {
            name: this.observable.name,
            p_name_x: startXY.x, p_name_y: startXY.y + this.height / 2,
            nametext_style: this.nameText_style,
            data: array_context_data,
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.svgElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.textValueElements = this.textValueElements.concat(DOMmanipulator.elementsStartsWithId<SVGTextElement>(this.svgElement, 'var-value'));

        this.animRead = this.animRead.concat(DOMmanipulator.elementsStartsWithId<SVGAnimateElement>(this.svgElement, "var-anim-read"));
        this.animWrite = this.animWrite.concat(DOMmanipulator.elementsStartsWithId<SVGAnimateElement>(this.svgElement, "var-anim-write"));

        layout.requestAppend(this.svgElement);

        // Fit array values to rect boxes
        index = 0;
        for (let elem of this.textValueElements) {
            this.fitText(elem, this.observable.getAtIndex(index++).toString(), this.width, this.height);
        }
        this.observable.registerObserver(this);
    }
}