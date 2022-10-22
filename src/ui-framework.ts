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
    CHECKED,
    STYLE_DISPLAY
}

class BindingContext {

    constructor(public type: BindingType, public htmlElement: HTMLElement, public viewModel: ObservableViewModel) { }

    private needsEvaluation: boolean = false;
    private valueOnTrue: string = undefined;
    private valueOnFalse: string = undefined;

    public setBindingType(type: BindingType) { this.type = type; }
    public getBindingType() { return this.type; }

    public setValueOnTrueEvaluation(value: string) {
        this.valueOnTrue = value;
        this.needsEvaluation = true;
    }

    public setValueOnFalseEvaluation(value: string) {
        this.valueOnFalse = value;
        this.needsEvaluation = true;
    }

    public getValueOnTrueEvaluation(): string { return this.evaluateValue(this.valueOnTrue); }
    public getValueOnFalseEvaluation(): string { return this.evaluateValue(this.valueOnFalse); }
    public getValueOnEvaluation(propEval: boolean) { return this.evaluateValue(propEval ? this.valueOnTrue : this.valueOnFalse); }

    public propNeedsEvaluation(): boolean { return this.needsEvaluation; }

    private evaluateValue(value: string): string {
        if (value && value.indexOf('()') != -1) {
            let viewModelFunc = value.replace('()', '');
            return (this.viewModel as any)[viewModelFunc]();
        }

        return value;
    }
}

export class UIBinder {

    private static propertyObservers: Map<any, Map<string | symbol, PropertyChangedCbk[]>> = new Map();

    private propertyBindings: Map<string, BindingContext[]> = new Map();

    constructor(protected widget: Element, protected viewModel: ObservableViewModel) {
        // Search for ag-bind-text or av-bind-class
        let bindingAttrs = ["av-bind-text", "av-bind-class", "av-bind-style-display"];
        let bindingType = BindingType.undefined;

        for (let bindingAttr of bindingAttrs) {
            for (let htmlElement of widget.querySelectorAll("[" + bindingAttr + "]")) {
                let bindingText = htmlElement.getAttribute(bindingAttr);

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
                    case "av-bind-style-display":
                        {
                            bindingType = BindingType.STYLE_DISPLAY;
                            break;
                        }
                }

                let addBinding = (bindingType: BindingType, triggerProperty: string, valueOnEvaluation: string = undefined) => {
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
                                if (!(valueOnEvaluation.replace('()', '') in viewModel))
                                    throw "Property '" + valueOnEvaluation + "' does not exist on view model";
                            }
                    }

                    if (viewModel && triggerProperty in viewModel) {
                        let bindingContext = new BindingContext(bindingType, htmlElement as HTMLElement, viewModel);

                        if (valueOnEvaluation != undefined) {
                            if (!isNegated) bindingContext.setValueOnTrueEvaluation(valueOnEvaluation);
                            else bindingContext.setValueOnFalseEvaluation(valueOnEvaluation);
                        }

                        this.addPropertyBinding(triggerProperty, bindingContext);
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
                }

                // Check object expression
                if (bindingText.indexOf("{") != -1) {
                    for (let [triggerProperty, value] of Object.entries(JSON.parse(bindingText))) {
                        addBinding(bindingType, triggerProperty, value as string);
                    }
                }
                else {
                    addBinding(bindingType, bindingText);
                }
            }
        }

        // Search for av-bind-checked
        for (let htmlElement of widget.querySelectorAll("[av-bind-checked]")) {
            let propertyBound = htmlElement.getAttribute('av-bind-checked');

            if (propertyBound in viewModel) {
                this.addPropertyBinding(propertyBound, new BindingContext(BindingType.CHECKED, htmlElement as HTMLElement, viewModel));
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
        for (let htmlElement of widget.querySelectorAll("[av-bind-onclick]")) {
            let propertyBound = htmlElement.getAttribute('av-bind-onclick');

            if (propertyBound in viewModel) {
                htmlElement.addEventListener('click', (_event) => {
                    (this.viewModel as any)[propertyBound]();
                });
            } else {
                throw "Property '" + propertyBound + "' does not exist on view model";
            }
        }
    }

    private addPropertyBinding(triggerProperty: string, bindingContext: BindingContext) {
        this.propertyBindings.has(triggerProperty) ?
            this.propertyBindings.get(triggerProperty).push(bindingContext)
            :
            this.propertyBindings.set(triggerProperty, [bindingContext]);
    }

    private static notifyObservers(viewModel: any, property: string | symbol, newValue: any) {
        if (UIBinder.propertyObservers.has(viewModel) && UIBinder.propertyObservers.get(viewModel).has(property)) {
            UIBinder.propertyObservers.get(viewModel).get(property).forEach(obs => obs.onPropertyUpdated(property, newValue));
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
                            (bindingContext.htmlElement as HTMLInputElement).checked = this.getViewModeProperty(bindingContext.viewModel, property);
                            break;
                        }
                    case BindingType.TEXT:
                    case BindingType.CLASS:
                    case BindingType.STYLE_DISPLAY:
                        {
                            if (bindingContext.propNeedsEvaluation()) {
                                let propEval = this.getViewModeProperty(bindingContext.viewModel, property);
                                let propValueAfterEval = bindingContext.getValueOnEvaluation(propEval);

                                if (propValueAfterEval != undefined) {
                                    if (bindingContext.getBindingType() == BindingType.STYLE_DISPLAY) {
                                        bindingContext.htmlElement.style.display = propValueAfterEval;
                                    }

                                    if (bindingContext.getBindingType() == BindingType.TEXT) {
                                        bindingContext.htmlElement.textContent = propValueAfterEval;
                                    }

                                    if (bindingContext.getBindingType() == BindingType.CLASS) {
                                        if (bindingContext.getValueOnTrueEvaluation()) bindingContext.htmlElement.classList.remove(bindingContext.getValueOnTrueEvaluation());
                                        if (bindingContext.getValueOnFalseEvaluation()) bindingContext.htmlElement.classList.remove(bindingContext.getValueOnFalseEvaluation());

                                        bindingContext.htmlElement.classList.add(propValueAfterEval);
                                    }
                                }
                            } else {
                                bindingContext.htmlElement.textContent = newValue;
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
        console.log("%s changed to: %s", property as string, newValue);
        UIBinder.notifyObservers(viewModel, property, newValue);
    }
}
