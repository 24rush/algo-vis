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
    CLASS
}

class BindingContext {

    constructor(public htmlElement: Element, public viewModel: ObservableViewModel) { }

    private type: BindingType = BindingType.undefined;
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

    private textPlusClassBindings: Map<string, BindingContext[]> = new Map();
    private checkedBindings: Map<string, BindingContext> = new Map();

    constructor(protected widget: Element, protected viewModel: ObservableViewModel) {
        if (UIBinder.propertyObservers)
            UIBinder.propertyObservers = new Map();

        // Search for ag-bind-text or av-bind-class
        let bindingAttrs = ["av-bind-text", "av-bind-class"];
        let bindingType = BindingType.undefined;

        for (let bindingAttr of bindingAttrs) {
            for (let htmlElement of widget.querySelectorAll("[" + bindingAttr + "]")) {
                let propertyBound = undefined;

                if (bindingAttr == "av-bind-text") {
                    propertyBound = htmlElement.getAttribute('av-bind-text');
                    bindingType = BindingType.TEXT;
                }
                else {
                    propertyBound = htmlElement.getAttribute('av-bind-class');
                    bindingType = BindingType.CLASS;
                }

                let addBinding = (bindingType: BindingType, propertyBound: string, valueOnEvaluation: string = undefined) => {
                    let isNegated = false;
                    if (propertyBound.startsWith('!')) {
                        isNegated = true;
                        propertyBound = propertyBound.replace('!', '');
                    }

                    if (valueOnEvaluation && valueOnEvaluation.indexOf('()') != -1) {
                        if (!(valueOnEvaluation.replace('()', '') in viewModel))
                            throw "Property '" + valueOnEvaluation + "' does not exist on view model";
                    }

                    if (propertyBound in viewModel) {
                        let bindingContext = new BindingContext(htmlElement, viewModel);
                        if (!isNegated) bindingContext.setValueOnTrueEvaluation(valueOnEvaluation);
                        else bindingContext.setValueOnFalseEvaluation(valueOnEvaluation);

                        bindingContext.setBindingType(bindingType);

                        this.textPlusClassBindings.has(propertyBound) ?
                            this.textPlusClassBindings.get(propertyBound).push(bindingContext)
                            :
                            this.textPlusClassBindings.set(propertyBound, [bindingContext]);

                        this.registerPropertyObserver(this.viewModel, propertyBound, this);

                    }
                    else {
                        throw "Property '" + propertyBound + "' does not exist on view model";
                    }
                }
                
                // Check object expression
                if (propertyBound.indexOf("{") != -1) {
                    for (let [property, value] of Object.entries(JSON.parse(propertyBound))) {
                        addBinding(bindingType, property, value as string);
                    }
                }
                else {
                    addBinding(bindingType, propertyBound);
                }
            }
        }

        // Search for av-bind-checked
        for (let htmlElement of widget.querySelectorAll("[av-bind-checked]")) {
            let propertyBound = htmlElement.getAttribute('av-bind-checked');

            if (propertyBound in viewModel) {
                this.checkedBindings.set(propertyBound, new BindingContext(htmlElement, viewModel));
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
            console.log(htmlElement)
            let propertyBound = htmlElement.getAttribute('av-bind-onclick');

            if (propertyBound in viewModel) {
                htmlElement.addEventListener('click', (_event) => {
                    (this.viewModel as any)[propertyBound]();
                });
            } else {
                throw "Property '" + propertyBound + "' does not exist on view model";
            }
        }

        console.log(this.textPlusClassBindings);
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
        if (this.textPlusClassBindings.has(property)) {
            let bindingContexts = this.textPlusClassBindings.get(property);
            for (let bindingContext of bindingContexts) {
                if (bindingContext.propNeedsEvaluation) {
                    let propEval = this.getViewModeProperty(bindingContext.viewModel, property);

                    if (bindingContext.getBindingType() == BindingType.TEXT) {
                        if (bindingContext.getValueOnFalseEvaluation() != undefined && !propEval)
                            bindingContext.htmlElement.textContent = bindingContext.getValueOnFalseEvaluation();

                        if (bindingContext.getValueOnTrueEvaluation() != undefined && propEval)
                            bindingContext.htmlElement.textContent = bindingContext.getValueOnTrueEvaluation();
                    }

                    if (bindingContext.getBindingType() == BindingType.CLASS) {
                        if (bindingContext.getValueOnTrueEvaluation()) bindingContext.htmlElement.classList.remove(bindingContext.getValueOnTrueEvaluation());
                        if (bindingContext.getValueOnFalseEvaluation()) bindingContext.htmlElement.classList.remove(bindingContext.getValueOnFalseEvaluation());

                        if (bindingContext.getValueOnFalseEvaluation() && !propEval)
                            bindingContext.htmlElement.classList.add(bindingContext.getValueOnFalseEvaluation());

                        if (bindingContext.getValueOnTrueEvaluation() && propEval)
                            bindingContext.htmlElement.classList.add(bindingContext.getValueOnTrueEvaluation());
                    }

                } else {
                    bindingContext.htmlElement.textContent = newValue;
                }
            }
        }

        if (this.checkedBindings.has(property)) {
            let htmlElemVMPair = this.checkedBindings.get(property); console.log(this.getViewModeProperty(htmlElemVMPair.viewModel, property));
            (htmlElemVMPair.htmlElement as HTMLInputElement).checked = this.getViewModeProperty(htmlElemVMPair.viewModel, property);
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
        console.log(property as string + " changed to: " + newValue);
        UIBinder.notifyObservers(viewModel, property, newValue);
    }
}
