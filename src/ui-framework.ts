import { Localize } from "./localization";

interface PropertyChangedCbk {
    onPropertyUpdated(property: string | symbol, newValue: any): void;
}

export class ObservableViewModel {
    constructor(protected target: any) {
        return new Proxy(target, {
            set: (target, property, newValue, proxy) => {
                property in target ? target[property] = newValue : target = newValue
                UIBinder.propertyChanged(target, property, newValue, proxy);
                return true;
            },
            get: (target: any, property: any, _receiver: any) => {
                return property in target ? target[property] : target;
            }
        });
    }
}

export function clientViewModel<T>(obsViewModel: ObservableViewModel): T {
    return obsViewModel as unknown as T;
}

enum BindingType {
    undefined,
    TEXT,
    CLASS,
    VALUE,
    CHECKED,
    STYLE
}

class BindingContext {

    constructor(public type: BindingType, public htmlElement: HTMLElement) { }

    private valueOnTrue: string = undefined;
    private valueOnFalse: string = undefined;

    private styleTargetProp: string = undefined; // For STYLE only bindings

    public setBindingType(type: BindingType) { this.type = type; }
    public getBindingType() { return this.type; }

    public setValueOnTrueEvaluation(value: string) {
        this.valueOnTrue = value;
    }

    public setValueOnFalseEvaluation(value: string) {
        this.valueOnFalse = value;
    }

    public setStyleTargetProp(prop: string) { this.styleTargetProp = prop; }
    public getStyleTargetProp(): string { return this.styleTargetProp; }

    public getValueOnTrueEvaluation(viewModel: any): string { return this.evaluateValue(viewModel, this.valueOnTrue); }
    public getValueOnFalseEvaluation(viewModel: any): string { return this.evaluateValue(viewModel, this.valueOnFalse); }
    public getValueOnEvaluation(viewModel: any, propEval: boolean): string { return this.evaluateValue(viewModel, propEval ? this.valueOnTrue : this.valueOnFalse); }

    public propNeedsEvaluation(): boolean { return this.valueOnFalse != undefined || this.valueOnTrue != undefined; }

    private evaluateValue(viewModel: any, value: string): string {
        if (value && value.indexOf('()') != -1) {
            let viewModelFunc = value.replace('()', '');
            return (viewModel as any)[viewModelFunc]();
        }

        return value;
    }
}

export class UIBinder {

    // Static members
    private static propertyObservers: Map<any, Map<string | symbol, PropertyChangedCbk[]>> = new Map();

    // Instance members
    private propertyBindings: Map<string, BindingContext[]> = new Map();

    constructor(protected viewModel: ObservableViewModel) { }

    private getElementsWithAttribute(parent: Element, attribute: string): Element[] {
        let elements = Array.from(parent.querySelectorAll("[" + attribute + "]"));
        elements.push(parent);

        return elements;
    }

    public bindTo(widget: Element): UIBinder {
        // Search for all known binding attributes
        let bindingAttrs = ["av-bind-text", "av-bind-class", "av-bind-value", "av-bind-style-width", "av-bind-style-display", "av-bind-style-border", "av-bind-style-font-style", "av-bind-style-flex-direction"];
        let bindingType = BindingType.undefined;
        let styleTargetProp: string = undefined;

        for (let bindingAttr of bindingAttrs) {
            let elementsToHook = this.getElementsWithAttribute(widget, bindingAttr);
            for (let element of elementsToHook) {
                let htmlElement = element as HTMLElement;
                let bindingText = htmlElement.getAttribute(bindingAttr);

                if (!bindingText)
                    continue;

                switch (bindingAttr) {
                    case "av-bind-text":
                        {
                            bindingType = BindingType.TEXT;
                            break;
                        }
                    case "av-bind-class":
                        {
                            bindingType = BindingType.CLASS;
                            break;
                        }
                    case "av-bind-value":
                        {
                            bindingType = BindingType.VALUE;
                            break;
                        }
                    default:
                        {
                            if (bindingAttr.includes("av-bind-style-")) {
                                bindingType = BindingType.STYLE;
                                styleTargetProp = bindingAttr.replace('av-bind-style-', '');
                            }

                            break;
                        }
                }

                let addBinding = (bindingType: BindingType, triggerProperty: string, valueOnEvaluation: string = undefined, styleTargetProp: string) => {
                    let isNegated = triggerProperty.startsWith('!');
                    if (isNegated) {
                        triggerProperty = triggerProperty.replace('!', '');
                    }

                    if (valueOnEvaluation) {
                        // Element localized through a trigger property
                        if (valueOnEvaluation.startsWith("LangStrId")) {
                            let strId = valueOnEvaluation.split('.')[1];
                            valueOnEvaluation = Localize.str(parseInt(strId));
                        }
                        else
                            if (valueOnEvaluation.indexOf('()') != -1) {
                                if (!(valueOnEvaluation.replace('()', '') in this.viewModel))
                                    throw "Property '" + valueOnEvaluation + "' does not exist on view model";
                            }
                    }

                    if (this.viewModel && triggerProperty in this.viewModel) {
                        let bindingContext = this.addPropertyBinding(triggerProperty, new BindingContext(bindingType, htmlElement));

                        if (styleTargetProp != undefined) bindingContext.setStyleTargetProp(styleTargetProp);

                        if (valueOnEvaluation != undefined) {
                            if (!isNegated) bindingContext.setValueOnTrueEvaluation(valueOnEvaluation);
                            else bindingContext.setValueOnFalseEvaluation(valueOnEvaluation);
                        }

                        this.registerPropertyObserver(this.viewModel, triggerProperty, this);
                    }
                    else {
                        // Localizing elements
                        if (triggerProperty.startsWith("LangStrId")) {
                            let strId = triggerProperty.split('.')[1];
                            htmlElement.textContent = Localize.str(parseInt(strId));
                        }
                        else
                            throw "Property '" + triggerProperty + "' does not exist on view model";
                    }

                    UIBinder.propertyChanged(undefined, triggerProperty, valueOnEvaluation, this.viewModel);
                }

                // Check object expression
                if (bindingText.indexOf("{") != -1) {
                    bindingText = bindingText.replace('{', '').replace('}', '');
                    let triggerPropPairs = bindingText.indexOf(',') != -1 ? bindingText.split(',') : [bindingText];
                    for (let trigPropPair of triggerPropPairs) {
                        let tokens = trigPropPair.split(':');
                        let triggerProperty = tokens[0].trim();
                        let value = tokens[1].trim();

                        addBinding(bindingType, triggerProperty, value as string, styleTargetProp);
                    }
                }
                else {
                    addBinding(bindingType, bindingText, undefined, styleTargetProp);
                }
            }
        }

        // Search for av-bind-checked
        for (let htmlElement of this.getElementsWithAttribute(widget, "av-bind-checked")) {
            let propertyBound = htmlElement.getAttribute('av-bind-checked');

            if (!propertyBound) continue;

            if (propertyBound in this.viewModel) {
                this.addPropertyBinding(propertyBound, new BindingContext(BindingType.CHECKED, htmlElement as HTMLElement));
                this.registerPropertyObserver(this.viewModel, propertyBound, this);

                htmlElement.addEventListener('change', (event) => {
                    let target = event.target as HTMLInputElement;
                    this.setViewModeProperty(this.viewModel, propertyBound, target.checked);
                });
            } else {
                throw "Property '" + propertyBound + "' does not exist on view model";
            }
        }

        // Search for av-bind-onclick
        for (let htmlElement of this.getElementsWithAttribute(widget, "av-bind-onclick")) {
            let propertyBound = htmlElement.getAttribute('av-bind-onclick');

            if (!propertyBound) continue;

            if (propertyBound in this.viewModel) {
                if (!((propertyBound + '-bind') in this.viewModel)) {
                    // create function prototype for the bind version of the function so that we can remove it later
                    (this.viewModel as any).prototype[propertyBound + '-bind'] = (this.viewModel as any)[propertyBound].bind(this.viewModel);
                }

                htmlElement.addEventListener('click', (this.viewModel as any).prototype[propertyBound + '-bind']);
            } else {
                throw "Property '" + propertyBound + "' does not exist on view model";
            }
        }

        return this;
    }

    public unbindFrom(widget: Element) {
        // Search for av-bind-onclick
        for (let htmlElement of this.getElementsWithAttribute(widget, "av-bind-onclick")) {
            let propertyBound = htmlElement.getAttribute('av-bind-onclick');

            if (!propertyBound) continue;

            if (propertyBound in this.viewModel) {
                htmlElement.removeEventListener('click', (this.viewModel as any).prototype[propertyBound + '-bind']);
            } else {
                throw "Property '" + propertyBound + "' does not exist on view model";
            }
        }
    }

    private addPropertyBinding(triggerProperty: string, bindingContext: BindingContext): BindingContext {
        if (this.propertyBindings.has(triggerProperty)) {
            let bindingsOnSameTriggerProp = this.propertyBindings.get(triggerProperty);
            for (let binding of bindingsOnSameTriggerProp) {
                if (binding.getBindingType() == bindingContext.getBindingType() &&
                    binding.htmlElement == bindingContext.htmlElement &&
                    binding.getStyleTargetProp() == bindingContext.getStyleTargetProp()) {
                    return binding;
                }
            }

            this.propertyBindings.get(triggerProperty).push(bindingContext);
        } else {
            this.propertyBindings.set(triggerProperty, [bindingContext]);
        }

        return bindingContext;
    }

    private static notifyObservers(viewModel: any, property: string | symbol, newValue: any) {
        if (UIBinder.propertyObservers.has(viewModel) && UIBinder.propertyObservers.get(viewModel).has(property)) {
            UIBinder.propertyObservers.get(viewModel).get(property).forEach(obs => obs.onPropertyUpdated(property, newValue));
        }
    }

    public unbind() {
        if (UIBinder.propertyObservers.has(this.viewModel)) {
            UIBinder.propertyObservers.delete(this.viewModel);
        }
    }

    private registerPropertyObserver(viewModel: any, property: string, callback: PropertyChangedCbk) {
        if (!UIBinder.propertyObservers.has(viewModel)) {
            UIBinder.propertyObservers.set(viewModel, new Map());
        }

        if (!UIBinder.propertyObservers.get(viewModel).has(property)) {
            UIBinder.propertyObservers.get(viewModel).set(property, []);
        }

        if (UIBinder.propertyObservers.get(viewModel).get(property).length == 0)
            UIBinder.propertyObservers.get(viewModel).get(property).push(callback);
    }

    onPropertyUpdated(property: string, newValue: any): void {
        if (this.propertyBindings.has(property)) {
            let bindingContexts = this.propertyBindings.get(property);
            for (let bindingContext of bindingContexts) {
                switch (bindingContext.type) {
                    case BindingType.CHECKED:
                        {
                            (bindingContext.htmlElement as HTMLInputElement).checked = this.getViewModeProperty(this.viewModel, property);
                            break;
                        }
                    case BindingType.TEXT:
                    case BindingType.CLASS:
                    case BindingType.STYLE:
                    case BindingType.VALUE:
                        {
                            let propEval = this.getViewModeProperty(this.viewModel, property);

                            if (bindingContext.propNeedsEvaluation()) {
                                let propValueAfterEval = bindingContext.getValueOnEvaluation(this.viewModel, propEval);

                                if (bindingContext.getBindingType() == BindingType.STYLE) {
                                    let targetStyle = bindingContext.getStyleTargetProp();

                                    switch (targetStyle) {
                                        case "width":
                                            bindingContext.htmlElement.style.width = propValueAfterEval;
                                            break;
                                        case "display":
                                            bindingContext.htmlElement.style.setProperty("display", propValueAfterEval, "important")
                                            break;
                                        case "border":
                                            bindingContext.htmlElement.style.removeProperty('border');
                                            if (propValueAfterEval != undefined)
                                                bindingContext.htmlElement.style.border = propValueAfterEval;
                                            break;
                                        case "font-style":
                                            bindingContext.htmlElement.style.removeProperty('font-style');
                                            bindingContext.htmlElement.style.fontStyle = propValueAfterEval;
                                            break;
                                        case "flex-direction":
                                            bindingContext.htmlElement.style.removeProperty('flex-direction');
                                            bindingContext.htmlElement.style['flexDirection'] = propValueAfterEval;
                                            break;
                                    }
                                }

                                if (bindingContext.getBindingType() == BindingType.TEXT) {
                                    bindingContext.htmlElement.textContent = propValueAfterEval;
                                }

                                if (bindingContext.getBindingType() == BindingType.VALUE) {
                                    (bindingContext.htmlElement as HTMLInputElement).value = propValueAfterEval;
                                }

                                if (bindingContext.getBindingType() == BindingType.CLASS) {
                                    if (bindingContext.getValueOnTrueEvaluation(this.viewModel))
                                        bindingContext.htmlElement.classList.remove(bindingContext.getValueOnTrueEvaluation(this.viewModel));
                                    if (bindingContext.getValueOnFalseEvaluation(this.viewModel))
                                        bindingContext.htmlElement.classList.remove(bindingContext.getValueOnFalseEvaluation(this.viewModel));

                                    bindingContext.htmlElement.classList.add(propValueAfterEval);
                                }
                            } else {
                                switch (bindingContext.getBindingType()) {
                                    case BindingType.VALUE:
                                        (bindingContext.htmlElement as HTMLInputElement).value = newValue;
                                        break;
                                    case BindingType.STYLE:
                                        {
                                            let targetStyle = bindingContext.getStyleTargetProp();

                                            switch (targetStyle) {
                                                case "width":
                                                    bindingContext.htmlElement.style.width = newValue;
                                                    break;
                                            }

                                            break;
                                        }
                                    default: {
                                        bindingContext.htmlElement.textContent = newValue ?? propEval;

                                        let parent = bindingContext.htmlElement.parentNode as HTMLElement;

                                        // Handle expanding textareas 
                                        if (parent && parent.classList.contains('grow-wrap')) {
                                            parent.dataset.replicatedValue = newValue ?? propEval;
                                        }
                                    }
                                }
                            }
                        }
                }
            }
        }
    }

    private hasKey = <T extends object>(obj: T, k: keyof any): k is keyof T => k in obj;

    private setViewModeProperty(viewModel: ObservableViewModel, property: string, value: any) {
        if (this.hasKey(viewModel, property))
            (viewModel as any)[property] = value;
    }

    private getViewModeProperty(viewModel: ObservableViewModel, property: string): any {
        if (this.hasKey(viewModel, property))
            return (viewModel as any)[property];

        return undefined;
    }

    static propertyChanged(object: any, property: string | symbol, newValue: any, viewModel: any) {
        //console.log("%s changed to: %s", property as string, newValue);
        UIBinder.notifyObservers(viewModel, property, newValue);
    }
}
