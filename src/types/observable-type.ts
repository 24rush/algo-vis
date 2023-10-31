import { BaseObservableType, ObservableGraph } from "./graph-base";

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

export enum VariableType {
    undefined,
    Primitive,
    Array,
    Object,
    Set,
    Reference,

    Graph,
    Tree
}

export class ObservableJSVariable extends BaseObservableType<JSVariableChangeCbk>
{
    protected initValue: any;

    constructor(public name: string, protected value?: any, public isBinary?: boolean) {
        super();

        this.initValue = value ? JSON.parse(JSON.stringify(value)) : value;
    }

    public empty() {
        this.value = undefined;
    }

    public reset() {
        this.setValue(this.initValue);
    }

    public getType() { return this.determineType(this.value); }

    // For printing objects
    public getKeys(): any[] { 
        let isPrintable = "type" in this.value;
        
        if (isPrintable) {
            switch (this.value["type"]) {
                case "NodeBase":
                    return ["value"];
            }
        }

        return Object.keys(this.value) 
    }

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

        let extractValueAtPosOrNull = (value: any, row: string | number | symbol, col?: string | number | symbol) => {
            if (value && value[row]) {
                if (col != undefined) {
                    return value[row][col];
                } else {
                    return value[row];
                }
            }

            return null;
        };

        return extractValueAtPosOrNull(this.value, index_r, index_c);
    }

    public setReference(newReference: string) {
        let oldReference = this.value ? JSON.parse(JSON.stringify(this.value)) : undefined;
        this.value = newReference != undefined ? JSON.parse(JSON.stringify(newReference)) : undefined;

        for (let observer of this.observers) {
            observer.onSetReferenceEvent(this, oldReference, this.value);
        }
    }

    public setValue(value: any) {
        // handle Sets        
        let isSet = (Object.prototype.toString.call(value) == "[object Set]");        

        let oldValues = this.value ? JSON.parse(JSON.stringify(this.value)) : this.value;
        this.value = value ? JSON.parse(JSON.stringify(isSet ? [...value] : value)) : value;

        let variableType = this.determineType(value);

        for (let observer of this.observers) {
            switch (variableType) {
                case VariableType.undefined:
                case VariableType.Primitive: observer.onSetEvent(this, oldValues, this.value); break;
                case VariableType.Array: observer.onSetArrayValueEvent(this, oldValues ? [...oldValues] : oldValues, this.value ? [...this.value] : this.value); break;
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