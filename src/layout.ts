import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { ObservableType } from "./observable-type";
import { VariableVisualizer } from "./visualizers";
var MustacheIt = require('mustache');

enum LayoutOperation {
    Add,
    Remove
}

class LayoutOperationContext {
    constructor(public type: LayoutOperation, public scopeName: string, public observable: ObservableType) { }

    static newAddOperation(scopeName: string, observable: ObservableType): LayoutOperationContext {
        return new LayoutOperationContext(LayoutOperation.Add, scopeName, observable);
    }

    static newRemoveOperation(scopeName: string, observable: ObservableType): LayoutOperationContext {
        return new LayoutOperationContext(LayoutOperation.Remove, scopeName, observable);
    }
}

export class Layout {
    protected readonly scopeTemplate = '\
    <ul class="list-group list-group-mine" av-scope="{{scope}}"> \
      <li class="list-group-item active" style="font-style: italic; font-weight:500; padding-right: 0px; ">{{scopeName}}</li> \
      <li class="list-group-item" style="padding-right: 0px; display: table;"></li> \
    </ul>'

    protected readonly localScopeTemplate = '\
    <ul class="list-group list-group-mine" style="border: none; padding: 8px;" av-scope="{{scope}}"> \
      <li class="list-group-item" style="font-style: italic; font-weight:500; padding-right: 0px;">{{scopeName}}</li> \
      <li class="list-group-item" style="display: table;"></li> \
    </ul>'

    constructor(protected scene: HTMLElement) {
    }

    private observableToVisualizer: Record<string, VariableVisualizer> = {}; // {key = scope.varname, {Visualizer}}
    private scopes: Map<string, HTMLElement> = new Map(); // {key = scope, {HTMLElement}}    

    private layoutAnimationsPending: boolean = false;
    private pendingLayoutOperations: LayoutOperationContext[] = [];

    private codeScopeToUiScope(codeScope: string): string {
        let functionScopesList = codeScope.replace('global.', '').split('!').join('').split('.');
        let uiScopeName = functionScopesList.pop();

        if (uiScopeName.indexOf('global') != -1) {
            uiScopeName = uiScopeName.replace('global', Localize.str(0));
        }
        else if (uiScopeName == 'local') {
            let parentFunc = functionScopesList.pop();
            uiScopeName = parentFunc ? Localize.str(11) + Localize.str(10) + parentFunc : Localize.str(12);
        } else {
            uiScopeName = Localize.str(10) + uiScopeName;
        }

        return uiScopeName;
    }

    private processPendingLayoutOperations() {
        while (this.pendingLayoutOperations.length > 0) {
            let operation = this.pendingLayoutOperations.shift();
            if (operation.type == LayoutOperation.Add) {
                this.add(operation.scopeName, operation.observable);
            } else {
                this.remove(operation.scopeName, operation.observable, false);
            }
        }
    }

    public add(scopeName: string, observable: ObservableType) {
        if (this.layoutAnimationsPending) {
            this.pendingLayoutOperations.push(LayoutOperationContext.newAddOperation(scopeName, observable));

            if (observable) {
                let key = scopeName + "." + observable.name;

                if (!(key in this.observableToVisualizer)) {
                    let visualizer = new VariableVisualizer(observable);
                    this.observableToVisualizer[key] = visualizer;
                }
            }

            return;
        }

        if (!this.scopes.has(scopeName)) {
            let isLocalScope = false;

            let uiScopeName = this.codeScopeToUiScope(scopeName);

            if (scopeName.indexOf('local') != -1) {
                let parentScopeName = scopeName.substring(0, scopeName.lastIndexOf('.'));

                if (parentScopeName != "") {
                    isLocalScope = true;
                }
            }

            let rendered = MustacheIt.render(isLocalScope ? this.localScopeTemplate : this.scopeTemplate, { scopeName: uiScopeName, scope: scopeName });
            let scopeHtmlElement = DOMmanipulator.fromTemplate(rendered);

            let parentScopeHtmlElement = this.scene;

            if (isLocalScope) {
                let parentScopeName = scopeName.substring(0, scopeName.lastIndexOf('.'));
                parentScopeHtmlElement = this.scene.querySelector("[av-scope='" + parentScopeName + "']");
            }

            isLocalScope ? parentScopeHtmlElement.children[0].insertAdjacentElement("afterend", scopeHtmlElement) : parentScopeHtmlElement.prepend(scopeHtmlElement);
            this.scopes.set(scopeName, scopeHtmlElement);
        }

        if (observable) {
            let key = scopeName + "." + observable.name;            

            if (!(key in this.observableToVisualizer)) {
                this.observableToVisualizer[key] = new VariableVisualizer(observable);
            }

            let visualizer = this.observableToVisualizer[key];
            let scopeHtmlElement: HTMLElement = this.scopes.get(scopeName);
            let htmlElement = visualizer.drawVarName();
            if (htmlElement)
                scopeHtmlElement.children[1].prepend(htmlElement);

            visualizer.updatePendingDraws();
        }
    }

    public remove(scopeName: string, observable: ObservableType, queueRequest: boolean = true) {
        if (this.layoutAnimationsPending && queueRequest) {
            this.pendingLayoutOperations.push(LayoutOperationContext.newRemoveOperation(scopeName, observable));
            return;
        }

        let key = scopeName + "." + observable.name;

        if (!(key in this.observableToVisualizer))
            return;

        let visualizer = this.observableToVisualizer[key];
        let htmlElement = visualizer.getHTMLElement();
        let parentScopeHtmlElement = this.scene.querySelector("[av-scope='" + scopeName + "']") as HTMLElement;

        for (let key of Object.keys(this.observableToVisualizer)) {
            let visualizer = this.observableToVisualizer[key];
            if (visualizer.getHTMLElement() == htmlElement) {
                let wholeScopeRemoval = parentScopeHtmlElement.children[1].children.length == 1;
                let fadingHtmlElem = wholeScopeRemoval ? parentScopeHtmlElement : htmlElement;

                this.layoutAnimationsPending = true;
                fadingHtmlElem.ontransitionend = () => { console.log('sss');
                    parentScopeHtmlElement.children[1].removeChild(htmlElement);
                    visualizer.detach();

                    if (parentScopeHtmlElement.children[1].children.length == 0) {
                        parentScopeHtmlElement.remove();
                        delete this.observableToVisualizer[key];
                        this.scopes.delete(scopeName);
                    }

                    this.layoutAnimationsPending = false;
                    this.processPendingLayoutOperations();
                };
                fadingHtmlElem.classList.add('fade-out');

                break;
            }
        }

        delete this.observableToVisualizer[key];
    }

    public clearAll() {
        for (let key of Object.keys(this.observableToVisualizer)) {
            let visualizer = this.observableToVisualizer[key];
            visualizer.detach();
        };

        this.observableToVisualizer = {};

        for (let [_, scope] of this.scopes)
            scope.remove();

        this.scopes.clear();
    }
}