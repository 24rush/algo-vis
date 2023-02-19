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
    private skipEventsCount = 0;

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
        this.editor.setFontSize(14);
        this.editor.setShowPrintMargin(false);
        this.editor.setAutoScrollEditorIntoView(true);
        this.editor.setReadOnly(isReadonly);

        this.editor.session.setMode("ace/mode/javascript");
        this.editor.session.setValue(convert(newCode));

        let timeoutReloadCode: any;
        let recompileCodeInterval = 3000;

        this.editor.setOptions({
            useWorker: false,
            wrap: true,
            maxLines: codeLines.length + 5,
        });

        this.editor.on('change', () => {
            if (this.skipEventsCount > 0) {
                this.skipEventsCount--;
                return;
            }
            
            let [, newCode, lineNo] = this.extractComments(this.editor.getSession().getValue());
            let sanitizedCode = convert(newCode);
            
            if (sanitizedCode != newCode) {
                this.editor.setOption('maxLines', lineNo > 20 ? 20 : lineNo)
                this.editor.setValue(sanitizedCode);
                return;
            }

            if (timeoutReloadCode)
                clearInterval(timeoutReloadCode);

            timeoutReloadCode = setTimeout(() => {
                for (let notifier of this.eventListeners) {
                    notifier.onSourceCodeUpdated(sanitizedCode);
                };
            }, recompileCodeInterval);
        });
    }

    public registerEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners.push(notifier);
        notifier.onSourceCodeUpdated(this.editor.getSession().getValue());
    }

    public unRegisterEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners = this.eventListeners.slice(this.eventListeners.indexOf(notifier), 1);
    }

    public notifySourceCodeObservers() {
        for (let notifier of this.eventListeners) {
            notifier.onSourceCodeUpdated(this.editor.getSession().getValue());
        };
    };
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
        let lineNo = 0;
        [this.lineComments, newCode, lineNo] = this.extractComments(sourceCode);

        // Updating code triggers remove + insert events
        this.skipEventsCount = 2;
        this.editor.setOption('maxLines', lineNo > 20 ? 20 : lineNo)
        this.editor.setValue(newCode);
        this.notifySourceCodeObservers();
    }

    private extractComments(sourceCode: string): [any, string, number] {
        let lineComments: string[] = [];
        let lineNo = 1;
        let regexp = new RegExp("/\\*\\*\\*([\\s\\S]*?)\\*\\*\\*/"); /*** Comment ***/
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

        return [lineComments, newCode.substring(0, newCode.length - 1), lineNo];
    }
}