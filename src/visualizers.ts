import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
var MustacheIt = require('mustache');

import { ObservableVariable, VariableChangeCbk } from "./observable-type"

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

enum DrawnElement {
    undefined,
    Primitive,
    Array,
    Object,
    Reference
}

export class VariableVisualizer extends VariableChangeCbk {
    protected readonly templateVarName ='<div class="var-box" style="display: table;"> \
    <span id="var-name" class="var-name">{{name}}:</span> \
    </div> \
    ';
    
    protected readonly templateReference: string = 
    '<span class="var-value" style="border:0px; height:{{height}}px;"> \
         <span id="var-value" style="font-style: italic;"></span> \
     </span>';

    protected readonly templatePrimitive: string = 
    '<span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
         <span id="var-value"></span> \
     </span>';

    protected readonly templateArray = '<span> \
    {{#data}} \
        <div style="padding-right: 3px; display: table-cell;"> \
            <span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
                <span id="var-value"></span> \ \
            </span> \
            <span style="display: table; margin: 0 auto; font-style: italic; font-size: x-small;">{{index}}</span> \
        </div> \
    {{/data}} \
    </span>';

    protected readonly templateObject = '<span> \
    {{#data}} \
        <div style="padding-right: 3px; display: table-cell;"> \
            <span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
                <span id="var-value"></span> \ \
            </span> \
            <span style="display: table; margin: 0 auto; font-style: italic; font-size: x-small;">{{index}}</span> \
        </div> \
    {{/data}} \
    </span>';

    protected readonly height: number = 35;
    protected readonly width: number = 35;

    protected htmlElement: HTMLElement = undefined;
    protected keyValueElements: Record<string | number | symbol, HTMLElement> = {};
    protected indextValueElements: HTMLElement[] = [];
    protected text: HTMLElement = undefined;

    protected drawn: boolean = false;
    protected drawnElement: DrawnElement = DrawnElement.undefined;

    constructor(protected observable: ObservableVariable) {
        super();    

        this.observable.registerObserver(this);
    }

    public getHTMLElement(): HTMLElement { return this.htmlElement; }

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

    public fitText(text: HTMLElement, objectToPrint: any, maxWidth: number, maxHeight: number, disableAutoResize : boolean = false) {
        if (objectToPrint == undefined) {
            text.textContent = 'undefined';
            this.resetAnimation(text);        
            return;
        }

        text.textContent = objectToPrint.toString();        
        text.title = text.textContent;
        text.parentElement.title = text.textContent;

        if (text.textContent == "")
            return;

        this.resetAnimation(text);        

        if (disableAutoResize) 
            return;

        let cachedFontSizeForNewValue = FontSizeCache.getFontSize(text.id, text.textContent);
        let currentFontSize = Number.parseInt(window.getComputedStyle(text, null).getPropertyValue('font-size'));
        if (!currentFontSize || currentFontSize == NaN) currentFontSize = 15;
        
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

    public detach(): void {
        this.observable.unregisterObserver(this);
    }

    public draw() : HTMLElement {
        let rendered = MustacheIt.render(this.templateVarName, {
            name: this.observable.name,
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);        
        
        return this.htmlElement;
    }

    public drawReference() {
        let rendered = MustacheIt.render(this.templateReference, {
            width: 30, height: 30
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);
        
        this.htmlElement.append(valuesHtmlElement);        

        this.text = DOMmanipulator.elementStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value');
        this.fitText(this.text, Localize.str(9) + " " + this.referenceToUIStr(this.observable.getValue()), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);

        this.drawn = true;
        this.drawnElement = DrawnElement.Reference;        
    }

    private needsDraw() : boolean {
        return !this.drawn;
    }

    private needsRedraw(requestedDraw: DrawnElement) : boolean {
        if (!this.drawn)
            return true;

        if (this.drawn && this.drawnElement != requestedDraw)
            return true;

        return false;
    }

    private referenceToUIStr(reference: string) : string {
        return reference.replace("global.", '');
    }

    private redraw(redrawType: DrawnElement) {        
        this.htmlElement.removeChild(this.htmlElement.lastChild as HTMLElement);

        this.keyValueElements = {};
        this.indextValueElements = [];
        this.keyValueElements = {};
        this.text = undefined;

        if (redrawType == DrawnElement.Primitive) this.drawPrimitive();
        if (redrawType == DrawnElement.Array) this.drawArray();
        if (redrawType == DrawnElement.Object) this.drawObject();
        if (redrawType == DrawnElement.Reference) this.drawReference();
    }

    private drawPrimitive() {
        let rendered = MustacheIt.render(this.templatePrimitive, {
            width: 30, height: 30
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);
        
        this.htmlElement.append(valuesHtmlElement);

        this.text = DOMmanipulator.elementStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value');
        this.fitText(this.text, this.observable.getValue(), this.htmlElement.clientWidth, this.htmlElement.clientHeight);

        this.drawn = true;
        this.drawnElement = DrawnElement.Primitive;
    }

    private drawArray() {
        let rendered = MustacheIt.render(this.templateArray, {
            data: (this.observable.getValue() as any[]).map((_v, index) => { //TODO                
                return {
                    width: this.width, height: this.height,
                    index: index
                };
            }),
        });
        
        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        this.indextValueElements = this.indextValueElements.concat(DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value'));
        for (let [index, textElement] of this.indextValueElements.entries()) {
            this.fitText(textElement, this.observable.getAtIndex(index), this.width, this.height);
        }        

        this.drawn = true;
        this.drawnElement = DrawnElement.Array;
    }

    private drawObject() {
        let rendered = MustacheIt.render(this.templateObject, {
            data: this.observable.getKeys().map(key => {
                return {
                    width: this.width, height: this.height,
                    index: key
                };
            }),
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        let domIndex = 0;
        let domElements = DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value');        

        for (let key of this.observable.getKeys()) {
            this.keyValueElements[key] = domElements[domIndex++];
            this.fitText(this.keyValueElements[key], this.observable.getAtIndex(key), this.width, this.height);
        }

        this.drawn = true;
        this.drawnElement = DrawnElement.Object;
    }

    override onSetReferenceEvent(_observable: ObservableVariable, oldReference: string, newReference: any): void {        
        if (this.needsRedraw(DrawnElement.Reference)) {
            this.redraw(DrawnElement.Reference);

            return;
        }

        if (this.needsDraw()) {
            this.drawReference();
        }
        else            
            this.fitText(this.text, Localize.str(9) + " " + this.referenceToUIStr(newReference), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);
    }

    override onSetEvent(_observable: ObservableVariable, _currValue: any, newValue: any): void {        
        if (this.needsRedraw(DrawnElement.Primitive)) {
            this.redraw(DrawnElement.Primitive);

            return;
        }
        
        if (this.needsDraw()) {
            this.drawPrimitive();
        }
        else
            this.fitText(this.text, newValue, this.width, this.height);
    }

    override onSetArrayValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        if (this.needsRedraw(DrawnElement.Array)) {
            this.redraw(DrawnElement.Array);
            return;
        }        
        
        if (value.length != newValue.length) {
            this.redraw(DrawnElement.Array);
        }
        else {
            for (let [i, v] of newValue.entries()) {
                if (value[i] != newValue[i])
                    this.onSetArrayAtIndexEvent(observable, v, v, i);
            };
        }
    }

    override onSetArrayAtIndexEvent(_observable: ObservableVariable, _oldValue: any, newValue: any, index: number): void {
        if (index < this.indextValueElements.length) {
            this.fitText(this.indextValueElements[index], newValue, this.width, this.height);
        } else {
            this.redraw(DrawnElement.Array);
        }
    }

    override onSetObjectValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        if (this.needsRedraw(DrawnElement.Object)) {
            this.redraw(DrawnElement.Object);
            return;
        }

        if (Object.keys(value).length != Object.keys(newValue).length) { // TODO: Check key match in totality
            this.redraw(DrawnElement.Object);
        }
        else {
            for (let key of Object.keys(newValue)) {
                if (value[key] != newValue[key])
                    this.onSetObjectPropertyEvent(observable, value[key], newValue[key], key);
            };
        }
    }

    override onSetObjectPropertyEvent(_observable: ObservableVariable, _value: any, newValue: any, key: string | number | symbol): void {            
        if (key in this.keyValueElements) {            
            this.fitText(this.keyValueElements[key], newValue, this.width, this.height);
        } else {
            this.redraw(DrawnElement.Object);
        }
    }
}