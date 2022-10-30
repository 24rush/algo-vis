import { DOMmanipulator } from "./dom-manipulator";
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

class VisualizerViewModel {
    isMultiArray: boolean = false;
    isNotStack: boolean = true;
    isNotQueueOrStack: boolean = true;
    isEmpty: boolean = false;

    public reset(value : any, varname: string) {      
        this.isEmpty = value == undefined || value.length == 0 || (value[0] != undefined && value[0].length == 0);
        this.isMultiArray = this.checkIsMultiArray(value);
        this.isNotStack = varname.indexOf('stack') == -1;
        this.isNotQueueOrStack = this.isNotStack && varname.indexOf('queue') == -1;

        if (this.isEmpty) { // Overwrites to handle empty values
            this.isNotStack = true;
            this.isNotQueueOrStack = false;
        }
    }

    private checkIsMultiArray(array : any): boolean {
        let isArray = (Object.prototype.toString.call(array) == "[object Array]");

        if (!isArray)
            return false;

        let arrayData = array as any[];

        if (arrayData.length > 0) {
            return (Object.prototype.toString.call(arrayData[0]) == "[object Array]");
        }

        return false;
    }
};

export class VariableVisualizer extends VariableChangeCbk {
    protected readonly templateVarName =
        '<div class="var-box" style="display: table-row;"> \
        <span id="var-name" class="var-name" style="display: table-cell; text-align: right; width: 20%;">{{name}}:</span> \
    </div> \
    ';

    protected readonly templateReference: string =
        '<span class="var-value" style="display: table; border:none; height:{{height}}px;"> \
        <span style="font-style: italic; vertical-align:middle;" av-bind-text="LangStrId.9"></span> \
        <span id="var-value" style="vertical-align:middle;"></span> \
     </span>';

    protected readonly templatePrimitive: string =
        '<span class="var-value" style="display: table; margin-left:3px; margin-top: 3px; width: {{width}}px; height:{{height}}px;" av-bind-style-border="{isEmpty:none}" av-bind-style-font-style="{isEmpty:italic}"> \
         <span id="var-value" style="vertical-align:middle;"></span> \
     </span>';

    protected readonly templateArray = '<span style="display: table;"> \
    {{#rows}} \
        <div style="padding-left:7px; display: table-row;">\
        <span class="align-self-baseline" av-bind-style-display="{isMultiArray : table-cell, !isMultiArray : none}" style="font-style: italic; font-size: x-small;">{{index_r}}</span> \
        {{#cols}} \
            <div style="padding:3px;" av-bind-style-display="{isNotStack : table-cell, !isNotStack : table-row}" > \
                <span class="var-value" av-bind-style-border="{isEmpty:none}" av-bind-style-font-style="{isEmpty:italic}" style="width: {{width}}px; height:{{height}}px;"> \
                    <span id="var-value"></span> \
                </span> \
                <span av-bind-style-display="{isNotQueueOrStack : table, !isNotQueueOrStack : none}" style="margin: 0 auto; font-style: italic; font-size: x-small;">{{index_c}}</span> \
            </div> \
        {{/cols}} \
       </div> \
    {{/rows}} \
    </span>';

    protected readonly templateObject = '<span style="display: table;" class="justify-contents-baseline"> \
    {{#data}} \
        <div style="padding-right: 3px; display: table-cell;"> \
            <span class="var-value" av-bind-style-border="{isEmpty : none}" av-bind-style-font-style="{isEmpty:italic}" style="width: {{width}}px; height:{{height}}px;"> \
                <span id="var-value"></span> \
            </span> \
            <span av-bind-style-display="{!isEmpty : table, isEmpty : none}" style="margin: 0 auto; font-style: italic; font-size: x-small;">{{index}}</span> \
        </div> \
    {{/data}} \
    </span>';

    protected readonly height: number = 35;
    protected readonly width: number = 35;

    protected htmlElement: HTMLElement = undefined;
    protected keyValueElements: Record<string | number | symbol, HTMLElement> = {};
    protected indextValueElements: HTMLElement[] = [];
    protected text: HTMLElement = undefined;

    protected elementEverDrawn = false;
    protected drawn: boolean = false;
    protected drawnElement: DrawnElement = DrawnElement.undefined;
    protected pendingDraw: DrawnElement = DrawnElement.undefined;

    protected viewModel: VisualizerViewModel = new VisualizerViewModel();
    protected uiBinder: UIBinder = undefined;
    protected clientViewModel: VisualizerViewModel = undefined;

    constructor(protected observable: ObservableVariable) {
        super();

        this.observable.registerObserver(this);

        let viewModel = new ObservableViewModel(this.viewModel);

        this.clientViewModel = clientViewModel<typeof this.viewModel>(viewModel);
        this.uiBinder = new UIBinder(viewModel);
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

    private resetFontSize(text: HTMLElement) {
        text.style.removeProperty('font-size');
    }

    private resetAnimation(text: HTMLElement) {
        text.style.animation = 'none'; text.offsetHeight; text.style.animation = null;
        text.classList.remove('blink'); text.classList.add('blink');
    }

    public fitText(text: HTMLElement, objectToPrint: any, maxWidth: number, maxHeight: number, disableAutoResize: boolean = false) {
        if (objectToPrint == undefined) {
            text.textContent = 'undefined';
            this.resetFontSize(text);
            return;
        }

        if (typeof objectToPrint == 'object') {
            if (objectToPrint.length == 0 || (objectToPrint.length == undefined && Object.keys(objectToPrint).length == 0)) {
                text.textContent = 'empty';
                this.resetFontSize(text);
                return;
            }
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
        this.uiBinder.unbind();
    }

    public draw(): HTMLElement {
        if (this.elementEverDrawn)
            return undefined;

        let rendered = MustacheIt.render(this.templateVarName, {
            name: this.observable.name,
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);
        this.elementEverDrawn = true;

        return this.htmlElement;
    }

    public updatePendingDraws() {
        if (this.pendingDraw != DrawnElement.undefined) {
            this.redraw(this.pendingDraw);
            this.pendingDraw = DrawnElement.undefined;
        }
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

        this.uiBinder.bindTo(this.htmlElement);
    }

    private drawPrimitive() {
        let rendered = MustacheIt.render(this.templatePrimitive, {
            width: 35, height: 35
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);        

        this.text = DOMmanipulator.elementStartsWithId(valuesHtmlElement, 'var-value');
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

        this.text = DOMmanipulator.elementStartsWithId(valuesHtmlElement, 'var-value');
        this.fitText(this.text, this.referenceToUIStr(this.observable.getValue()), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);

        this.drawn = true;
        this.drawnElement = DrawnElement.Reference;
    }

    private drawArray() {                        
        let arrayData = this.observable.getValue() as any[];
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

        if (!this.clientViewModel.isMultiArray) {
            arrayData = [arrayData];
        }

        if (this.clientViewModel.isEmpty) {
            // Copy the data so that we don't mess with the original
            arrayData[0] = [...arrayData];
            arrayData[0][0] = undefined;
        }

        for (let index_r in arrayData) {
            rows.push({
                index_r: index_r,
                cols: funcMapCols(arrayData[index_r])
            });
        }

        let rendered = MustacheIt.render(this.templateArray, { rows: rows });
        nr_cols = rows[0].cols.length;

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        this.indextValueElements = this.indextValueElements.concat(DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value'));
        for (let [index, textElement] of this.indextValueElements.entries()) { //TODO handle jagged arrays
            let value = this.clientViewModel.isMultiArray ? this.observable.getAtIndex(Math.floor(index / nr_cols), Math.floor(index % nr_cols)) :
                (this.clientViewModel.isNotStack ? this.observable.getAtIndex(index) : this.observable.getAtIndex(nr_cols - index - 1));
            value = this.clientViewModel.isEmpty ? [] : value;
            this.fitText(textElement, value, this.width, this.height, this.clientViewModel.isEmpty);
        }

        this.drawn = true;
        this.drawnElement = DrawnElement.Array;
    }

    private drawObject() {
        this.clientViewModel.reset(this.observable.getValue(), this.observable.getName());

        let keysToRender = this.observable.getKeys();

        let isEmpty: boolean = keysToRender.length == 0;

        if (isEmpty) {
            // Copy the data so that we don't mess with the original
            keysToRender = [...keysToRender];
            keysToRender[0] = undefined;
        }

        let rendered = MustacheIt.render(this.templateObject, {
            data: keysToRender.map(key => {
                return {
                    width: this.width, height: isEmpty ? 40 : this.height, // TODO
                    index: key
                };
            }),
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        this.clientViewModel.isEmpty = isEmpty;

        let domIndex = 0;
        let domElements = DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value');

        for (let key of keysToRender) {
            this.keyValueElements[key] = domElements[domIndex++];
            let value = isEmpty ? {} : this.observable.getAtIndex(key);
            this.fitText(this.keyValueElements[key], value, this.width, this.height, isEmpty);
        }

        this.drawn = true;
        this.drawnElement = DrawnElement.Object;
    }

    override onSetReferenceEvent(_observable: ObservableVariable, oldReference: string, newReference: any): void {
        this.clientViewModel.reset(this.observable.getValue(), this.observable.getName());

        if (!this.elementEverDrawn) {
            this.pendingDraw = DrawnElement.Reference;
            return;
        }

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
        this.clientViewModel.reset(this.observable.getValue(), this.observable.getName());

        if (!this.elementEverDrawn) {
            this.pendingDraw = DrawnElement.Primitive;
            return;
        }

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

    private checkIsMultiArray(array : any): boolean {
        let arrayData = array as any[];

        if (arrayData.length > 0) {
            return (Object.prototype.toString.call(arrayData[0]) == "[object Array]");
        }
    }

    override onSetArrayValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        this.clientViewModel.reset(this.observable.getValue(), this.observable.getName());

        if (!this.elementEverDrawn) {
            this.pendingDraw = DrawnElement.Array;
            return;
        }

        if (this.needsRedraw(DrawnElement.Array)) {
            this.redraw(DrawnElement.Array);
            return;
        }

        let isMultiArrayOld = this.checkIsMultiArray(value);
        let isMultiArrayNew = this.checkIsMultiArray(newValue);

        let multiArraySize = (array: any[]): number => {
            let arrElements = 0;

            if (this.checkIsMultiArray(array)) {
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
        if (!this.elementEverDrawn) {
            this.pendingDraw = DrawnElement.Array;
            return;
        }

        let arrayData = observable.getValue() as any[];
        let isMultiArray = this.checkIsMultiArray(arrayData);

        if (isMultiArray) index_r = index_r * arrayData[0].length + index_c;

        this.fitText(this.indextValueElements[index_r], newValue, this.width, this.height);
        this.resetAnimation(this.indextValueElements[index_r]);
    }

    override onSetObjectValueEvent(observable: ObservableVariable, value: any, newValue: any): void {
        if (!this.elementEverDrawn) {
            this.pendingDraw = DrawnElement.Object;
            return;
        }

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
        this.clientViewModel.reset(this.observable.getValue(), this.observable.getName());
        
        if (!this.elementEverDrawn) {
            this.pendingDraw = DrawnElement.Object;
            return;
        }

        if (key in this.keyValueElements) {
            this.fitText(this.keyValueElements[key], newValue, this.width, this.height);
            this.resetAnimation(this.keyValueElements[key]);
        } else {
            this.redraw(DrawnElement.Object);
        }
    }
}