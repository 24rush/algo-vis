
export class RuntimeScopeMonitor {
    protected currentScope: string[] = [];

    public reset() {
        this.currentScope = [];
    }

    public scopeStart(scopeName: string) {
        this.currentScope.push(scopeName);
    }

    public scopeEnd(scopeName: string) {
        if (this.currentScope[this.currentScope.length - 1] == scopeName)
            this.currentScope.pop();
        else {
            console.log(this.currentScope + " vs " + scopeName);
            throw ('LAST SCOPE IS NOT AS EXPECTED ');
        }
    }

    public getCurrentScope() {
        return this.currentScope.join('.');
    }

    public getFullScopeOfVar(scopeName: string, varName: string) {
        let fullScope = this.attachVarToScope(varName, scopeName);

        if (!scopeName.startsWith('global'))
            fullScope = this.extendScopeNameWith("global", fullScope);
        
        return fullScope;
    }

    public getLastScope() : string {
        if (this.currentScope.length > 0)
            this.currentScope[this.currentScope.length - 1];
        
        return "";
    }

    public getScopeExclLast() {
        let scopes = [...this.currentScope];
        scopes.pop();

        return scopes.join('.');
    }

    public attachVarToScope(varName: string, scopeName: string) : string {
        if (varName != "")
            return scopeName + "." + varName;
        
        return scopeName;
    }

    public extendScopeNameWith(scopeName: string, extensionScope: string) : string {
        return scopeName + "." + extensionScope;
    }
}
