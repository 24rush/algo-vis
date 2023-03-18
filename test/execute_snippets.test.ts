import { suite, test } from '@testdeck/mocha';
import { mock, instance, when, anyNumber, anything, anyString } from 'ts-mockito';
import { expect } from 'chai';

import { Graph, BinaryTree, BinarySearchTree, BinaryTreeNode } from '../src/av-types'
import { GraphType, NodeBase, ParentSide } from '../src/av-types-interfaces'
import { CodeProcessor } from '../src/code-processor'

const fs = require('fs');
const path = require('path');

class CodeMarkers {
    forcemarkcl(lineNumber: number): void {
    }
    markcl(lineNumber: number): void {
    }
    startScope(scopeName: string): void {
    }
    endScope(scopeName: string): void {
    }
    pushParams(params: [string, string][]): void {
    }
    popParams(params: [string, string][]): void {
    }
    setVar(varname: string, object: any, varsource: string): void {
    }
    funcWrap(func: any): void {
    }
    promptWrap(title?: string, defValue?: string): string {
        return "2";
    }
    alertWrap(title?: string): void {
    }
    confirmWrap(title?: string): boolean {
        return true;
    }
}

class SnippetData {
    constructor(public snipFile: string, public id: string, public code?: string, public desc?: string) { }
}

@suite class ExecuteSnippets {
    private readonly SNIPPETS_PATH: string = "wordpress/snippets/";

    private codeProc: CodeProcessor = new CodeProcessor();
    private mockedCodeMarkers: CodeMarkers = mock(CodeMarkers);
    private codeMarkerFuncs: CodeMarkers = instance(this.mockedCodeMarkers);

    private codeTypeMocks: any = {
        Graph: Graph, GraphType: GraphType, GraphNode: NodeBase, BinaryTreeNode: BinaryTreeNode,
        BinaryTree: BinaryTree, BinarySearchTree: BinarySearchTree, ParentSide: ParentSide,
    };

    private excludedSnippetFiles: string[] = ["functii-basics.json"];

    private expectedToFailSnippets: SnippetData[] = [
        { "snipFile": "scopuri\\basics.ro.snip", "id": "0" },
        { "snipFile": "scopuri\\basics.ro.snip", "id": "3" }
    ]

    private isExpectedFailure(snipFile: string, id: string) {
        return this.expectedToFailSnippets.find(snipData => { return snipData.id == id && snipData.snipFile === snipFile }) != undefined;
    }

    private isExcludedSnippetFile(snipFile: string) {
        return this.excludedSnippetFiles.find(exclSnipFile => snipFile == exclSnipFile) != undefined;
    }

    private getSnippetSamples(): SnippetData[] {
        let snippetSamples: SnippetData[] = [];

        let files = fs.readdirSync(this.SNIPPETS_PATH);

        const targetFiles = files.filter(file => {
            return path.extname(file).toLowerCase() === ".json";
        });

        targetFiles.forEach((file: any) => {
            if (this.isExcludedSnippetFile(file))
                return;

            let jsonObj = JSON.parse(fs.readFileSync(this.SNIPPETS_PATH + file, 'utf8'));            
            let lang = ('ro' in jsonObj) ? 'ro' : 'en';

            jsonObj[lang].forEach(element => {
                snippetSamples.push(new SnippetData(jsonObj['src-' + lang], element['id'], element['code'], element['desc']))
            });
        });

        return snippetSamples;
    }

    private runFuncPrintException(snippet: SnippetData, func: any) {
        try {
            func();
        } catch (e) {
            console.log(snippet, e);
            throw e;
        }
    }

    before() {
    }

    @test 'Test snippet execution'() {
        var Types = this.codeTypeMocks;
        var Funcs = this.codeMarkerFuncs;

        when(this.mockedCodeMarkers.funcWrap(anything)).thenCall((arg: any) => (arg as unknown)[0].f());
        when(this.mockedCodeMarkers.promptWrap(anyString())).thenReturn("3");

        for (let snippet of this.getSnippetSamples()) {
            let [status,] = this.codeProc.setCode(snippet.code)

            expect(status).to.be.true;

            let funcUnderTest = () => this.runFuncPrintException(snippet, () => eval(this.codeProc.getCode()));
     
            if (this.isExpectedFailure(snippet.snipFile, snippet.id))
                expect(funcUnderTest).to.throw();
            else
                expect(funcUnderTest).to.not.throw();
        }     
    }
}