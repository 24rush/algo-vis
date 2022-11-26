var ace = require('ace-builds/src-min-noconflict/ace')
require('ace-builds/src-min-noconflict/mode-javascript')

export interface CodeRendererEventNotifier {
    onSourceCodeUpdated(newCode: string): void;
}

export class CodeRenderer {
    private editor: any;
    private marker: any;
    private Range = ace.require('ace/range').Range;
    private eventListeners: CodeRendererEventNotifier[] = [];
    private lineComments: string[] = [];

    constructor(codeEditorHtmlElement: HTMLElement, isReadonly: boolean = false) {
        let code = codeEditorHtmlElement.textContent;
        let codeLines = code.split('\n');

        if (codeLines && codeLines.length) {
            if (codeLines[0].trim() == '')
                codeLines.shift();

            code = codeLines.join('\n');
        }

        let newCode = "";
        if (code !== "") {
            [this.lineComments, newCode] = this.extractComments(code);
        }

        var convert = function (convert: string) {
            return convert.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        };

        this.editor = ace.edit(codeEditorHtmlElement.id);
        this.editor.setShowPrintMargin(false);
        this.editor.setAutoScrollEditorIntoView(true);
        this.editor.setReadOnly(isReadonly);

        this.editor.session.setMode("ace/mode/javascript");
        this.editor.session.setValue(convert(newCode));

        let timeoutReloadCode: any;
        let recompileCodeInterval = 3000;

        let notifySourceCodeObservers = () => {
            for (let notifier of this.eventListeners) {
                notifier.onSourceCodeUpdated(this.editor.getSession().getValue());
            };
        };        

        this.editor.on('change', () => {
            if (timeoutReloadCode)
                clearInterval(timeoutReloadCode);

            timeoutReloadCode = setTimeout(notifySourceCodeObservers, recompileCodeInterval);
        });

        this.editor.setOptions({
            useWorker: false,
            maxLines: 12,
        });
    }

    public registerEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners.push(notifier);
        notifier.onSourceCodeUpdated(this.editor.getSession().getValue());
    }

    public unRegisterEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners = this.eventListeners.slice(this.eventListeners.indexOf(notifier), 1);
    }

    public highlightLine(lineNo: number) {
        this.editor.gotoLine(lineNo);
        this.unhighlightLine();
        this.marker = this.editor.session.addMarker(new this.Range(lineNo - 1, 0, lineNo - 1, 1), "myMarker", "fullLine");
    }

    public unhighlightLine() {
        this.editor.session.removeMarker(this.marker);
        this.marker = undefined;
    }

    public getSourceCode(): string {
        return this.editor.getValue();
    }

    public getLineComment(lineNo: number): string {
        if (lineNo >= this.lineComments.length)
            return "";

        return this.lineComments[lineNo] ?? "";
    }

    public setSourceCode(sourceCode: string): void {
        let newCode = "";
        [this.lineComments, newCode] = this.extractComments(sourceCode);
        this.editor.setValue(newCode);
    }

    private extractComments(sourceCode: string): [any, string] {
        let lineComments: string[] = [];
        let lineNo = 1;
        let regexp = new RegExp("/\\*\\*\\*([\\s\\S]*?)\\*\\*\\*/");
        let lineByLine = sourceCode.split('\n');

        let newCode = "";
        for (let line of lineByLine) {
            let matches = regexp.exec(line);
            if (matches) {
                lineComments[lineNo] = matches[1].trim();
                newCode += line.replace(matches[0], '');
            } else {
                newCode += line;
            }

            newCode += "\n";
            lineNo++;
        }

        return [lineComments, newCode];
    }
}