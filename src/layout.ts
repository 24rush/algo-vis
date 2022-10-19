import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { ObservableVariable } from "./observable-type";
import { VariableVisualizer } from "./visualizers";
var MustacheIt = require('mustache');

export class Layout {
    protected readonly scopeTemplate = '\
    <ul class="list-group list-group" av-scope="{{scope}}"> \
      <li class="list-group-item active" style="font-style: italic; font-weight:500; padding-right: 0px;">{{scopeName}}</li> \
      <li class="list-group-item" style="padding-right: 0px;"></li> \
    </ul>'

    constructor(protected scene: HTMLElement) {
    }

    private observableToVisualizer: Record<string, VariableVisualizer> = {}; // {key = scope.varname, {Visualizer}}
    private scopes: Map<string, HTMLElement> = new Map(); // {key = scope, {HTMLElement}}    

    private codeScopeToUiScope(codeScope: string) : string {
        let uiScopeName = codeScope.replace('global.', '').split('!').join('').split('.').join(' > ');
        uiScopeName = uiScopeName.replace('global', Localize.str(0));

        return uiScopeName;
    }

    public add(scopeName: string, observable: ObservableVariable) : VariableVisualizer {            
        if (!this.scopes.has(scopeName)) {
            let uiScopeName = this.codeScopeToUiScope(scopeName);

            let rendered = MustacheIt.render(this.scopeTemplate, { scopeName: uiScopeName, scope: scopeName });
            let scopeHtmlElement = DOMmanipulator.fromTemplate(rendered);            

            let parentScopeName = scopeName.substring(0, scopeName.lastIndexOf('.'));
            let parentScopeHtmlElement = (parentScopeName == "") ? this.scene : this.scene.querySelector("[av-scope='" + parentScopeName + "']");

            if (parentScopeHtmlElement.children.length <= 1)
                parentScopeHtmlElement.append(scopeHtmlElement);
            else
                parentScopeHtmlElement.children[1].append(scopeHtmlElement);

            this.scopes.set(scopeName, scopeHtmlElement);
        }

        if (observable) {
            let key = scopeName + "." + observable.name;
            
            if (key in this.observableToVisualizer)
                return this.observableToVisualizer[key];
                
            let scopeHtmlElement: HTMLElement = this.scopes.get(scopeName);

            let visualizer = new VariableVisualizer(observable);
            scopeHtmlElement.children[1].prepend(visualizer.draw());

            this.observableToVisualizer[key] = visualizer;

            return visualizer;
        }    
    }

    public remove(scopeName: string, observable: ObservableVariable) {
        let key = scopeName + "." + observable.name;
        
        if (!(key in this.observableToVisualizer))
            return;

            let visualizer = this.observableToVisualizer[key];
        let htmlElement = visualizer.getHTMLElement();

        let parentScopeHtmlElement = this.scene.querySelector("[av-scope='" + scopeName + "']");

        for (let key of Object.keys(this.observableToVisualizer)) {
            let visualizer = this.observableToVisualizer[key];
            if (visualizer.getHTMLElement() == htmlElement) {

                parentScopeHtmlElement.children[1].removeChild(visualizer.getHTMLElement());
                visualizer.detach();

                if (parentScopeHtmlElement.children[1].children.length == 0) {
                    parentScopeHtmlElement.remove();
                    delete this.observableToVisualizer[key];
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