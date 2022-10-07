export interface PrimitiveTypeChangeCbk {
    onSet(observable: ObservablePrimitiveType, value: any, newValue: any): void;
    onGet(observable: ObservablePrimitiveType, value: any): void;
}

export interface ArrayTypeChangeCbk {
    onSetArrayValue(observable: ObservableArrayType, value: any[], newValue: any[]): void;
    onSetArrayAtIndex(observable: ObservableArrayType, value: any, newValue: any, index: number): void;
    onGetArrayAtIndex(observable: ObservableArrayType, value: any, index: number): void;
}

type DictionaryKeyType = string | number | symbol;

export interface ObjectTypeChangeCbk {
    onSetObjectValue(observable: ObservableDictionaryType, value: any, newValue: any): void;
    onSetObjectProperty(observable: ObservableDictionaryType, value: any, newValue: any, key: DictionaryKeyType): void;
    onGetObjectProperty(observable: ObservableDictionaryType, value: any, key: DictionaryKeyType): void;
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

type PrimitiveType = number | string | boolean;

export class ObservablePrimitiveType extends BaseObservableType<PrimitiveTypeChangeCbk>
{
    protected initValue: PrimitiveType;

    constructor(public name: string, protected value: PrimitiveType) {
        super();

        this.initValue = value;
    }

    public empty() {
        this.setValue(undefined);
    }

    public reset() {
        this.setValue(this.initValue);
    }

    public setValue(newValue: PrimitiveType) {
        for (let observer of this.observers) {console.log('set');
            observer.onSet(this, this.value, newValue);
        }

        this.value = newValue;
    }

    public getValue(): PrimitiveType {
        for (let observer of this.observers) {
            observer.onGet(this, this.value);
        }
        return this.value;
    }
}

export class ObservableArrayType extends BaseObservableType<ArrayTypeChangeCbk>
{
    protected initValues: any[];

    constructor(public name: string, protected values: any[]) {
        super();

        this.initValues = JSON.parse(JSON.stringify(values));
    }

    public empty() {
        this.values = [];
    }

    public reset() {
        this.setValue(this.initValues);
    }

    getValue(): any[] { return this.values }
    setValue(values: any[]) {
        let oldValues = [...this.values];
        this.values = [...values];

        for (let observer of this.observers) {
            observer.onSetArrayValue(this, oldValues, this.values);
        }
    }

    setValueAtIndex(newValue: any, index: number) {
        for (let observer of this.observers) {
            observer.onSetArrayAtIndex(this, this.values[index], newValue, index);
        }
        this.values[index] = newValue;
    }

    getAtIndex(index: number): any {
        for (let observer of this.observers) {
            observer.onGetArrayAtIndex(this, this.values[index], index);
        }
        return this.values[index];
    }
}

export class ObservableDictionaryType extends BaseObservableType<ObjectTypeChangeCbk>
{
    protected initValue: any;

    constructor(public name: string, protected value: any) {
        super();

        this.initValue = JSON.parse(JSON.stringify(value));
    }

    public empty() {
        this.value = {};
    }

    public reset() {
        this.setValue(this.initValue);
    }

    getKeys(): any[] { return Object.keys(this.value) }
    setValue(value: any) {
        let oldValues = JSON.parse(JSON.stringify(this.value));
        this.value = JSON.parse(JSON.stringify(value));

        for (let observer of this.observers) {
            observer.onSetObjectValue(this, oldValues, this.value);
        }
    }

    setValueAtIndex(key: string | number, value: any) {
        for (let observer of this.observers) {
            observer.onSetObjectProperty(this, key, this.value[key], value);
        }

        this.value[key] = value;
    }

    getAtIndex(key: string | number | symbol): any {
        for (let observer of this.observers) {
            observer.onGetObjectProperty(this, key, this.value[key]);
        }
        return this.value[key];
    }
}

export type ObservableTypes = ObservablePrimitiveType | ObservableArrayType | ObservableDictionaryType;