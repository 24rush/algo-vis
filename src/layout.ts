import { DOMmanipulator } from "./dom-manipulator";
import { BaseVisualizer } from "./visualizers";
var MustacheIt = require('mustache');

export class Layout {
    protected readonly scopeTemplate = '\
    <ul class="list-group list-group" av-scope="{{scope}}"> \
      <li class="list-group-item">{{scopeName}}</li> \
      <li class="list-group-item"></li> \
    </ul>'

    constructor(protected scene: HTMLElement) {
    }

    private observableToVisualizer: any = {}; // {key = scope.varname, {Visualizer}}
    private scopes: any = {}; // {key = scope, {HTMLElement}}    

    public add(scopeName: string, observable: any) {        
        if (!(scopeName in this.scopes)) {
            let uiScopeName = scopeName.replace('global.', '').replace('!', '');
            uiScopeName = uiScopeName.replace('global', 'Globals');

            let rendered = MustacheIt.render(this.scopeTemplate, { scopeName: uiScopeName, scope: scopeName });
            let scopeHtmlElement = DOMmanipulator.fromTemplate(rendered);

            this.scopes[scopeName] = scopeHtmlElement;

            let parentScopeName = scopeName.substring(0, scopeName.lastIndexOf('.'));
            let parentScopeHtmlElement = parentScopeName == "" ? this.scene : this.scene.querySelector("[av-scope='" + parentScopeName + "']");

            if (parentScopeHtmlElement.children.length <= 1)
                parentScopeHtmlElement.append(scopeHtmlElement);
            else
                parentScopeHtmlElement.children[1].append(scopeHtmlElement);
        }

        if (observable) {
            let key = scopeName + "." + observable.name;
            
            if (key in this.observableToVisualizer)
                return;
                
            let scopeHtmlElement: HTMLElement = this.scopes[scopeName];

            let visualizer = new BaseVisualizer(observable, this);
            scopeHtmlElement.children[1].prepend(visualizer.draw());

            this.observableToVisualizer[key] = visualizer;
        }
    }

    public remove(scopeName: string, observable: any) {
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
                    delete this.scopes[scopeName];
                }

                break;
            }
        }

        delete this.observableToVisualizer[key];
    }

    public clearAll() {
        for (let key of Object.keys(this.observableToVisualizer)) {
            let visualizer = this.observableToVisualizer[key];

            this.scene.removeChild(visualizer.getHTMLElement());
            visualizer.detach();
        };

        this.observableToVisualizer = {};
    }
}