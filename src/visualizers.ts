import { DOMmanipulator } from "./dom-manipulator";
import { Layout } from "./layout";
var MustacheIt = require('mustache');

import { ObservablePrimitiveType, ObservableArrayType, PrimitiveTypeChangeCbk, ArrayTypeChangeCbk, ObjectTypeChangeCbk, ObservableDictionaryType } from "./observable-type.js"

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
    public getHTMLElement(): HTMLElement { return this.htmlElement; }
    public detach() { };

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

    private resetAnimation(text: HTMLElement) {
        text.style.animation = 'none'; text.offsetHeight; text.style.animation = null;
        text.classList.remove('blink'); text.classList.add('blink');
    }

    public fitText(text: HTMLElement, objectToPrint: any, maxWidth: number, maxHeight: number) {
        if (objectToPrint == undefined) {
            text.textContent = '';
            return;
        }

        text.textContent = objectToPrint.toString();
        text.title = text.textContent;
        text.parentElement.title = text.textContent;

        if (text.textContent == "")
            return;

        this.resetAnimation(text);

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

export class PrimitiveTypeVisualizer extends BaseVisualizer implements PrimitiveTypeChangeCbk {
    protected readonly height: number = 35;
    protected readonly width: number = 35;

    protected text: HTMLElement = undefined;
    protected templateDOM: SVGSVGElement = undefined;

    private readonly template: string = '<div class="var-box" style="display: table;"> \
                                           <span id="var-name" class="var-name">{{name}}:</span> \
                                            <span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
                                                <span id="var-value"></span> \
                                            </span> \
                                         </div>';

    constructor(protected observable: ObservablePrimitiveType, protected layout: Layout) {
        super();
    }

    public detach(): void {
        this.observable.unregisterObserver(this);
    }

    onSet(_observable: ObservablePrimitiveType, _currValue: any, newValue: any): void {
        this.fitText(this.text, newValue, this.width, this.height);
    }
    onGet(): void {
    }

    draw() {
        let rendered = MustacheIt.render(this.template, {
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
export class ArrayTypeVisualizer extends BaseVisualizer implements ArrayTypeChangeCbk {
    protected readonly height: number = 40;
    protected readonly width: number = 40;

    private textValueElements: HTMLElement[] = [];

    private readonly template = '<div class="var-box" style="display: table;"> \
                                    <span id="var-name" class="var-name">{{name}}:</span> \
                                    {{#data}} \
                                    <div style="padding-right: 3px; display: table-cell;"> \
                                        <span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
                                            <span id="var-value"></span> \ \
                                        </span> \
                                        <span style="display: table; margin: 0 auto; font-style: italic; font-size: x-small;">{{index}}</span> \
                                    </div> \
                                    {{/data}} \
                                </div>';

    constructor(protected observable: ObservableArrayType, protected layout: Layout) {
        super();
    }

    public detach(): void {
        this.observable.unregisterObserver(this);
    }

    onSetArrayValue(observable: ObservableArrayType, value: any[], newValue: any[]): void {
        if (value.length != newValue.length) {
            this.redraw();
        }
        else {
            for (let [i, v] of newValue.entries()) {
                if (value[i] != newValue[i])
                    this.onSetArrayAtIndex(observable, v, v, i);
            };
        }
    }

    onSetArrayAtIndex(_observable: ObservableArrayType, _oldValue: any, newValue: any, index: number): void {
        if (index < this.textValueElements.length) {
            this.fitText(this.textValueElements[index], newValue, this.width, this.height);
        } else {
            this.redraw();
        }
    }
    onGetArrayAtIndex(_observable: ObservableArrayType, _value: any, _index: number): void {
    }

    private redraw() {
        this.detach();
        this.layout.requestRemove(this.htmlElement);
        this.textValueElements = [];

        this.draw();
    }

    public draw() {
        let rendered = MustacheIt.render(this.template, {
            name: this.observable.name,
            data: this.observable.getValue().map((_v, index) => {
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
        for (let [index, textElement] of this.textValueElements.entries()) {
            this.fitText(textElement, this.observable.getAtIndex(index), this.width, this.height);
        }

        this.observable.registerObserver(this);
    }
}

export class ObjectTypeVisualizer extends BaseVisualizer implements ObjectTypeChangeCbk {
    protected readonly height: number = 40;
    protected readonly width: number = 40;

    private textValueElements: Record<string | number | symbol, HTMLElement> = {};

    private readonly template = '<div class="var-box" style="display: table;"> \
                                    <span id="var-name" class="var-name">{{name}}:</span> \
                                    {{#data}} \
                                    <div style="padding-right: 3px; display: table-cell;"> \
                                        <span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
                                            <span id="var-value"></span> \ \
                                        </span> \
                                        <span style="display: table; margin: 0 auto; font-style: italic; font-size: x-small;">{{index}}</span> \
                                    </div> \
                                    {{/data}} \
                                </div>';

    constructor(protected observable: ObservableDictionaryType, protected layout: Layout) {
        super();
    }
    onSetObjectValue(observable: ObservableDictionaryType, value: any, newValue: any): void {
        if (Object.keys(value).length != Object.keys(newValue).length) { // TODO: Check key match in totality
            this.redraw();
        }
        else {
            for (let key of Object.keys(newValue)) {
                if (value[key] != newValue[key])
                    this.onSetObjectProperty(observable, value[key], newValue[key], key);
            };
        }
    }
    onSetObjectProperty(observable: ObservableDictionaryType, _value: any, newValue: any, key: string | number | symbol): void {
        if (key in this.textValueElements) {
            this.fitText(this.textValueElements[key], newValue, this.width, this.height);
        } else {
            this.redraw();
        }
    }
    onGetObjectProperty(observable: ObservableDictionaryType, value: any, key: string | number | symbol): void {
        throw new Error("Method not implemented.");
    }

    public detach(): void {
        this.observable.unregisterObserver(this);
    }

    private redraw() {
        this.detach();
        this.layout.requestRemove(this.htmlElement);
        this.textValueElements = {};

        this.draw();
    }

    public draw() {
        let rendered = MustacheIt.render(this.template, {
            name: this.observable.name,
            data: this.observable.getKeys().map(key => {
                return {
                    width: this.width, height: this.height,
                    index: key
                };
            }),
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.layout.requestAppend(this.htmlElement);

        let domIndex = 0;
        let domElements = DOMmanipulator.elementsStartsWithId<HTMLElement>(this.htmlElement, 'var-value');                
        for (let key of this.observable.getKeys()) {
            this.textValueElements[key] = domElements[domIndex++];
            this.fitText(this.textValueElements[key], this.observable.getAtIndex(key), this.width, this.height);
        }

        this.observable.registerObserver(this);
    }
}