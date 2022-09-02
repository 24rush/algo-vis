export interface PrimitiveTypeChangeCbk<Type> {
    onSet(observable: ObservablePrimitiveType<Type>, value: Type, newValue: Type): void;
    onGet(observable: ObservablePrimitiveType<Type>, value: Type): void;
}

export interface ArrayTypeChangeCbk<Type> {
    onSetAtIndex(observable: ObservableArrayType<Type>, value: Type, newValue: Type, index: number): void;
    onGetAtIndex(observable: ObservableArrayType<Type>, value: Type, index: number): void;
}

type DictionaryKeyType = string | number;

export interface ObjectTypeChangeCbk<Key, Value> {
    onSet(key: DictionaryKeyType, newValue: Value): void;
    onGet(key: DictionaryKeyType, value: Value): void;
}

export class BaseObservableType<NotifyCbkType>
{
    protected observers: NotifyCbkType[] = [];
    protected name : string;

    registerObserver(notifyCbk: NotifyCbkType) {
        this.observers.push(notifyCbk);
    }

    unregisterObserver(notifyCbk: NotifyCbkType) {        
        this.observers = this.observers.filter((elem) => elem != notifyCbk);        
    }

    getName() : string {
        return this.name.toString();
    }
}

export class ObservablePrimitiveType<Type> extends BaseObservableType<PrimitiveTypeChangeCbk<Type>>
{
    protected value : Type;
    public name : string;

    constructor(name : string, value: Type) {
        super();

        this.value = value;
        this.name = name;
    }

    setValue(newValue: Type) {
        for (let observer of this.observers) {
            observer.onSet(this, this.value, newValue);
        }
        this.value = newValue;
    }

    getValue(): Type {
        for (let observer of this.observers) {
            observer.onGet(this, this.value);
        }
        return this.value;
    }
}

export class ObservableArrayType<Type> extends BaseObservableType<ArrayTypeChangeCbk<Type>>
{
    constructor(public name : string, protected values: Type[]) {
        super();
    }

    getValues() : Type[] { return this.values }
    setValues(values : Type[])
    {
        this.values = [];
        for (let i = 0; i < values.length; i++)
            this.setValueAtIndex(values[i], i);
    }

    setValueAtIndex(newValue: Type, index: number) {
        for (let observer of this.observers) {
            observer.onSetAtIndex(this, this.values[index], newValue, index);
        }
        this.values[index] = newValue;
    }

    getAtIndex(index: number): Type {
        for (let observer of this.observers) {
            observer.onGetAtIndex(this, this.values[index], index);
        }
        return this.values[index];
    }
}

export class ObservableDictionaryType<DictionaryKeyType, Value>
{
    constructor(protected value: Record<string | number, Value>, public notifyCbk: ObjectTypeChangeCbk<DictionaryKeyType, Value>) {
    }

    set(key: string | number, value: Value) {
        this.value[key] = value;
        this.notifyCbk.onSet(key, value);
    }

    get(key: string | number): Value {
        this.notifyCbk.onGet(key, this.value[key]);
        return this.value[key];
    }
}