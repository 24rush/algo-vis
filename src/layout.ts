import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { ObservableType } from "./observable-type";
import { VariableVisualizer } from "./visualizers";

var MustacheIt = require('mustache');

type OnLayoutOperationsStatus = (hasPendingOperations: boolean) => void;

class ScopeTemplateElements {
    public scopeHtmlElement: HTMLElement;
    public scope_body: HTMLElement;
    public scope_empty_span: HTMLElement;

    constructor(scopeHtmlElement: HTMLElement) {
        this.scopeHtmlElement = scopeHtmlElement;
        this.scope_body = scopeHtmlElement.querySelector('.accordion-body');
        this.scope_empty_span = this.scope_body.querySelector('.empty-scope');
        this.scope_empty_span.textContent = Localize.str(32);
    }
}

export class Layout {
    protected readonly accordionScope = '\
    <div class="accordion accordion-flush" id="accordionPanelsStayOpenExample" av-scope="{{scope}}"> \
        <div class="accordion-item"> \
            <span class="accordion-header" id="panelsStayOpen-heading{{scope_idx}}"> \
                <button class="accordion-button scope-name" type="button" data-bs-toggle="collapse" data-bs-target="#panelsStayOpen-collapse{{scope_idx}}" aria-expanded="true" aria-controls="panelsStayOpen-collapse{{scope_idx}}">\
                    {{scopeName}} \
                </button>\
            </span>\
            <div id="panelsStayOpen-collapse{{scope_idx}}" class="accordion-collapse collapse show" aria-labelledby="panelsStayOpen-heading{{scope_idx}}">\
                <div class="accordion-body scope-body">\
                    <div class="empty-scope">empty</div>\
                </div> \
            </div> \
    </div>';

    constructor(protected scene: HTMLElement) {
    }

    private observableToVisualizer: Record<string, VariableVisualizer> = {}; // {key = scope.varname, {Visualizer}}
    private scopes: Map<string, ScopeTemplateElements> = new Map(); // {key = scope, {HTMLElement}}  
    private static scope_idx: number = 0;

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

    private checkScopesExist(scopeName: string) {
        let scopeChain = scopeName.split('.');
        let parentHtmlElement : ScopeTemplateElements;
        let currentScopeName = "";

        for (let scope of scopeChain) {
            if (currentScopeName === "")
                currentScopeName = scope;
            else
                currentScopeName += "." + scope;

            if (!this.scopes.has(currentScopeName)) {
                let scopeHtmlElement = this.createHtmlElementForScope(currentScopeName);

                if (this.scopes.size == 0)
                    this.scene.append(scopeHtmlElement);
                else
                    parentHtmlElement.scope_body.append(scopeHtmlElement);

                this.scopes.set(currentScopeName, new ScopeTemplateElements(scopeHtmlElement));
            }

            parentHtmlElement = this.scopes.get(currentScopeName);
        }
    }

    private createHtmlElementForScope(scopeName: string): HTMLElement {
        let rendered = MustacheIt.render(this.accordionScope, { scopeName: this.codeScopeToUiScope(scopeName), scope: scopeName, scope_idx: Layout.scope_idx++ });
        let scopeHtmlElement = DOMmanipulator.fromTemplate(rendered);

        return scopeHtmlElement;
    }

    public add(scopeName: string, observable: ObservableType): boolean {
        this.checkScopesExist(scopeName);

        if (!this.scopes.has(scopeName)) {
            let parentScopeName = scopeName.substring(0, scopeName.lastIndexOf('.'));
            if (parentScopeName == "") parentScopeName = "global";

            let parentScopeHtmlElement = parentScopeName == "global" ? this.scene : this.scene.querySelector("[av-scope='" + parentScopeName + "']");

            let scopeHtmlElement = this.createHtmlElementForScope(scopeName);
            this.isLocalScope(scopeName) ? DOMmanipulator.childElementWithClass(parentScopeHtmlElement, '.accordion-body').append(scopeHtmlElement) : parentScopeHtmlElement.prepend(scopeHtmlElement);
            this.scopes.set(scopeName, new ScopeTemplateElements(scopeHtmlElement));
        }

        if (observable) {
            let key = scopeName + "." + observable.name;

            if (!(key in this.observableToVisualizer)) {
                this.observableToVisualizer[key] = new VariableVisualizer(observable);
            }

            let visualizer = this.observableToVisualizer[key];
            let scopeHtmlElements = this.scopes.get(scopeName);

            let htmlElement = visualizer.drawVarName();
            if (htmlElement) {
                scopeHtmlElements.scope_body.prepend(htmlElement);
                scopeHtmlElements.scope_empty_span.style.display = "none";
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
            scope.scopeHtmlElement.remove();

        this.scopes.clear();
    }
}