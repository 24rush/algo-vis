export class ScopeObservables {
    public runtimeScopeName: string;
    public observables: any[] = [];

    constructor(scopeName: string) {
        this.runtimeScopeName = scopeName;
    }
}

export class RuntimeScopeMonitor {
    protected currentScope: ScopeObservables[] = [];
    protected currentScopeString: string = "";

    public reset() {
        this.currentScope = [];
        this.currentScopeString = "";
    }

    public scopeStart(scopeName: string) {
        this.currentScope.push(new ScopeObservables(scopeName));
        this.computeCurrentScopeString();
    }

    public scopeEnd(scopeName: string) {
        if (this.currentScope[this.currentScope.length - 1].runtimeScopeName == scopeName) {
            this.currentScope.pop();
            this.computeCurrentScopeString();
        }
        else {
            console.log(this.currentScope + " vs " + scopeName);
            throw ('LAST SCOPE IS NOT AS EXPECTED ');
        }
    }

    public getCurrentScope() : string {
        return this.currentScopeString;
    }

    public getScopesReversed(): ScopeObservables[] {
        return [...this.currentScope].reverse();
    }

    public getParentScope(): string {
        let scopes = [...this.currentScope];
        scopes.pop();

        if (scopes.length == 0)
            scopes.push(new ScopeObservables("global"));

        let currentRuntimeScopeExclLast = "";
        scopes.forEach(scopeObservables => currentRuntimeScopeExclLast += scopeObservables.runtimeScopeName + ".");

        return this.removeTrailingDot(currentRuntimeScopeExclLast);
    }

    public findRuntimeObservableWithName(varName: string): [string, any] {
        let allScopes = this.getScopesReversed();
        let firstFunctionChecked = false;

        for (let i = 0; i < allScopes.length; i++) {            
            let scopeRuntime = allScopes[i].runtimeScopeName;

            if (firstFunctionChecked && (scopeRuntime.includes('!') || scopeRuntime === "local")) {
                continue; // skip all remaining functions and locals till we get to global
            }

            for (let runtimeObservable of allScopes[i].observables) {
                if (runtimeObservable.name == varName) {
                    // Go up the hierarchy and concatenate scopes
                    let wholeRuntimeScopeName = "";
                    for (let j = allScopes.length - 1; j >= i; j--)
                        wholeRuntimeScopeName += allScopes[j].runtimeScopeName + '.';

                    return [this.removeTrailingDot(wholeRuntimeScopeName), runtimeObservable];
                }
            }

            if (allScopes[i].runtimeScopeName.includes('!')) {
                firstFunctionChecked = true;
            }
        }

        return [undefined, undefined];
    }

    public storeRuntimeObservableInScope(runtimeObservable: any) {
        this.currentScope[this.currentScope.length - 1].observables.push(runtimeObservable);
    }

    public attachVarToScope(varName: string, scopeName: string): string {
        if (varName != "")
            return scopeName + "." + varName;

        return scopeName;
    }

    public static scopeNameToFunctionScope(scopeName: string): string {
        return (scopeName != "global" && scopeName != "local" && scopeName[0] != '!') ? "!" + scopeName : scopeName;
    }

    private computeCurrentScopeString() {
        this.currentScopeString = "";
        this.currentScope.forEach(scopeObservables => this.currentScopeString += scopeObservables.runtimeScopeName + ".");
        this.currentScopeString = this.removeTrailingDot(this.currentScopeString);
    }

    private removeTrailingDot(scope: string): string {
        if (scope.lastIndexOf('.') == scope.length - 1) {
            return scope.slice(0, -1);
        }

        return scope;
    }
}
