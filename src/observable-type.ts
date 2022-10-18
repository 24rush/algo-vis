type DictionaryKeyType = string | number | symbol;

export class VariableChangeCbk {
    onSetEvent(observable: ObservableVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };
    onGetEvent(observable: ObservableVariable, value: any) { /*console.log("Method not implemented.");*/ }

    onSetArrayValueEvent(observable: ObservableVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };
    onSetArrayAtIndexEvent(observable: ObservableVariable, value: any, newValue: any, index: number) { /*console.log("Method not implemented.");*/ };
    onGetArrayAtIndexEvent(observable: ObservableVariable, value: any, index: number) { /*console.log("Method not implemented.");*/ };

    onSetObjectValueEvent(observable: ObservableVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };
    onSetObjectPropertyEvent(observable: ObservableVariable, value: any, newValue: any, key: DictionaryKeyType) { /*console.log("Method not implemented.");*/ };
    onGetObjectPropertyEvent(observable: ObservableVariable, value: any, key: DictionaryKeyType) { /*console.log("Method not implemented.");*/ };
}

export class BaseObservableType<NotifyCbkType>
{
    protected observers: NotifyCbkType[] = [];
    protected name: string;

    registerObserver(notifyCbk: NotifyCbkType) {
        this.observers.push(notifyCbk);
    }

    unregisterObserver(notifyCbk: NotifyCbkType) {
        this.observers = this.observers.filter((elem) => elem != notifyCbk);
    }

    getName(): string {
        return this.name.toString();
    }
}

export enum VariableType {
    undefined,
    Primitive,
    Array,
    Object
}

export class ObservableVariable extends BaseObservableType<VariableChangeCbk>
{
    protected initValue: any;

    constructor(public name: string, protected value: any) {
        super();

        this.initValue = value ? JSON.parse(JSON.stringify(value)) : undefined;
    }

    public empty() {
        this.value = undefined;
    }

    public reset() {
        this.setValue(this.initValue);
    }

    public getType() { return this.determineType(this.value); }

    public getKeys(): any[] { return Object.keys(this.value) }

    public getValue(): any {
        for (let observer of this.observers) {
            observer.onGetEvent(this, this.value);
        }
        return this.value;
    }

    public getAtIndex(index: string | number | symbol): any {
        let variableType = this.determineType(this.value);

        for (let observer of this.observers) {
            if (variableType == VariableType.Array)
                observer.onGetArrayAtIndexEvent(this, this.value[index], index as number);
            else if (variableType == VariableType.Object)
                observer.onGetObjectPropertyEvent(this, index, this.value[index]);
            else throw "Cannot at index on primitive";
        }

        return this.value[index];
    }

    public setValue(value: any) {
        let oldValues = this.value ? JSON.parse(JSON.stringify(this.value)) : undefined;
        this.value = value != undefined ? JSON.parse(JSON.stringify(value)) : undefined;

        let variableType = this.determineType(value);

        for (let observer of this.observers) {
            switch (variableType) {
                case VariableType.undefined:
                case VariableType.Primitive: observer.onSetEvent(this, this.value, value); break;
                case VariableType.Array: observer.onSetArrayValueEvent(this, oldValues, this.value); break;
                case VariableType.Object: observer.onSetObjectValueEvent(this, oldValues, this.value); break;
                default: throw "OBSERVABLE type unknown"
            }                
        }
    }

    private determineType(object: any): VariableType {
        if (!object)
            return VariableType.undefined;

        let variableType = Object.prototype.toString.call(object);

        let isArray = (variableType == "[object Array]");
        let isObject = (variableType == "[object Object]");

        if (isArray) return VariableType.Array;
        if (isObject) return VariableType.Object;

        return VariableType.Primitive;
    }
}