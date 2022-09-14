import { DOMmanipulator } from "./dom-manipulator.js";
import { Layout } from "./layout.js";
import { MustacheIt } from "../main.js"

import { ObservablePrimitiveType, ObservableArrayType, PrimitiveTypeChangeCbk, ArrayTypeChangeCbk } from "./observable-type.js"

class FontSizeCache {
    private static cache: any = {}; // elementId: { textLength : fontSize }

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
    protected htmlElement: HTMLElement = undefined;

    public draw() { };
    public getHTMLElement() : HTMLElement { return this.htmlElement; }

    public textWidth(text: HTMLElement): { w: number, h: number } {
        let fontFamily = window.getComputedStyle(text, null).getPropertyValue('font-family');
        let fontSize = window.getComputedStyle(text, null).getPropertyValue('font-size');

        let textContent = text.textContent;

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        ctx.font = fontSize + " " + fontFamily;

        let metrics = ctx.measureText(textContent);
        let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        //let actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        let w = metrics.width, h = fontHeight;

        return { w, h };
    }

    public fitText(text: HTMLElement, objectToPrint: any, maxWidth: number, maxHeight: number) {
        if (objectToPrint == undefined)
            return;

        text.textContent = objectToPrint.toString();

        if (text.textContent == "")
            return;

        let cachedFontSizeForNewValue = FontSizeCache.getFontSize(text.id, text.textContent);
        let currentFontSize = Number.parseInt(window.getComputedStyle(text, null).getPropertyValue('font-size'));

        if (cachedFontSizeForNewValue > 0 && cachedFontSizeForNewValue == currentFontSize) {
            return;
        }

        let directionToBounds = (w: number, h: number) => {
            let paddingPercent = 1.1;
            w *= paddingPercent; h *= paddingPercent;

            if (w > maxWidth || h > maxHeight)
                return -1;
            if (w < maxWidth && h < maxHeight)
                return 1;

            return 0;
        };

        let wh = this.textWidth(text);
        let currDirectionToBounds = directionToBounds(wh.w, wh.h);

        if (currDirectionToBounds == 0) {
            return;
        }

        let newFontSize = currentFontSize;

        do {
            newFontSize += currDirectionToBounds
            text.style.fontSize = newFontSize + "px";

            wh = this.textWidth(text);
        } while (directionToBounds(wh.w, wh.h) == currDirectionToBounds);

        FontSizeCache.setFontSize(text.id, text.textContent, newFontSize);
    }
}

export class PrimitiveTypeVisualizer<Type> extends BaseVisualizer implements PrimitiveTypeChangeCbk<Type>{
    protected readonly height: number = 35;
    protected readonly width: number = 35;

    protected text: HTMLElement = undefined;
    protected templateDOM: SVGSVGElement = undefined;

    private readonly template: string = '<div class="var-box" style="display: table;"> \
                                           <span id="var-name" class="var-name">{{name}}:</span> \
                                            <span id="var-value" class="var-value" style="width: {{width}}px; height:{{height}}px;"></span> \
                                         </div>';

    constructor(protected observable: ObservablePrimitiveType<Type>, protected layout: Layout) {
        super();
    }
    onSet(_observable: ObservablePrimitiveType<Type>, _currValue: Type, newValue: Type): void {
        this.fitText(this.text, newValue, this.width, this.height);
    }
    onGet(): void {
    }

    draw() {
        let rendered = MustacheIt(this.template, {
            name: this.observable.name,
            width: this.width, height: this.height
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.layout.requestAppend(this.htmlElement);

        this.text = DOMmanipulator.elementStartsWithId<HTMLElement>(this.htmlElement, 'var-value');
        this.fitText(this.text, this.observable.getValue(), this.text.clientWidth, this.text.clientHeight);

        this.observable.registerObserver(this);
    }
}

// ARRAY
export class ArrayTypeVisualizer<Type> extends BaseVisualizer implements ArrayTypeChangeCbk<Type> {
    protected readonly height: number = 40;
    protected readonly width: number = 40;

    private textValueElements: HTMLElement[] = [];

    private readonly template = '<div class="var-box" style="display: table;"> \
                                    <span id="var-name" class="var-name">{{name}}:</span> \
                                    {{#data}} \
                                    <div style="padding-right: 3px; display: table-cell;"> \
                                        <span id="var-value" class="var-value" style="width: {{width}}px; height:{{height}}px;"></span> \
                                        <span style="display: table; margin: 0 auto;">{{index}}</span> \
                                    </div> \
                                    {{/data}} \
                                </div>';

    constructor(protected observable: ObservableArrayType<Type>, protected layout: Layout) {
        super();
    }    

    onSetValues(observable: ObservableArrayType<Type>, value: Type[], newValue: Type[]): void {
        this.redraw();
    }

    onSetAtIndex(_observable: ObservableArrayType<Type>, _oldValue: Type, newValue: Type, index: number): void {
        if (index < this.textValueElements.length) {
            this.fitText(this.textValueElements[index], newValue, this.width, this.height);
        } else {
            this.redraw();
        }
    }
    onGetAtIndex(_observable: ObservableArrayType<Type>, _value: Type, _index: number): void {
    }

    private redraw() {
        this.layout.requestRemove(this.htmlElement);
        this.textValueElements = [];
        this.observable.unregisterObserver(this);

        this.draw();
    }

    public draw() {
        let rendered = MustacheIt(this.template, {
            name: this.observable.name,
            data: this.observable.getValues().map((_v, index) => {
                return {
                    width: this.width, height: this.height,
                    index: index
                };
            }),
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.layout.requestAppend(this.htmlElement);

        this.textValueElements = this.textValueElements.concat(DOMmanipulator.elementsStartsWithId<HTMLElement>(this.htmlElement, 'var-value'));
        this.textValueElements.forEach((textElement, index) =>
            this.fitText(textElement, this.observable.getAtIndex(index), this.width, this.height)
        );

        this.observable.registerObserver(this);
    }
}