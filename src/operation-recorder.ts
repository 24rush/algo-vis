import { ArrayTypeChangeCbk, ObservableArrayType, ObservablePrimitiveType, PrimitiveTypeChangeCbk } from "./observable-type";

enum OperationType {
    NONE = 0,
    READ,
    READ_AT,
    WRITE,
    WRITE_AT,
    LINE_NUMBER
}

class Operation {
    type: OperationType;
    codeLineNumber: number;

    observable: any;
    oldValue: any;
    newValue: any;
    index?: number;

    constructor(type: OperationType, codeLineNumber: number, observable: any, oldValue: any, newValue: any, index?: number) {
        this.type = type;
        this.codeLineNumber = codeLineNumber;

        this.observable = observable;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.index = index;
    }

    public toString(): string {
        if (this.index == -1)
            //@ts-ignore
            return "{0} {1} {2} => {3}".format(this.type.toString(), this.observable.name, this.oldValue, this.newValue);

        //@ts-ignore
        return "{0} {1}[{2}] {3} => {4}".format(this.type.toString(), this.observable.name, this.index, this.oldValue, this.newValue);
    }
}

class PrimitiveTypeContext {
    public observable: ObservablePrimitiveType<any>;
    public initialData: any;

    constructor(observable: ObservablePrimitiveType<any>) {
        this.observable = observable;
        this.initialData = observable.getValue();
    }
}

class ArrayTypeContext {
    public observable: ObservableArrayType<any>;
    public initialData: any;

    constructor(observable: ObservableArrayType<any>) {
        this.observable = observable;
        this.initialData = [...observable.getValues()];
    }
}

enum OperationRecorderStatus {
    Idle,
    Recording,
    Replaying
}

export class OperationRecorder implements PrimitiveTypeChangeCbk<any>, ArrayTypeChangeCbk<any> {
    onSet(observable: ObservablePrimitiveType<any>, value: any, newValue: any): void {
        this.addOperation(OperationType.WRITE, observable, value, newValue);
    }
    onGet(observable: ObservablePrimitiveType<any>, value: any): void {
        this.addOperation(OperationType.READ, observable, value, value);
    }
    onSetAtIndex(observable: ObservableArrayType<any>, value: any, newValue: any, index: number): void {
        this.addOperation(OperationType.WRITE_AT, observable, value, newValue, index);
    }
    onGetAtIndex(observable: ObservableArrayType<any>, value: any, index: number): void {
        this.addOperation(OperationType.READ_AT, observable, value, value, index);
    }

    protected primitiveTypeObservers: PrimitiveTypeContext[] = [];
    protected arrayTypeObservers: ArrayTypeContext[] = [];

    protected operations: Operation[] = [];
    protected nextOperationIndex: number = 0;
    protected lastExecutedCodeLineNumber: number = -1;
    protected lastExecutedOperationIndex: number = -1;

    protected maxLineNumber: number = 0;

    protected status: OperationRecorderStatus = OperationRecorderStatus.Idle;

    protected addOperation(type: OperationType, observable?: any, oldValue?: any, newValue?: any, index: number = -1) {
        this.operations.push(new Operation(type, this.lastExecutedCodeLineNumber, observable, oldValue, newValue, index));
    }

    public getFirstCodeLineNumber(): number {
        if (this.operations.length == 0)
            return 0;

        return this.operations[0].codeLineNumber;
    }

    public getLastCodeLineNumber(): number {
        if (this.operations.length == 0) return 0;

        return this.operations[this.operations.length - 1].codeLineNumber;
    }

    public getCurrentCodeLineNumber(): number { return this.lastExecutedCodeLineNumber; }
    public getNextCodeLineNumber(): number {
        if (this.nextOperationIndex < this.operations.length && this.nextOperationIndex >= 0) {
            return this.operations[this.nextOperationIndex].codeLineNumber;
        }

        return this.getCurrentCodeLineNumber();
    }

    public markStartCodeLine(lineNumber: number): boolean {
        this.lastExecutedCodeLineNumber = lineNumber;
        this.addOperation(OperationType.NONE);

        return true;
    }

    public registerPrimitives<Type>(observables: ObservablePrimitiveType<Type>[]) {
        for (let observable of observables)
            this.registerPrimitive(observable);
    }

    public registerPrimitive<Type>(observable: ObservablePrimitiveType<Type>) {
        this.primitiveTypeObservers.push(new PrimitiveTypeContext(observable));
    }

    public registerArrays<Type>(observables: ObservableArrayType<Type>[]) {
        for (let observable of observables)
            this.registerArray(observable);
    }

    public registerArray<Type>(observable: ObservableArrayType<Type>) {
        this.arrayTypeObservers.push(new ArrayTypeContext(observable));
    }

    public startRecording() {
        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.observable.registerObserver(this);
        }

        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.observable.registerObserver(this);
        }

        this.status = OperationRecorderStatus.Recording;
    }

    public stopRecording() {
        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.observable.unregisterObserver(this);
        }

        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.observable.unregisterObserver(this);
        }

        this.status = OperationRecorderStatus.Idle;
        this.maxLineNumber = this.lastExecutedCodeLineNumber; 
        //console.log(this.operations);
    }

    public startReplay() {
        if (this.status != OperationRecorderStatus.Idle)
            throw "Operation Recorder not IDLE";

        for (let primitiveObservers of this.primitiveTypeObservers) {
            primitiveObservers.observable.setValue(primitiveObservers.initialData);
        }
        for (let arrayObservers of this.arrayTypeObservers) {
            arrayObservers.observable.setValues(arrayObservers.initialData);
        }

        this.nextOperationIndex = 0;
        this.lastExecutedCodeLineNumber = this.getFirstCodeLineNumber();
        this.status = OperationRecorderStatus.Replaying;
    }

    public stopReplay() {
        this.nextOperationIndex = 0;
        this.status = OperationRecorderStatus.Idle;
    }

    public advanceOneCodeLine(): void {
        this.executeOneCodeLine(false);
    }

    public reverseOneCodeLine(): void {
        this.executeOneCodeLine(true);
    }

    private checkRecoverExecutionEdges(reverse: boolean = false) {
        if (!reverse) { // Advance from start
            if (this.nextOperationIndex == -1)
                this.nextOperationIndex = 0;
        } else {
            if (this.nextOperationIndex == this.operations.length)
                this.nextOperationIndex = this.operations.length - 1;
        }
    }

    private getNextOperation(): Operation {
        if (this.nextOperationIndex >= 0 && this.nextOperationIndex < this.operations.length)
            return this.operations[this.nextOperationIndex];

        return undefined;
    }

    private executeOneCodeLine(reverse: boolean = false) {
        this.checkRecoverExecutionEdges(reverse);

        let currentOperationToExecute = this.getNextOperation();
        if (!currentOperationToExecute)
            return;

        let codeLineToExecute = currentOperationToExecute.codeLineNumber;

        do {
            this.executeCurrentOperation(reverse);

            currentOperationToExecute = this.getNextOperation();
            if (!currentOperationToExecute)
                return;

            if (this.nextOperationIndex == this.lastExecutedOperationIndex)
                return;
        }
        while (codeLineToExecute == currentOperationToExecute.codeLineNumber);
    }

    public executeCurrentOperation(reverse: boolean = false): void {
        if (this.status == OperationRecorderStatus.Recording)
            throw "Operation Recorder not IDLE";

        let operation = this.getNextOperation();

        if (!operation) {
            return;
        }

        switch (operation.type) {
            case OperationType.READ:
                {
                    operation.observable.getValue(operation.oldValue);
                    break;
                }
            case OperationType.READ_AT:
                {
                    operation.observable.getAtIndex(operation.index);
                    break;
                }
            case OperationType.WRITE:
                {
                    operation.observable.setValue(reverse ? operation.oldValue : operation.newValue);
                    break;
                }
            case OperationType.WRITE_AT:
                {
                    operation.observable.setValueAtIndex(reverse ? operation.oldValue : operation.newValue, operation.index);
                    break;
                }
        }

        this.lastExecutedOperationIndex = this.nextOperationIndex;
        this.lastExecutedCodeLineNumber = operation.codeLineNumber;

        this.nextOperationIndex += (reverse ? -1 : 1);
        if (this.nextOperationIndex < 0)
            this.nextOperationIndex = -1;

        if (this.nextOperationIndex >= this.operations.length)
            this.nextOperationIndex = this.operations.length;
    }
}