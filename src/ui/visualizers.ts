import { DOMmanipulator } from "./../util/dom-manipulator";

var MustacheIt = require('mustache');
var Cytoscape = require('cytoscape');

var dagre = require('cytoscape-dagre');
Cytoscape.use(dagre);

import { ObservableJSVariable, JSVariableChangeCbk, ObservableType } from "./../types/observable-type"
import { GraphVariableChangeCbk, NodeAccessType, NodeBase, ObservableGraph } from "./../types/graph-base";
import { BinaryTree, BinaryTreeNode, Graph } from "./../types/graph";
import { clientViewModel, ObservableViewModel, UIBinder } from "./../util/ui-framework";
import { Localize } from "./../util/localization";

enum DrawnElement {
    undefined,
    Primitive,
    Array,
    Object,
    Reference,
    Graph
}

class VisualizerViewModel {
    isMultiArray: boolean = false;
    isNotStack: boolean = true;
    isNotQueueOrStack: boolean = true;
    isBorderless: boolean = false; // isEmpty or isString
    isString: boolean = false;
    isBinary: boolean = false;

    onVarNameClicked(): void { }

    public reset(observable: ObservableJSVariable | ObservableGraph) {
        var value = observable.getValue();
        var varname = observable.getName();

        this.isBorderless = value == null || value == undefined || value.length == 0 || /*(value[0] != undefined && value[0].length == 0) ||*/ typeof value == 'string';
        this.isString = (typeof value == 'string') || (value && value[0] != undefined && typeof value[0] == 'string');

        if (value instanceof ObservableGraph)
            this.isBorderless = (value as ObservableGraph).isEmpty();

        this.isMultiArray = this.checkIsMultiArray(value);
        this.isNotStack = varname.indexOf('stack') == -1;
        this.isNotQueueOrStack = this.isNotStack; /*&& varname.indexOf('queue') == -1;*/

        if (this.isBorderless) { // Overwrites to handle empty values
            this.isNotStack = true;
            this.isNotQueueOrStack = false;
        }
    }

    private checkIsMultiArray(array: any): boolean {
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

export class VariableVisualizer implements JSVariableChangeCbk, GraphVariableChangeCbk {
    protected readonly templateVarName =
        '<div class="var-box" style="display: flex; align-items: center; user-select: none"> \
            <div style="display: flex; min-width: 20%; justify-content: flex-end;"> \
                <span id="var-name" class="var-name" av-bind-onclick="onVarNameClicked">{{name}}</span> \
                <span id="var-name" class="var-name-bin" av-bind-style-display="{!isBinary: none, isBinary: inline}" av-bind-onclick="onVarNameClicked">bin</span> \
            </div> \
            <span id="var-name" class="var-name" av-bind-onclick="onVarNameClicked" style="padding-left: 5px; padding-right: 5px;">:</span> \
    </div> \
    ';

    protected readonly templateReference: string =
        '<div class="var-value" style="display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; border:none;width:100%;"> \
            <span style="font-style: italic;" av-bind-text="LangStrId.9"></span> \
            <span id="var-value" style="padding-left: 5px"></span> \
        </div>';

    protected readonly templatePrimitive: string =
        '<div class="var-value" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; min-width: {{width}}px; text-align: left; word-wrap: break-word; white-space: normal;" \
                av-bind-style-border="{isBorderless:none}" av-bind-style-font-style="{isBorderless:italic}"> \
                <span id="var-value" style="max-width: 100%;"></span>\
     </div>';

    protected readonly templateArray = '<span style=""> \
    {{#rows}} \
        <div style="display: flex; flex-wrap: wrap;" av-bind-style-flex-direction="{isNotStack: row, !isNotStack: column}">\
        <span class="align-self-center" av-bind-style-display="{isMultiArray : table-cell, !isMultiArray : none}" style="font-style: italic; font-size: x-small;margin-right: 5px;">{{index_r}}</span> \
        {{#cols}} \
            <div style="padding-right:3px;" av-bind-style-display="{isNotStack : table-cell, !isNotStack : table-row}" > \
                <span class="var-value" av-bind-style-border="{isBorderless:none}" av-bind-style-font-style="{isBorderless:italic}" style="width: {{width}}px; height:{{height}}px;"> \
                <div id="var-value"></div>\
                </span> \
                <span av-bind-style-display="{isNotQueueOrStack : table, !isNotQueueOrStack : none}" style="margin: 0 auto; font-style: italic; font-size: x-small;">{{index_c}}</span> \
            </div> \
        {{/cols}} \
       </div> \
    {{/rows}} \
    </span>';

    protected readonly templateObject = '<span style="display: flex; flex-wrap: wrap;" class="justify-contents-baseline"> \
    {{#data}} \
        <div style="padding-right: 3px; display: table-cell;"> \
            <div class="var-value" av-bind-style-border="{isBorderless : none}" av-bind-style-font-style="{isBorderless:italic}" style="width: {{width}}px; height:{{height}}px;"> \
                <span id="var-value"></span> \
            </div> \
            <span av-bind-style-display="{!isBorderless : table, isBorderless : none}" style="margin: 0 auto; font-style: italic; font-size: x-small;">{{index}}</span> \
        </div> \
    {{/data}} \
    </span>';

    protected readonly templateEmptyGraph = '<span class="var-value" av-bind-style-border="{isBorderless:none}" av-bind-style-font-style="{isBorderless:italic}"> \
        <div id="var-value"></div> \
    </span>';

    protected readonly templateGraph = '<div style="display: block;  resize:vertical; padding: 3px; width: 100%; height:{{height}}px;"> \
    </div>';

    protected readonly height: number = 23;
    protected readonly width: number = 23;
    protected readonly fontSize: number = 13;

    protected htmlElement: HTMLElement = undefined;
    protected keyValueElements: Record<string | number | symbol, HTMLElement> = {};
    protected indextValueElements: HTMLElement[] = [];
    protected text: HTMLElement = undefined;
    protected graphVis: any = undefined; // Cytoscape
    protected layout: any = undefined;
    protected fontSizeCache: Record<string, number> = {};

    protected varNameDrawn = false;
    protected varValueDrawn: boolean = false;
    protected elementToDrawType: DrawnElement = DrawnElement.undefined;
    protected pendingDraw: DrawnElement = DrawnElement.undefined;

    protected viewModel: VisualizerViewModel = new VisualizerViewModel();
    protected uiBinder: UIBinder = undefined;
    protected clientViewModel: VisualizerViewModel = undefined;

    constructor(protected observable: ObservableType) {
        this.observable.registerObserver(this);

        this.viewModel.onVarNameClicked = () => {
            if (typeof this.observable.getValue() == "number") {
                this.clientViewModel.isBinary = !this.clientViewModel.isBinary;

                this.redraw(this.elementToDrawType);
            }
        };
        let viewModel = new ObservableViewModel(this.viewModel);
        this.viewModel.isBinary = (observable as ObservableJSVariable) && (observable as ObservableJSVariable).isBinary;

        this.clientViewModel = clientViewModel<typeof this.viewModel>(viewModel);
        this.uiBinder = new UIBinder(viewModel);
    }

    onGetEvent(observable: ObservableJSVariable, value: any): void {
        //throw new Error("Method not implemented.");
    }
    onGetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, index_r: number, index_c?: number): void {
        // throw new Error("Method not implemented.");
    }
    onGetObjectPropertyEvent(observable: ObservableJSVariable, value: any, key: string | number | symbol): void {
        //  throw new Error("Method not implemented.");
    }

    public getHTMLElement(): HTMLElement { return this.htmlElement; }

    private textWidth(text: HTMLElement): { w: number, h: number } {
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

        setTimeout(() => {
            // Remove class so it doesnt blink when switching to fullscreen
            text.classList.remove('blink');
        }, 600);
    }

    private toStringKnownObject(varValue: any): string {
        if (typeof varValue != "object" || !('type' in varValue))
            return varValue.toString();

        switch (varValue['type']) {
            case "NodeBase":
                return varValue['value'].toString();
        }
    }

    private fitText(text: HTMLElement, objectToPrint: any, maxWidth: number, maxHeight: number, disableAutoResize: boolean = false) {
        let dec2bin = (dec: number): string => {
            return (dec >>> 0).toString(2).padStart(32, '0');
        }

        if (objectToPrint == undefined || objectToPrint == null) {
            text.textContent = (objectToPrint === undefined) ? 'undefined' : 'null';
        } else {
            if (typeof objectToPrint == 'number') {
                text.textContent = this.clientViewModel.isBinary ? dec2bin(objectToPrint) : objectToPrint.toString();;
            } else
                text.textContent = (typeof objectToPrint == 'string' && objectToPrint[0] != '\'') ? `'${objectToPrint.toString()}'` : this.toStringKnownObject(objectToPrint);
        }

        if (objectToPrint != null && typeof objectToPrint == 'object') {
            let isEmptyObject: boolean = false;
            if (objectToPrint instanceof ObservableGraph) {
                isEmptyObject = ((objectToPrint as ObservableGraph).isEmpty());
            } else
                if (objectToPrint.length == 0 || (objectToPrint.length == undefined && Object.keys(objectToPrint).length == 0)) {
                    isEmptyObject = true;
                }

            if (isEmptyObject) {
                text.textContent = Localize.str(33);
                this.resetFontSize(text);
                return;
            }
        }

        text.title = text.textContent;
        text.parentElement.title = text.textContent;

        if (text.textContent == "" || disableAutoResize)
            return;

        let cachedFontSizeForNewValue = (text.id in this.fontSizeCache) ? this.fontSizeCache[text.id] : 0;
        let currentFontSize = Number.parseInt(window.getComputedStyle(text, null).getPropertyValue('font-size'));
        if (!currentFontSize || Number.isNaN(currentFontSize)) currentFontSize = this.fontSize;

        if (cachedFontSizeForNewValue > 0 && cachedFontSizeForNewValue == currentFontSize) {
            return;
        }

        let directionToBounds = (w: number, h: number) => {
            if (/*w > maxWidth || */h > maxHeight)
                return -1;
            if (/*w < maxWidth && */h < maxHeight)
                return 1;

            return 0;
        };

        maxWidth = text.clientWidth;
        maxHeight = this.height - 2; // account for border (30 - 2)
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

        this.fontSizeCache[text.id] = newFontSize;
    }

    public detach(): void {
        this.observable.unregisterObserver(this);
        this.uiBinder.unbind();
    }

    public drawVarName(): HTMLElement {
        if (this.varNameDrawn)
            return undefined;

        let rendered = MustacheIt.render(this.templateVarName, {
            name: this.observable.name,
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        this.htmlElement = DOMmanipulator.fromTemplate(indexedTemplate);
        this.varNameDrawn = true;

        this.uiBinder.bindTo(this.htmlElement.parentElement);

        return this.htmlElement;
    }

    public updatePendingDraws() {
        if (this.pendingDraw != DrawnElement.undefined) {
            this.redraw(this.pendingDraw);
            this.pendingDraw = DrawnElement.undefined;
        }
    }

    private needsDraw(): boolean {
        return !this.varValueDrawn;
    }

    private needsRedraw(requestedDraw: DrawnElement): boolean {
        if (!this.varValueDrawn)
            return true;

        if (this.varValueDrawn && this.elementToDrawType != requestedDraw)
            return true;

        return false;
    }

    private referenceToUIStr(reference: string): string {
        return reference.replace("global.", '');
    }

    private redraw(redrawType: DrawnElement) {
        this.uiBinder.unbindFrom(this.htmlElement);
        this.htmlElement.removeChild(this.htmlElement.lastChild as HTMLElement);

        this.keyValueElements = {};
        this.indextValueElements = [];
        this.keyValueElements = {};
        this.text = undefined;

        if (redrawType == DrawnElement.Primitive) this.drawPrimitive(this.observable as ObservableJSVariable);
        if (redrawType == DrawnElement.Array) this.drawArray(this.observable as ObservableJSVariable);
        if (redrawType == DrawnElement.Object) this.drawObject(this.observable as ObservableJSVariable);
        if (redrawType == DrawnElement.Reference) this.drawReference(this.observable as ObservableJSVariable);
        if (redrawType == DrawnElement.Graph) this.drawGraph(this.observable as ObservableGraph);

        this.uiBinder.bindTo(this.htmlElement);
    }

    private drawPrimitive(observable: ObservableJSVariable | ObservableGraph) {
        this.clientViewModel.reset(observable);

        let rendered = MustacheIt.render(this.templatePrimitive, {
            width: this.width, height: this.height
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        this.text = DOMmanipulator.elementStartsWithId(valuesHtmlElement, 'var-value');
        this.fitText(this.text, observable.getValue(), this.htmlElement.clientWidth, this.htmlElement.clientHeight);

        this.varValueDrawn = true;
        this.elementToDrawType = DrawnElement.Primitive;
    }

    public drawReference(observable: ObservableJSVariable) {
        let rendered = MustacheIt.render(this.templateReference, {
            width: this.width, height: this.height
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        this.text = DOMmanipulator.elementStartsWithId(valuesHtmlElement, 'var-value');
        this.fitText(this.text, this.referenceToUIStr(observable.getValue()), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);

        this.varValueDrawn = true;
        this.elementToDrawType = DrawnElement.Reference;
    }

    private drawArray(observable: ObservableJSVariable) {
        let arrayData = observable.getValue() as any[];
        let rows: any = [];

        let funcMapCols = (arrayData: any[]): any => {
            if (!arrayData) {
                return {
                    width: this.width, height: this.height,
                    index_c: 0,
                }
            }

            return arrayData.map((_v, index) => {
                return {
                    width: this.width, height: this.height,
                    index_c: index,
                };
            });
        };

        if (!this.clientViewModel.isMultiArray) {
            arrayData = [arrayData];
        }

        if (this.clientViewModel.isBorderless) {
            // Copy the data so that we don't mess with the original
            arrayData[0] = [...arrayData];
            arrayData[0][0] = undefined;
        }

        for (let index_r in arrayData) {
            let cols = funcMapCols(arrayData[index_r]);
            if (!cols.length) cols = [{
                width: this.width, height: this.height,
                index_c: 0,
            }];

            rows.push({
                index_r: index_r,
                cols: cols
            });
        }

        let rendered = MustacheIt.render(this.templateArray, { rows: rows });
        let valuesHtmlElement = DOMmanipulator.fromTemplate(DOMmanipulator.addIndexesToIds(rendered));

        this.htmlElement.append(valuesHtmlElement);

        this.indextValueElements = this.indextValueElements.concat(DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value'));
        let row = 0, processed_in_row = 0;
        let cols = rows[row].cols.length;

        for (let [index, textElement] of this.indextValueElements.entries()) {
            if (processed_in_row >= cols) {
                processed_in_row = 0;
                row++;
                cols = rows[row].cols.length;
            }

            let index_r, index_c;

            if (this.clientViewModel.isMultiArray) {
                index_r = row;
                index_c = processed_in_row;
            } else {
                index_r = (this.clientViewModel.isNotStack ? index : (cols - index - 1));
            }

            let value = observable.getAtIndex(index_r, index_c);
            
            value = this.clientViewModel.isBorderless || (this.clientViewModel.isMultiArray && value == undefined) ? [] : value;
            this.fitText(textElement, value, this.width, this.height, this.clientViewModel.isBorderless);

            processed_in_row++;
        }

        this.varValueDrawn = true;
        this.elementToDrawType = DrawnElement.Array;
    }

    private drawObject(observable: ObservableJSVariable) {
        this.clientViewModel.reset(observable);

        let keysToRender = observable.getKeys();

        let isEmpty: boolean = keysToRender.length == 0;

        if (isEmpty) {
            // Copy the data so that we don't mess with the original
            keysToRender = [...keysToRender];
            keysToRender[0] = undefined;
        }

        let rendered = MustacheIt.render(this.templateObject, {
            data: keysToRender.map(key => {
                return {
                    width: this.width, height: this.height,
                    index: key
                };
            }),
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        this.clientViewModel.isBorderless = isEmpty;

        let domIndex = 0;
        let domElements = DOMmanipulator.elementsStartsWithId<HTMLElement>(valuesHtmlElement, 'var-value');

        for (let key of keysToRender) {
            this.keyValueElements[key] = domElements[domIndex++];
            let value = isEmpty ? {} : observable.getAtIndex(key);
            this.fitText(this.keyValueElements[key], value, this.width, this.height, isEmpty);
        }

        this.varValueDrawn = true;
        this.elementToDrawType = DrawnElement.Object;
    }

    private createGraphVis(container: HTMLElement, directed: boolean = true) {
        if (this.graphVis)
            return;

        this.graphVis = Cytoscape({
            container: container,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#0d6efd',
                        'label': 'data(label)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': (directed ? 'triangle' : 'none'),
                        'curve-style': 'bezier',
                    }
                }
            ],

            zoomingEnabled: true,
            userZoomingEnabled: true,
            wheelSensitivity: 0.1
        });
    }

    private drawGraph(observable: ObservableGraph) {
        this.clientViewModel.reset(observable);

        let rendered = MustacheIt.render(observable.isEmpty() ? this.templateEmptyGraph : this.templateGraph, {
            width: observable.isEmpty() ? this.width : this.htmlElement.clientWidth, height: observable.isEmpty() ? this.height : 350
        });

        let indexedTemplate = DOMmanipulator.addIndexesToIds(rendered);
        let valuesHtmlElement = DOMmanipulator.fromTemplate(indexedTemplate);

        this.htmlElement.append(valuesHtmlElement);

        if (observable.isEmpty()) {
            this.text = DOMmanipulator.elementStartsWithId(valuesHtmlElement, 'var-value');
            this.fitText(this.text, observable.getValue(), this.htmlElement.clientWidth, this.htmlElement.clientHeight);
        } else {
            let hasDirectedEdges = (observable instanceof Graph) && (observable as Graph).hasDirectedEdges();
            this.createGraphVis(valuesHtmlElement, hasDirectedEdges);
        }

        this.varValueDrawn = true;
        this.elementToDrawType = DrawnElement.Graph;
    }

    onSetReferenceEvent(observable: ObservableJSVariable, oldReference: string, newReference: any): void {
        this.clientViewModel.reset(observable);

        if (!this.varNameDrawn) {
            this.pendingDraw = DrawnElement.Reference;
            return;
        }

        if (this.needsRedraw(DrawnElement.Reference)) {
            this.redraw(DrawnElement.Reference);

            return;
        }

        if (this.needsDraw()) {
            this.drawReference(observable);
        }
        else {
            this.fitText(this.text, this.referenceToUIStr(newReference), this.htmlElement.clientWidth, this.htmlElement.clientHeight, true);
            this.resetAnimation(this.text);
        }
    }

    onSetEvent(observable: ObservableJSVariable | ObservableGraph, _currValue: any, newValue: any): void {
        this.clientViewModel.reset(observable);

        let isPrimitiveType = !(observable instanceof ObservableGraph);
        let drawnElement = isPrimitiveType ? DrawnElement.Primitive : DrawnElement.Graph;

        if (!this.varNameDrawn) {
            this.pendingDraw = drawnElement;
            return;
        }

        if (this.needsRedraw(drawnElement)) {
            this.redraw(drawnElement);

            return;
        }

        if (isPrimitiveType) {
            if (this.needsDraw()) {
                this.drawPrimitive(observable);
            }
            else {
                if (this.text.textContent != newValue) {
                    this.fitText(this.text, newValue, this.width, this.height);
                    this.resetAnimation(this.text);
                }
            }
        }
    }

    private checkIsMultiArray(array: any): boolean {
        let arrayData = array as any[];

        if (arrayData.length > 0) {
            return (Object.prototype.toString.call(arrayData[0]) == "[object Array]");
        }
    }

    onSetArrayValueEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        this.clientViewModel.reset(observable);

        if (!this.varNameDrawn) {
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
                    arrElements += array[r] ? array[r].length : 0;
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
                }
            }
            else {
                for (let [r, _v] of newValue.entries()) {
                    for (let [c, _v] of newValue[r].entries()) {
                        if (value[r][c] != newValue[r][c])
                            this.onSetArrayAtIndexEvent(observable, newValue[r][c], newValue[r][c], r, c);
                    }
                }
            }
        }
    }

    onSetArrayAtIndexEvent(observable: ObservableJSVariable, _oldValue: any, newValue: any, index_r: number, index_c?: number): void {
        if (!this.varNameDrawn) {
            this.pendingDraw = DrawnElement.Array;
            return;
        }

        let arrayData = observable.getValue() as any[];
        let isMultiArray = this.checkIsMultiArray(arrayData);

        if (isMultiArray) index_r = index_r * arrayData[0].length + index_c;

        this.fitText(this.indextValueElements[index_r], newValue, this.width, this.height);
        this.resetAnimation(this.indextValueElements[index_r]);
    }

    onSetObjectValueEvent(observable: ObservableJSVariable, value: any, newValue: any): void {
        if (!this.varNameDrawn) {
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

    onSetObjectPropertyEvent(observable: ObservableJSVariable, _value: any, newValue: any, key: string | number | symbol): void {
        this.clientViewModel.reset(observable);

        if (!this.varNameDrawn) {
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

    private forceGraphRefresh(observable: ObservableGraph) {
        if (this.layout) {
            this.layout.stop();
            this.layout.destroy();
        }

        if (!(observable instanceof BinaryTree)) {
            this.layout = this.graphVis.layout({
                name: 'cose',
                infinite: true,
                fit: true,
            });
        } else {
            const SPACING = 40;
            let levels: Map<number, BinaryTreeNode[]> = new Map();
            let binTreeRoot = (observable as BinaryTree).getRoot();

            binTreeRoot.level = 0;
            binTreeRoot.dirrScore = 0;

            let queue: BinaryTreeNode[] = [binTreeRoot];

            while (queue.length) {
                let currNode = queue.shift();

                if (levels.has(currNode.level))
                    levels.get(currNode.level).push(currNode);
                else levels.set(currNode.level, [currNode]);

                if (currNode.left) {
                    currNode.left.offsetX = -SPACING;
                    currNode.left.dirrScore = currNode.dirrScore - 1;
                    queue.push(currNode.left);
                }

                if (currNode.right) {
                    currNode.right.offsetX = SPACING;
                    currNode.right.dirrScore = currNode.dirrScore + 1;
                    queue.push(currNode.right);
                }
            }

            for (let [level, nodes] of levels.entries()) {
                if (level < 2)
                    continue;

                for (let dirrScoreIdx = -level + 1; dirrScoreIdx < level; dirrScoreIdx++) {
                    let hittinNodes: BinaryTreeNode[] = [];

                    for (let node of nodes) {
                        if (node.dirrScore == dirrScoreIdx)
                            hittinNodes.push(node);
                    }

                    if (hittinNodes.length > 1) {
                        let h1 = hittinNodes[0].parent, h2 = hittinNodes[1].parent;

                        while (h1 != h2) {
                            h1 = h1.parent; h2 = h2.parent;
                        }

                        if (h1.left) h1.left.offsetX -= SPACING;
                        if (h1.right) h1.right.offsetX += SPACING;

                        while (h1 != binTreeRoot) {
                            h1 = h1.parent;
                        }
                    }
                }
            }

            this.layout = this.graphVis.layout({
                name: 'dagre',
                animate: true,
                animationDuration: 300,
                animationEasing: 'ease-in-out-sine',
                fit: true,
                transform: (node: any, pos: any) => {
                    let treeNode = (observable as BinaryTree).findNodeWithId(node.id());
                    if (!treeNode)
                        return pos;

                    if (treeNode.isRoot()) {
                        treeNode.offsetX = pos.x;
                        return pos;
                    }

                    treeNode.offsetX += treeNode.parent.offsetX;
                    pos.x = treeNode.offsetX;

                    return pos;
                }
            });
        }

        this.layout.run();
    }

    private ensureGraphDrawn() {
        if (this.graphVis == undefined) {
            this.redraw(DrawnElement.Graph);
        }
    }

    onSetGraphEvent(observable: ObservableGraph, _value: any, _newValue: any): void {
        console.log(observable, _value, _newValue)
    }

    onAccessNode(_observable: ObservableGraph, node: NodeBase, accessType: NodeAccessType): void {
        let graphNode = this.graphVis.filter(`[id = "${node.id}"]`);

        let duration = 8;
        for (let i = 0; i < 2; i++)
            graphNode.animate({
                style: { opacity: 1 },
                duration: duration,
                easing: 'ease-in-sine'
            }).delay(duration).animate({
                style: { opacity: 0, 'background-color': 'black' },
                duration: duration,
                easing: 'ease-in-sine'
            }).delay(duration).animate({
                style: { opacity: 1, 'background-color': '#0d6efd' },
                duration: duration,
                easing: 'ease-in-sine'
            });

        if (accessType == NodeAccessType.Mark) {
            graphNode.animate({
                style: { opacity: 1, 'background-color': '#d63384' },
                duration: duration,
                easing: 'ease-in-sine'
            });
        }
    }

    onAddEdge(observable: ObservableGraph, sourceNode: NodeBase, destNode: NodeBase): void {
        this.ensureGraphDrawn();

        this.graphVis.add(
            [
                {
                    data: { id: sourceNode.id }
                },
                {
                    data: { id: destNode.id }
                },
                {
                    data: { id: sourceNode.id + '-' + destNode.id, source: sourceNode.id, target: destNode.id }
                }
            ]
        );

        this.forceGraphRefresh(observable);
    }

    onAddNode(observable: ObservableGraph, node: NodeBase): void {
        this.ensureGraphDrawn();

        this.graphVis.add([{ data: { id: node.id, label: node.label } }]);
        this.forceGraphRefresh(observable);
    }
    onRemoveNode(_observable: ObservableGraph, node: NodeBase): void {
        this.ensureGraphDrawn();
        this.graphVis.remove(this.graphVis.filter(`[id = "${node.id}"]`));
    }
    onRemoveEdge(observable: ObservableGraph, sourceNode: NodeBase, destNode: NodeBase): void {
        this.ensureGraphDrawn();

        this.graphVis.remove(
            [
                {
                    data: { id: sourceNode.id }
                },
                {
                    data: { id: destNode.id }
                },
                {
                    data: { id: sourceNode.id + '-' + destNode.id, source: sourceNode.id, target: destNode.id }
                }
            ]
        );

        this.forceGraphRefresh(observable);
    }
}