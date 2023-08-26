import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { ObservableType } from "./observable-type";
import { VariableVisualizer } from "./visualizers";

var MustacheIt = require('mustache');

type OnLayoutOperationsStatus = (hasPendingOperations: boolean) => void;

export class Layout {
    protected readonly scopeTemplate = '\
    <ul class="list-group list-group-mine" style="margin-left: 1em;" av-scope="{{scope}}"> \
      <li class="list-group-item active" style="font-style: italic; font-weight:500; padding-right: 0px; margin-top: 0; ">{{scopeName}}</li> \
      <li class="list-group-item" style="padding-right: 0px; display: table;"></li> \
    </ul>'

    protected readonly localScopeTemplate = '\
    <ul class="list-group list-group-mine" style="border: none; padding: 8px; margin-left: 0px;" av-scope="{{scope}}"> \
      <li class="list-group-item" style="font-style: italic; font-weight:500; padding-right: 0px;">{{scopeName}}</li> \
      <li class="list-group-item" style="display: table;"></li> \
    </ul>'

    constructor(protected scene: HTMLElement) {
    }

    private observableToVisualizer: Record<string, VariableVisualizer> = {}; // {key = scope.varname, {Visualizer}}
    private scopes: Map<string, HTMLElement> = new Map(); // {key = scope, {HTMLElement}}    

    private codeScopeToUiScope(codeScope: string): string {
        let functionScopesList = codeScope.replace('global.', '').split('!').join('').split('.');
        let uiScopeName = functionScopesList.pop();

        if (uiScopeName.indexOf('global') != -1) {
            uiScopeName = uiScopeName.replace('global', Localize.str(0));
        }
        else if (uiScopeName == 'local') {
            let parentFunc = functionScopesList.pop();
            // Handles local scopes inside other local scopes
            uiScopeName = (parentFunc && parentFunc != "local") ? Localize.str(11) + Localize.str(10) + parentFunc : Localize.str(12);
        } else {
            uiScopeName = Localize.str(10) + uiScopeName;
        }

        return uiScopeName;
    }

    private isLocalScope(scopeName: string): boolean {
        return scopeName.indexOf('local') != -1 && scopeName.substring(0, scopeName.lastIndexOf('.')) != "";    
    }

    private getTemplateForScope(scopeName: string): string {
        return this.isLocalScope(scopeName) ? this.localScopeTemplate : this.scopeTemplate;
    }

    private checkScopesExist(scopeName: string, htmlElementParent: any) {
        let scopeChain = scopeName.split('.');

        if (scopeChain.length == 1 && scopeName == "global" && !this.scopes.has(scopeName)) {
            let scopeHtmlElement = this.createHtmlElementForScope(scopeName);
            htmlElementParent.append(scopeHtmlElement);
            this.scopes.set(scopeName, scopeHtmlElement);

            return;
        }

        let parentHtmlElement = htmlElementParent;
        let currentScopeName = scopeChain[0];
        let scopeHtmlElement = parentHtmlElement;

        for (let scope of scopeChain) {
            if (scope != "global")
                currentScopeName += "." + scope;

            if (!this.scopes.has(currentScopeName)) {
                scopeHtmlElement = this.createHtmlElementForScope(currentScopeName);
                this.isLocalScope(currentScopeName) ? parentHtmlElement.children[0].insertAdjacentElement("afterend", scopeHtmlElement) : parentHtmlElement.append(scopeHtmlElement);
                this.scopes.set(currentScopeName, scopeHtmlElement);
            }

            parentHtmlElement = this.scopes.get(currentScopeName);
        }
    }

    private createHtmlElementForScope(scopeName: string): HTMLElement {
        let rendered = MustacheIt.render(this.getTemplateForScope(scopeName), { scopeName: this.codeScopeToUiScope(scopeName), scope: scopeName });
        let scopeHtmlElement = DOMmanipulator.fromTemplate(rendered);

        return scopeHtmlElement;
    }

    public add(scopeName: string, observable: ObservableType): boolean {
        this.checkScopesExist(scopeName, this.scene);

        if (!this.scopes.has(scopeName)) {
            let scopeHtmlElement = this.createHtmlElementForScope(scopeName);
            let parentScopeName = scopeName.substring(0, scopeName.lastIndexOf('.'));
            if (parentScopeName == "") parentScopeName = "global";

            let parentScopeHtmlElement;
            if (parentScopeName == "global")
                parentScopeHtmlElement = this.scene;
            else
                parentScopeHtmlElement = this.scene.querySelector("[av-scope='" + parentScopeName + "']");

            this.isLocalScope(scopeName) ? parentScopeHtmlElement.children[0].insertAdjacentElement("afterend", scopeHtmlElement) : parentScopeHtmlElement.prepend(scopeHtmlElement);
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
            if (htmlElement) {
                scopeHtmlElement.children[1].prepend(htmlElement);
            }

            visualizer.updatePendingDraws();
        }

        return true;
    }

    private removeScope(scopeName: string, parentScopeHtmlElement: HTMLElement, htmlElement: HTMLElement, onLayoutOperationsStatus: OnLayoutOperationsStatus = undefined) {
        let fadingHtmlElem = htmlElement ?? parentScopeHtmlElement;

        if (!fadingHtmlElem)
            return;
            
        if (onLayoutOperationsStatus)
            onLayoutOperationsStatus(true);

        fadingHtmlElem.ontransitionend = () => {
            if (htmlElement && parentScopeHtmlElement.children[1] == htmlElement)
                parentScopeHtmlElement.children[1].removeChild(htmlElement);

            // ATTENTION!
            if (!htmlElement || parentScopeHtmlElement.children[1].children.length <= 1) {
                parentScopeHtmlElement.remove();
                this.scopes.delete(scopeName);
            }

            if (onLayoutOperationsStatus)
                onLayoutOperationsStatus(false);
        };

        fadingHtmlElem.classList.add('fade-out');
    }

    public remove(scopeName: string, observable?: ObservableType, onLayoutOperationsStatus: OnLayoutOperationsStatus = undefined) {
        let parentScopeHtmlElement = this.scene.querySelector("[av-scope='" + scopeName + "']") as HTMLElement;
        let key = scopeName + (observable ? "." + observable.name : "");

        if (!observable) {
            this.removeScope(scopeName, parentScopeHtmlElement, undefined, onLayoutOperationsStatus);
            delete this.observableToVisualizer[key];

            // Find all variables under scopeName and remove them
            for (let key of Object.keys(this.observableToVisualizer)) {
                if (key.replace(scopeName + ".", "").indexOf('.') == -1) {
                    delete this.observableToVisualizer[key];
                }
            }

            this.scopes.delete(scopeName);

            return;
        }

        let visualizer = this.observableToVisualizer[key];
        let htmlElement = visualizer.getHTMLElement();

        for (let obsKey of Object.keys(this.observableToVisualizer)) {
            let visualizer = this.observableToVisualizer[obsKey];
            if (visualizer.getHTMLElement() == htmlElement) {
                this.removeScope(scopeName, parentScopeHtmlElement, htmlElement, onLayoutOperationsStatus);
                let wholeScopeRemoval = parentScopeHtmlElement.children[1].children.length == 1;

                visualizer.detach();

                if (wholeScopeRemoval) {
                    this.removeScope(scopeName, parentScopeHtmlElement, undefined, onLayoutOperationsStatus);
                    this.scopes.delete(scopeName);
                }

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