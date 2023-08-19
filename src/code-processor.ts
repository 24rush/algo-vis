import { RuntimeScopeMonitor } from "./runtime-scope-monitor";

var esprima = require('esprima')

export enum VarType {
    let = 0,
    var
};

class IndexRange {
    constructor(public s: number, public e: number) { }
}

export class VariableDeclaration {
    public endOfDefinitionIndexes: number[] = [];
    public source: string = "";

    constructor(public declarationScopeName: string, public name: string, public vartype: VarType, public endOfDefinitionIndex: number, public isBinary: boolean) {
        this.endOfDefinitionIndexes = [endOfDefinitionIndex];
    }
}

class ScopeDeclaration {
    constructor(public name: string, public startOfDefinitionIndex: number, public endOfDefinitionIndex: number) { }
}

class PushFuncParams {
    constructor(public startOfDefinitionIndex: number, public endOfDefinitionIndex: number, public funcScopeName: string, public varToParams: [string, string][]) { }
}

export class CodeProcessor {

    private code: string = "";

    private varDeclarations: Record<string, Record<string, VariableDeclaration>>; // [scopeName][varname] = VariableDeclaration
    private scopes: ScopeDeclaration[] = [];
    private funcDefs: Record<string, string[]>; // [funcName] = [param...]
    private pushFuncParams: PushFuncParams[] = [];
    private emptyCodeLineNumbers: number[] = [];
    private fcnReturns: number[] = [];
    private markLineOverrides: number[] = [];
    private noMarkLineZone: IndexRange[] = [];
    private explicitBraces: IndexRange[] = []; // braces for missing blocks    

    getCode() { return this.code; }
    setCode(code: string, injectMarkers: boolean = true): [boolean, string] {
        let status = true;
        this.resetCodeParsingState();

        let regex = new RegExp("(alert)|(confirm)|(prompt)", 'g')
        this.code = code.replace(regex, '$&Wrap')

        if (injectMarkers) {
            [status,] = this.parseCode();
        }

        this.code = '\'use strict\'; \n\
            let BinarySearchTree = Types.BinarySearchTree; \
            let BinaryTree = Types.BinaryTree;\
            let Graph = Types.Graph;\
            let GraphType = Types.GraphType; \
            let GraphNode = Types.GraphNode; \
            let BinaryTreeNode = Types.BinaryTreeNode; \
            let TreeNodeSide = Types.ParentSide;       \
            let markcl = Funcs.markcl; \
            let forcemarkcl = Funcs.forcemarkcl; \
            let setVar = Funcs.setVar; \
            let startScope = Funcs.startScope; \
            let endScope = Funcs.endScope; \
            let pushParams = Funcs.pushParams; \
            let popParams = Funcs.popParams; \
            let funcWrap = Funcs.funcWrap; \
            let promptWrap = Funcs.promptWrap; \
            let alertWrap = Funcs.alertWrap; \
            let confirmWrap = Funcs.confirmWrap; \n' + this.code;

        return [status, ""];
    }

    resetCodeParsingState() {
        this.emptyCodeLineNumbers = [];
        this.varDeclarations = {}; this.scopes = []; this.fcnReturns = [];
        this.funcDefs = {}; this.pushFuncParams = [];
        this.markLineOverrides = []; this.noMarkLineZone = []; this.explicitBraces = [];
    }

    private localhostDebug: boolean = true;
    private debugEnabled: boolean = (typeof window !== 'undefined' && window.location.hostname == 'localhost') ? this.localhostDebug : false;

    dumpDebugInfo() {
        if (this.debugEnabled) {
            console.log("VARS: "); console.log(this.varDeclarations);
            console.log("BRACES: "); console.log(this.explicitBraces);
            console.log("SCOPES: "); console.log(this.scopes);
            console.log("FUNCDEFS: "); console.log(this.funcDefs);
            console.log("PUSHPARAMS: "); console.log(this.pushFuncParams);
            console.log("NOMARKLINE: "); console.log(this.noMarkLineZone);
            console.log("MARKLINEOVERRIDES: "); console.log(this.markLineOverrides);

            console.log(this.code);
        }
    }

    private parseVariable(scopeName: string, vardata: any, declIndexOverwrite: number = -1) {
        if (!('declarations' in vardata) || vardata.declarations.length == 0)
            return;

        for (let decl of vardata.declarations) {
            let varType = vardata.kind == "var" ? VarType.var : VarType.let;
            let varScope = scopeName;

            if (varType == VarType.var && scopeName.indexOf('.') != -1) {
                varScope = scopeName.substring(0, scopeName.indexOf('.'));
            }

            let isBinary = decl.init && decl.init.raw && decl.init.raw.includes('0b');

            let varDecl = this.createVariable(varScope, decl.id.name, varType, declIndexOverwrite == -1 ? vardata.range[1] : declIndexOverwrite, isBinary);

            if (decl.init) {
                switch (decl.init.type) {
                    case "Identifier": {
                        varDecl.source = decl.init.name;
                        break;
                    }
                    case "ArrayExpression":
                    case "ObjectExpression": {
                        this.addNoMarklineZone(decl.init.range[0] - 1, decl.init.range[1] + 1);
                        break;
                    }
                    case "CallExpression": {
                        // Pass variable declaration start/end to be used for noMarkZone
                        this.extractVariables(scopeName, decl.init, vardata.range[0], vardata.range[1]);
                        break;
                    }
                    case "ArrowFunctionExpression": {
                        let funcName = decl.id.name;

                        for (let param of decl.init.params) {
                            if (!(funcName in this.funcDefs)) {
                                this.funcDefs[funcName] = [];
                            }

                            this.funcDefs[funcName].push(param.name);
                            this.createVariable(RuntimeScopeMonitor.scopeNameToFunctionScope(funcName), param.name, VarType.var, decl.init.body.range[0] + 1);
                        }

                        this.scopes.push(new ScopeDeclaration(RuntimeScopeMonitor.scopeNameToFunctionScope(decl.id.name), decl.init.body.range[0] + 1, decl.init.body.range[1] - 1));
                        this.extractVariables(RuntimeScopeMonitor.scopeNameToFunctionScope(decl.id.name), decl.init.body);

                        break;
                    }
                }
            }
        }
    }

    private extractVariables(scopeName: string, scope: any, varDeclStart?: number, varDeclEnd?: number) {
        if (!scope)
            return;

        let body = [scope];

        if (scope.body)
            body = !('length' in scope.body) && scope.body.body ? scope.body.body : (!('length' in scope.body) ? [scope.body] : scope.body);

        for (let item of body) {
            switch (item.type) {
                case "VariableDeclaration":
                    {
                        this.parseVariable(scopeName, item);
                        break;
                    }
                case 'FunctionDeclaration':
                    {
                        var funcName = item.id.name;

                        for (let param of item.params) {
                            if (!(funcName in this.funcDefs)) {
                                this.funcDefs[funcName] = [];
                            }

                            this.funcDefs[funcName].push(param.name);
                            this.createVariable(scopeName + '.' + RuntimeScopeMonitor.scopeNameToFunctionScope(funcName), param.name, VarType.let, item.body.range[0] + 1);
                        }

                        //this.scopes.push(new ScopeDeclaration(RuntimeScopeMonitor.scopeNameToFunctionScope(funcName), item.body.range[0] + 1, item.body.range[1] - 1));
                        this.extractVariables(scopeName + '.' + RuntimeScopeMonitor.scopeNameToFunctionScope(funcName), item);
                        break;
                    }
                case "BreakStatement":
                    {
                        // just end local scope
                        this.scopes.push(new ScopeDeclaration('local', -1, item.range[0]));
                        break;
                    }
                case "ReturnStatement":
                    {
                        let indexReturnStatement = item.range[0];
                        for (let scopeDecl of this.scopes) {
                            let parentScope = scopeDecl.name.split('.local').join('');

                            if (parentScope != scopeName)
                                continue;

                            if (scopeDecl.startOfDefinitionIndex < indexReturnStatement &&
                                scopeDecl.endOfDefinitionIndex > indexReturnStatement) {
                                if (scopeDecl.name.indexOf("global") != -1)
                                    continue;

                                scopeDecl.endOfDefinitionIndex = indexReturnStatement;
                            }
                        }

                        this.fcnReturns.push(item.range[0]);

                        break;
                    }
                case "ForOfStatement":
                case "ForInStatement":
                    {
                        let indexParen = this.code.lastIndexOf(')', item.body.range[0]);
                        this.explicitBraces.push(new IndexRange(indexParen + 1, item.body.range[1]));

                        this.markLineOverrides.push(indexParen + 1);
                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));

                        if (item.left && item.left.declarations && item.left.declarations.length > 0) {
                            this.createVariable(scopeName + ".local", item.left.declarations[0].id.name, VarType.let, item.body.range[0] + 1);
                        }

                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case "ForStatement":
                    {
                        // Add braces even if they exist (last closed paren before the body)
                        let indexParen = this.code.lastIndexOf(')', item.body.range[0]);
                        this.explicitBraces.push(new IndexRange(indexParen + 1, item.body.range[1]));

                        this.markLineOverrides.push(indexParen + 1);
                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));
                        this.parseVariable(scopeName + ".local", item.init, indexParen + 1);

                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case "IfStatement":
                    {
                        //this.markLineOverrides.push(item.range[0]);

                        let addScopeIfBlockStatement = (item: any) => {
                            if (item && item.type == "BlockStatement") {
                                this.scopes.push(new ScopeDeclaration("local", item.range[0] + 1, item.range[1] - 1));
                            }
                        };

                        if (item.consequent && item.consequent.type != "BlockStatement") {
                            let indexParen = this.code.lastIndexOf(')', item.consequent.range[0]);
                            this.explicitBraces.push(new IndexRange(indexParen + 1, item.consequent.range[1]));
                        }

                        if (item.alternate) {
                            if (item.alternate.type != "BlockStatement" && item.alternate.type != "IfStatement") {
                                this.explicitBraces.push(new IndexRange(item.alternate.range[0], item.alternate.range[1]));
                            }

                            // No marklines before else
                            this.addNoMarklineZone(item.consequent.range[1], item.alternate.range[0] - 4); // minus else keyword
                        }

                        addScopeIfBlockStatement(item.consequent);
                        addScopeIfBlockStatement(item.alternate);

                        this.extractVariables(scopeName + ".local", item.consequent);
                        this.extractVariables(scopeName + ".local", item.alternate);

                        break;
                    }
                case 'DoWhileStatement':
                    {
                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));
                        this.extractVariables(scopeName + ".local", item);

                        break;
                    }
                case 'WhileStatement':
                    {
                        // Add braces even if they exist (last closed paren before the body)
                        let indexParen = this.code.lastIndexOf(')', item.body.range[0]);
                        this.explicitBraces.push(new IndexRange(indexParen + 1, item.body.range[1]));

                        this.markLineOverrides.push(indexParen + 1);
                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));
                        this.extractVariables(scopeName + ".local", item);

                        break;
                    }
                case 'BlockStatement':
                    {
                        this.markLineOverrides.push(item.body.range ? item.body.range[0] + 1 : item.range[0] + 1);
                        this.scopes.push(new ScopeDeclaration("local", item.range[0], item.range[1]));
                        this.extractVariables(scopeName + ".local", item);
                        break;
                    }
                case 'SwitchStatement':
                    {
                        for (let caseStatement of item.cases) {
                            if ('consequent' in caseStatement && caseStatement.consequent.length > 0) {
                                let consq = caseStatement.consequent[0];

                                if (consq.type == "BlockStatement")
                                    this.markLineOverrides.push(caseStatement.consequent[0].range[0] + 1);
                                else {
                                    this.markLineOverrides.push(caseStatement.consequent[0].range[0]);
                                }
                            }
                        }

                        break;
                    }
                case 'ExpressionStatement':
                    {
                        this.extractVariables(scopeName, item.expression);
                        break;
                    }
                case 'BinaryExpression':
                    {
                        this.extractVariables(scopeName, item.left);
                        this.extractVariables(scopeName, item.right);
                        break;
                    }
                case "CallExpression": {
                    if (item.callee && item.callee.object && item.callee.object.name) {
                        let varName = item.callee.object.name;

                        let [foundInScope, vardeclaration] = this.searchScopeAndParent(scopeName, varName);

                        if (vardeclaration.length) {
                            // setVar should be at the end of any function call of which this call is a part of
                            // ex. console.log(vect.shift(), 'text');                            
                            let indexParen = this.code.indexOf(');', item.range[0]);
                            this.createVariable(foundInScope, varName, vardeclaration[0].vartype, indexParen + 1);
                        }
                    }
                    else if (item.callee.name in this.funcDefs) { // ignoring functions not defined in program
                        let calledFunc = item.callee.name;

                        let varToParamPairs: [string, string][] = [];
                        for (let i = 0; i < item.arguments.length; i++) {
                            let argument = item.arguments[i];
                            let paramName = argument.name;

                            let vardeclaration = this.getVarDeclsTillFuncBorder(scopeName, undefined, paramName);

                            if (vardeclaration.length > 0 && calledFunc in this.funcDefs) {
                                varToParamPairs.push([RuntimeScopeMonitor.scopeNameToFunctionScope(calledFunc) + "." + this.funcDefs[calledFunc][i], paramName]);
                            } //else
                            // throw ('Func unknown ' + calledFunc + " " + (calledFunc in this.funcDefs))
                        }

                        this.pushFuncParams.push(new PushFuncParams(item.range[0], item.range[1],
                            RuntimeScopeMonitor.scopeNameToFunctionScope(calledFunc),
                            varToParamPairs));
                    }

                    if (item.arguments && item.arguments.length) {
                        // Don't add line markers in between function parameters
                        this.addNoMarklineZone(item.range[0] + 1, item.range[1]);
                    }

                    for (let arg of item.arguments)
                        this.extractVariables(scopeName, arg);

                    break;
                }
                case "UnaryExpression":
                    {
                        if (item.operator && item.operator == "delete") {
                            let varName = item.argument.object.name;

                            let [foundInScope, vardeclaration] = this.searchScopeAndParent(scopeName, varName);

                            if (vardeclaration.length > 0) {
                                this.createVariable(foundInScope, varName, vardeclaration[0].vartype, item.range[1] + 1);
                            }
                        }

                        break;
                    }
                case "UpdateExpression":
                case "AssignmentExpression": {
                    let varName = '';

                    if (item.type == "AssignmentExpression") {
                        varName = (!item.left.object || !item.left.object.name) ? item.left.name : item.left.object.name;

                        if (!varName && item.left.object.object) { // handle matrix assignment
                            varName = item.left.object.object.name;
                        }

                        if (!varName && item.left && item.left.object && item.left.object.type == "ThisExpression") {
                            varName = "this";
                        }
                    }
                    else if (item.type == "UpdateExpression") // ++ operator
                    {
                        varName = item.argument.name;
                    }
                    else
                        varName = item.argument.object.name;

                    let varDeclarations = [];
                    let foundInScope = scopeName;

                    if (varName == "this") {
                        varDeclarations.push(new VariableDeclaration(scopeName, varName, VarType.let, -1, false));
                    }
                    else {
                        [foundInScope, varDeclarations] = this.searchScopeAndParent(scopeName, varName);
                    }

                    if (varDeclarations.length > 0) {
                        this.createVariable(foundInScope, varName, varDeclarations[0].vartype, item.range[1] + 1);
                    }

                    if (item.right && item.right.type == "ObjectExpression") {
                        this.addNoMarklineZone(item.range[0], item.range[1]);
                    }

                    break;
                }
            }
        }
    }

    private createVariable(scopeName: string, varName: string, varType: VarType, endOfDefinitionIndex: number, isBinary: boolean = false): VariableDeclaration {
        let varDecl = new VariableDeclaration(scopeName, varName, varType, endOfDefinitionIndex, isBinary);

        if (!(scopeName in this.varDeclarations))
            this.varDeclarations[scopeName] = {};

        if (varName in this.varDeclarations[scopeName]) {
            if (this.varDeclarations[scopeName][varName].endOfDefinitionIndexes.indexOf(varDecl.endOfDefinitionIndex) == -1)
                this.varDeclarations[scopeName][varName].endOfDefinitionIndexes.push(varDecl.endOfDefinitionIndex);
        } else {
            this.varDeclarations[scopeName][varName] = varDecl;
        }

        return varDecl;
    }

    private addNoMarklineZone(start: number, end: number) {
        this.noMarkLineZone.push(new IndexRange(start, end));
    }

    private isEmptyLine(lineNumber: number): boolean {
        return this.emptyCodeLineNumbers.indexOf(lineNumber) != -1;
    }

    private isInNoMarkLineZone(index: number) {
        return undefined != this.noMarkLineZone.find((noMarkZoneRange) => index >= noMarkZoneRange.s && index <= noMarkZoneRange.e);
    }

    private updateNoMarkLineZone(injectionIndex: number, injectionSize: number) {
        for (let noMarkZoneRangeIndex in this.noMarkLineZone) {
            let noMarkZoneRange = this.noMarkLineZone[noMarkZoneRangeIndex];

            if (injectionIndex <= noMarkZoneRange.s)
                noMarkZoneRange.s += injectionSize;

            if (injectionIndex <= noMarkZoneRange.e)
                noMarkZoneRange.e += injectionSize;
        };
    }

    private injectCookies() {
        let injectAtIndex: any = {};
        let addCodeInjection = (index: number, injectedCode: string) => {
            if (!(index in injectAtIndex))
                injectAtIndex[index] = [];

            injectAtIndex[index].push(injectedCode);
        };

        // Add missing braces
        for (const explicitBrace of this.explicitBraces) {
            addCodeInjection(explicitBrace.s, "{");
            addCodeInjection(explicitBrace.e, "}");
        }

        // Scope start setting
        for (const scope of this.scopes) {
            if (scope.startOfDefinitionIndex == -1) // break statements dont set begin index
                continue;

            let injectedCode = `;startScope('${scope.name}');`;
            addCodeInjection(scope.startOfDefinitionIndex, injectedCode);
        };

        // Variable setting
        for (const scope of Object.keys(this.varDeclarations)) {
            for (const index of Object.keys(this.varDeclarations[scope])) {
                let vardata = this.varDeclarations[scope][index];
                for (const endOfDefinitionIndex of vardata.endOfDefinitionIndexes) {
                    let injectedCode = "";
                    if (vardata.source === "")
                        injectedCode = `;setVar('${vardata.name}', ${vardata.name});`;
                    else
                        injectedCode = `;setVar('${vardata.name}', ${vardata.name}, '${vardata.source}');`;

                    addCodeInjection(endOfDefinitionIndex, injectedCode);
                };
            };
        };

        // Scope end setting
        let sortedScopes = this.scopes.sort((a: ScopeDeclaration, b: ScopeDeclaration) => {
            if (a.endOfDefinitionIndex != b.endOfDefinitionIndex)
                return a.endOfDefinitionIndex - b.endOfDefinitionIndex;

            return b.name.charCodeAt(0) - a.name.charCodeAt(0);
        });

        for (const scope of sortedScopes) {
            let injectedCode = (scope.name == "global" ? "\n" : "") + `;endScope('${scope.name}');`;
            addCodeInjection(scope.endOfDefinitionIndex, injectedCode);
        };

        // Push function parameters
        for (const pushParams of this.pushFuncParams) {
            let injectedCode = `funcWrap( {f: () => { pushParams(${JSON.stringify(pushParams.varToParams)}); startScope('` + pushParams.funcScopeName + `'); let ret = `;
            addCodeInjection(pushParams.startOfDefinitionIndex, injectedCode);

            injectedCode = `; popParams(${JSON.stringify(pushParams.varToParams)}); endScope('` + pushParams.funcScopeName + `'); return ret;}} )`;
            addCodeInjection(pushParams.endOfDefinitionIndex, injectedCode);
        }

        // Function returns
        for (const endOfDefinitionIndex of this.fcnReturns) {
            addCodeInjection(endOfDefinitionIndex, "<FCNRET>");
        };

        // Mark line overrides
        for (const endOfDefinitionIndex of this.markLineOverrides) {
            addCodeInjection(endOfDefinitionIndex, "<FORCEMARKLINE>");
        };

        // Inject cookies in code        
        for (const indexEndOfDef of Object.keys(injectAtIndex).reverse()) {
            let index = parseInt(indexEndOfDef);

            let stringsToInject = injectAtIndex[index].join('');
            this.code = this.code.substring(0, index) + stringsToInject + this.code.substring(index);

            this.updateNoMarkLineZone(index, stringsToInject.length);
        };
    }

    private parseCode(): [boolean, string] {
        if (!this.code)
            return [false, "No code"];

        let syntax = undefined;

        try {
            syntax = esprima.parseScript(this.code, { range: true });
            if (this.debugEnabled) console.log(syntax);
        } catch (error) {
            return [false, "line " + error.lineNumber + ": " + error.description];
        }

        this.varDeclarations = {};
        this.scopes = [];
        this.fcnReturns = [];
        this.markLineOverrides = [];

        this.scopes.push(new ScopeDeclaration('global', syntax.range[0], syntax.range[1]));
        this.markLineOverrides.push(syntax.range[1]);

        this.extractVariables('global', syntax);

        this.injectCookies();

        let replaceTokens = (token: string, replacement: string, line: string): string => {
            if (line.indexOf(token) == -1)
                return line;

            let replacedTokenStr = "";
            let tokenizedLines = line.split(token);
            let diffLen = replacement.length - token.length;

            for (let indexLine = 0; indexLine < tokenizedLines.length - 1; indexLine++) {
                let tokenizedLine = tokenizedLines[indexLine];
                if (this.isInNoMarkLineZone(this.code.length + tokenizedLine.length)) {
                    replacedTokenStr += tokenizedLine;
                    this.updateNoMarkLineZone(this.code.length + replacedTokenStr.length, diffLen);
                }
                else {
                    replacedTokenStr += (tokenizedLine + replacement);
                    // MISTERY
                    let insertedSize = (tokenizedLine + replacement).length;
                    this.updateNoMarkLineZone(this.code.length + replacedTokenStr.length - insertedSize, diffLen);
                }
            }

            return replacedTokenStr + (tokenizedLines.length > 1 ? tokenizedLines[tokenizedLines.length - 1] : line);
        }

        let insertInLine = (insertionStr: string, offsetInLine: number, line: string): string => {
            if (insertionStr != '\n' && this.isInNoMarkLineZone(this.code.length + offsetInLine))
                return line;

            this.updateNoMarkLineZone(this.code.length + offsetInLine, insertionStr.length);

            return line.substring(0, offsetInLine) + insertionStr + line.substring(offsetInLine);
        }

        // Mark lines with no code
        let skippedLineMarkers = ['{', '}'];
        let codeLineByLine = this.code.split('\n');
        this.code = "";
        for (let [lineIndex, line] of codeLineByLine.entries()) {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0 || trimmedLine.indexOf('//') == 0 ||
                (trimmedLine.length == 1 && (skippedLineMarkers.indexOf(trimmedLine) != -1))) {
                this.emptyCodeLineNumbers.push(lineIndex + 1);
            }

            if ((trimmedLine.startsWith('/*') && trimmedLine.indexOf('*/') == -1) || (trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/'))) {
                this.emptyCodeLineNumbers.push(lineIndex + 1);
            }

            line = line + '\n';

            if (!this.isEmptyLine(lineIndex + 1)) {
                // Function returns end the current scope      
                line = replaceTokens("<FCNRET>", ";endScope();", line);

                let codeLineMarker2 = `;forcemarkcl(${lineIndex + 1});`;
                line = replaceTokens("<FORCEMARKLINE>", codeLineMarker2, line);

                let codeLineMarker = `;markcl(${lineIndex + 1}); `;
                let indxOfCommentEnding = line.indexOf('*/'); // Don't put line marker in comment section
                if (indxOfCommentEnding != -1 && indxOfCommentEnding < line.length - 3) {
                    line = insertInLine(codeLineMarker, indxOfCommentEnding + 2, line);
                }
                else
                    if (line.indexOf("case") == -1) {
                        line = insertInLine(codeLineMarker, line.trim()[0] == '{' ? line.indexOf('{') + 1 : 0, line);
                    }
            }

            this.code += line;
        }

        return [true, ""];
    }


    private searchScopeAndParent(startScope: string, varName: string): [string, VariableDeclaration[]] {
        let foundInScope = startScope;

        let vardeclarations = this.getVarDeclsTillFuncBorder(foundInScope, undefined, varName);
        if (vardeclarations.length == 0) {
            foundInScope = startScope.split(".local").join("");
            vardeclarations = this.getVarDeclsTillFuncBorder(foundInScope, undefined, varName);

            if (vardeclarations.length == 0) {
                foundInScope = 'global';
                vardeclarations = this.getVarDeclsTillFuncBorder(foundInScope, undefined, varName);
            }
        } else {
            foundInScope = vardeclarations[0].declarationScopeName;
        }

        return [foundInScope, vardeclarations];
    };

    public searchVarInAllScopes(varName: string): VariableDeclaration[] {
        let foundVars: VariableDeclaration[] = [];

        for (let scopeName in this.varDeclarations) {
            let varsInScope = this.varDeclarations[scopeName];

            if (varsInScope == undefined || Object.keys(varsInScope).length == 0)
                continue;

            for (let variableName of Object.keys(varsInScope)) {
                let variable = this.varDeclarations[scopeName][variableName];

                if ((variable.vartype == VarType.var || variable.declarationScopeName == "global") && variable.name == varName)
                    foundVars.push(variable);
            }
        }

        return foundVars;
    }

    public getVarDeclsTillFuncBorder(scopeName: string, varType?: VarType, varName?: string): VariableDeclaration[] {
        // Search for a scope chain that ends at a function border
        let foundScopes = [];
        let scopeChain = scopeName.split('.').reverse();
        for (let scope of scopeChain) {
            if (scope.indexOf('!') != -1) {
                foundScopes.push(scope);
                break;
            }

            foundScopes.push(scope);
        }

        let foundVars: VariableDeclaration[] = [];
        foundScopes.reverse();

        while (foundScopes.length) {
            // Max scope chain from a function border to our variable
            // and then up the chain till it reaches the function
            scopeName = foundScopes.join('.');

            for (let varDeclScope of Object.entries(this.varDeclarations)) {
                if (varDeclScope[0].endsWith(scopeName)) {
                    let varsInScope = this.varDeclarations[varDeclScope[0]];
                    for (let variable of Object.values(varsInScope)) {                        
                        if (varType != undefined && variable.vartype != varType)
                            continue;

                        if (varName != undefined && variable.name != varName)
                            continue;

                        foundVars.push(variable);
                        if (varName != undefined)
                            break;
                    }
                }
            }

            foundScopes.pop();
        }

        return foundVars;
    }
}