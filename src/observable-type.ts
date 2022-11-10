import { ObservableGraph } from "./av-types-interfaces";

type DictionaryKeyType = string | number | symbol;
export type ObservableType = ObservableJSVariable | ObservableGraph;

export class JSVariableChangeCbk {
    // set Reference + Primitive
    onSetReferenceEvent(observable: ObservableJSVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };    
    onSetEvent(observable: ObservableJSVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };    
    
    // set Array and array at index
    onSetArrayValueEvent(observable: ObservableJSVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };
    onSetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, newValue: any, index_r: number, index_c: number) { /*console.log("Method not implemented.");*/ };

    // set object and object propery
    onSetObjectValueEvent(observable: ObservableJSVariable, value: any, newValue: any) { /*console.log("Method not implemented.");*/ };
    onSetObjectPropertyEvent(observable: ObservableJSVariable, value: any, newValue: any, key: DictionaryKeyType) { /*console.log("Method not implemented.");*/ };

    // get primitive and array at index and object property
    onGetEvent(observable: ObservableJSVariable, value: any) { /*console.log("Method not implemented.");*/ }
    onGetArrayAtIndexEvent(observable: ObservableJSVariable, value: any, index_r: number, index_c?: number) { /*console.log("Method not implemented.");*/ };
    onGetObjectPropertyEvent(observable: ObservableJSVariable, value: any, key: DictionaryKeyType) { /*console.log("Method not implemented.");*/ };    
}

export class BaseObservableType<NotifyCbkType>
{
    protected observers: NotifyCbkType[] = [];
    
    public name: string;

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
    Object,
    Reference,

    Graph,
    Tree
}

export class ObservableJSVariable extends BaseObservableType<JSVariableChangeCbk>
{
    protected initValue: any;

    constructor(public name: string, protected value?: any) {
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

    public getAtIndex(index_r: string | number | symbol, index_c?: string | number | symbol): any {
        let variableType = this.determineType(this.value);

        for (let observer of this.observers) {
            if (variableType == VariableType.Array)
                observer.onGetArrayAtIndexEvent(this, this.value[index_r], index_r as number);
            else if (variableType == VariableType.Object)
                observer.onGetObjectPropertyEvent(this, index_r, this.value[index_r]);
            else throw "Cannot at index on primitive";
        }

        return index_c != undefined ? this.value[index_r][index_c] : this.value[index_r];
    }

    public setReference(newReference: string) {
        let oldReference = this.value ? JSON.parse(JSON.stringify(this.value)) : undefined;
        this.value = newReference != undefined ? JSON.parse(JSON.stringify(newReference)) : undefined;

        for (let observer of this.observers) {
            observer.onSetReferenceEvent(this, oldReference, this.value);
        }
    }

    public setValue(value: any) {
        let oldValues = this.value ? JSON.parse(JSON.stringify(this.value)) : undefined;
        this.value = value != undefined ? JSON.parse(JSON.stringify(value)) : undefined;

        let variableType = this.determineType(value);

        for (let observer of this.observers) {
            switch (variableType) {
                case VariableType.undefined:
                case VariableType.Primitive: observer.onSetEvent(this, oldValues, this.value); break;
                case VariableType.Array: observer.onSetArrayValueEvent(this, oldValues? [...oldValues] : oldValues, this.value? [...this.value] : this.value); break;
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