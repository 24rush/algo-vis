import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
var MustacheIt = require('mustache');

import { ObservableVariable, VariableChangeCbk } from "./observable-type"
import { clientViewModel, ObservableViewModel, UIBinder } from "./ui-framework";

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
    protected readonly templateVarName = 
    '<div class="var-box" style="display: table;"> \
        <span id="var-name" class="align-self-center p-2 var-name" style="display: table-cell;">{{name}}:</span> \
    </div> \
    ';

    protected readonly templateReference: string =
    '<span class="var-value" style="border:0px; height:{{height}}px;"> \
        <span style="font-style: italic;" av-bind-text="LangStrId.9"></span><span id="var-value"></span> \
     </span>';

    protected readonly templatePrimitive: string =
    '<span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
         <span id="var-value"></span> \
     </span>';

    protected readonly templateArray = '<span style="display: table;"> \
    {{#rows}} \
        <div style="padding-left:7px; display: table-row;">\
        <span class="align-self-baseline" av-bind-style-display=\'{"isMultiArray" : "table-cell", "!isMultiArray" : "none"}\' style="font-style: italic; font-size: x-small;">{{index_r}}</span> \
        {{#cols}} \
            <div style="padding:3px;" av-bind-style-display=\'{"isNotStack" : "table-cell", "!isNotStack" : "table-row"}\' > \
                <span class="var-value" style="width: {{width}}px; height:{{height}}px;"> \
                    <span id="var-value"></span> \ \
                </span> \
                <span av-bind-style-display=\'{"isNotQueueOrStack" : "table", "!isNotQueueOrStack" : "none"}\' style="margin: 0 auto; font-style: italic; font-size: x-small;">{{index_c}}</span> \
            </div> \
        {{/cols}} \
       </div> \
    {{/rows}} \
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

    public fitText(text: HTMLElement, objectToPrint: any, maxWidth: number, maxHeight: number, disableAutoResize: boolean = false) {
        if (objectToPrint == undefined) {
            text.textContent = 'undefined';
            return;
        }

        text.textContent = objectToPrint.toString();
        text.title = text.textContent;
        text.parentElement.title = text.textContent;

        if (text.textContent == "")
            return;

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

    public draw(): HTMLElement {
        let rendered = MustacheIt.render(this.templateVarName, {
            name: this.observable.name,
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        return this.htmlElement;
    }

    private needsDraw(): boolean {
        return !this.drawn;
    }

    private needsRedraw(requestedDraw: DrawnElement): boolean {
        if (!this.drawn)
            return true;

        if (this.drawn && this.drawnElement != requestedDraw)
            return true;

        return false;
    }

    private referenceToUIStr(reference: string): string {
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

    public drawReference() {
        let rendered = MustacheIt.render(this.templateReference, {
            width: 30, height: 30
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);
        new UIBinder(this.htmlElement, undefined);

        this.text = DOMmanipulator.elementStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value');
        this.fitText(this.text, this.referenceToUIStr(this.observable.getValue()), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);

        this.drawn = true;
        this.drawnElement = DrawnElement.Reference;
    }

    private isMultiArray(array: any): boolean {
        let arrayData = array as any[];

        if (arrayData.length > 0) {
            return (Object.prototype.toString.call(arrayData[0]) == "[object Array]");
        }

        return false;
    }

    private drawArray() {
        let arrayData = this.observable.getValue() as any[];
        let isMultiArray = this.isMultiArray(arrayData);
        let isNotStack = this.observable.getName().indexOf('stack') == -1;
        let isNotQueueOrStack = isNotStack && this.observable.getName().indexOf('queue') == -1;

        let rows: any = [];
        let nr_cols: number;

        let funcMapCols = (arrayData: any[]) => {
            return arrayData.map((_v, index) => {
                return {
                    width: this.width, height: this.height,
                    index_c: index
                };
            });
        };

        if (!isMultiArray) {
            arrayData = [arrayData];
        }

        for (let index_r in arrayData) {
            rows.push({
                index_r : index_r,
                cols: funcMapCols(arrayData[index_r])
            });
        }

        let rendered = MustacheIt.render(this.templateArray, { rows: rows });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        let target = {isMultiArray: false, isNotStack: true, isNotQueueOrStack: true};
        let viewModel = new ObservableViewModel(target);    
        new UIBinder(this.htmlElement, viewModel);

        clientViewModel<typeof target>(viewModel).isMultiArray = isMultiArray;        
        clientViewModel<typeof target>(viewModel).isNotStack = isNotStack;
        clientViewModel<typeof target>(viewModel).isNotQueueOrStack = isNotQueueOrStack;    

        nr_cols = rows[0].cols.length;

        this.indextValueElements = this.indextValueElements.concat(DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value'));
        for (let [index, textElement] of this.indextValueElements.entries()) { //TODO handle jagged arrays
            let value = isMultiArray ? this.observable.getAtIndex(Math.floor(index / nr_cols), Math.floor(index % nr_cols)) : 
                        (isNotStack ? this.observable.getAtIndex(index) : this.observable.getAtIndex(nr_cols - index -1));
            this.fitText(textElement, value, this.width, this.height);
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
        else {
            this.fitText(this.text, this.referenceToUIStr(newReference), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);
            this.resetAnimation(this.text);
        }
    }

    override onSetEvent(_observable: ObservableVariable, _currValue: any, newValue: any): void {
        if (this.needsRedraw(DrawnElement.Primitive)) {
            this.redraw(DrawnElement.Primitive);

            return;
        }

        if (this.needsDraw()) {
            this.drawPrimitive();
        }
        else {
            this.fitText(this.text, newValue, this.width, this.height);
            this.resetAnimation(this.text);
        }
    }

    override onSetArrayValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        if (this.needsRedraw(DrawnElement.Array)) {
            this.redraw(DrawnElement.Array);
            return;
        }

        let isMultiArrayOld = this.isMultiArray(value);
        let isMultiArrayNew = this.isMultiArray(newValue);

        let multiArraySize = (array: any[]): number => {
            let arrElements = 0;

            if (this.isMultiArray(array)) {
                for (let r in array)
                    arrElements += array[r].length;
            } else {
                arrElements = array.length
            }

            return arrElements;
        }

        if (isMultiArrayOld != isMultiArrayNew || multiArraySize(value) != multiArraySize(newValue)) {
            this.redraw(DrawnElement.Array);
        }
        else {
            if (!isMultiArrayNew) {
                for (let [i, v] of newValue.entries()) {
                    if (value[i] != newValue[i])
                        this.onSetArrayAtIndexEvent(observable, v, v, i);
                };
            }
            else {
                for (let [r, _v] of newValue.entries()) {
                    for (let [c, _v] of newValue[r].entries()) {
                        if (value[r][c] != newValue[r][c])
                            this.onSetArrayAtIndexEvent(observable, newValue[r][c], newValue[r][c], r, c);
                    }
                };
            }
        }
    }

    override onSetArrayAtIndexEvent(observable: ObservableVariable, _oldValue: any, newValue: any, index_r: number, index_c?: number): void {
        let arrayData = observable.getValue() as any[];
        let isMultiArray = this.isMultiArray(arrayData);

        if (isMultiArray) index_r = index_r * arrayData[0].length + index_c;

        this.fitText(this.indextValueElements[index_r], newValue, this.width, this.height);
        this.resetAnimation(this.indextValueElements[index_r]);
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
            this.resetAnimation(this.keyValueElements[key]);
        } else {
            this.redraw(DrawnElement.Object);
        }
    }
}