var ace = require('ace-builds/src-min-noconflict/ace')
require('ace-builds/src-min-noconflict/mode-javascript')

export interface CodeRendererEventNotifier {
    onSourceCodeUpdated(newCode: string): void;
}

export class CodeRenderer {
    private readonly MaxCodeLines = 20;
    private readonly MinCodeLines = 5; // Fill with empty lines 

    private editor: any;
    private marker: any;
    private Range = ace.require('ace/range').Range;
    private eventListeners: CodeRendererEventNotifier[] = [];
    private lineComments: string[] = [];
    private skipEventsCount = 0;

    constructor(codeEditorHtmlElement: HTMLElement, isReadonly: boolean = false, autoRefresh: boolean = true) {
        let code = codeEditorHtmlElement.textContent;
        let codeLines = code.split('\n');

        if (codeLines.length) {
            if (codeLines[0].trim() == '')
                codeLines.shift();

            code = codeLines.join('\n');
        }

        let [lineComments, sanitizedCode] = this.processNewCode(code);
        this.lineComments = lineComments;

        var convert = function (convert: string) {
            return convert.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        };

        this.editor = ace.edit(codeEditorHtmlElement.id);
        this.editor.setFontSize(14);
        this.editor.setShowPrintMargin(false);
        this.editor.setAutoScrollEditorIntoView(true);
        this.editor.setReadOnly(isReadonly);
        this.editor.setOption('maxLines', Math.max(this.MaxCodeLines, codeLines.length))

        this.editor.session.setMode("ace/mode/javascript");
        this.editor.session.setValue(convert(sanitizedCode));

        this.editor.setOptions({
            useWorker: false,
            wrap: true
        });

        if (autoRefresh) {
            let timeoutReloadCode: any;

            this.editor.on('change', () => {
                if (this.skipEventsCount > 0) {
                    this.skipEventsCount--;
                    return;
                }

                let [, newCode, lineNo] = this.extractCommentsSanitizeCode(this.editor.getSession().getValue());
                let sanitizedCode = convert(newCode);

                if (sanitizedCode != newCode) {
                    this.editor.setOption('maxLines', Math.max(this.MaxCodeLines, lineNo))
                    this.editor.setValue(sanitizedCode);
                    return;
                }

                if (timeoutReloadCode)
                    clearInterval(timeoutReloadCode);

                timeoutReloadCode = setTimeout(() => {
                    for (let notifier of this.eventListeners) {
                        notifier.onSourceCodeUpdated(sanitizedCode);
                    };
                }, 3000);
            });
        }
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

    private processNewCode(sourceCode: string) {
        if (!sourceCode || sourceCode == "")
            return [[], "\n".repeat(this.MinCodeLines - 1), this.MinCodeLines];

        let [lineComments, newCode, noOfLines] = this.extractCommentsSanitizeCode(sourceCode);

        if (noOfLines < this.MinCodeLines) {
            newCode += "\n".repeat(this.MinCodeLines - noOfLines + 1);
            noOfLines = this.MinCodeLines;
        }

        return [lineComments, newCode, noOfLines];
    }

    public setSourceCode(sourceCode: string): void {
        let [lineComments, sanitizedCode, noOfLines] = this.processNewCode(sourceCode);
        this.lineComments = lineComments;

        // Updating code triggers remove + insert events
        this.skipEventsCount = 2;
        this.editor.setOption('maxLines', noOfLines > this.MaxCodeLines ? this.MaxCodeLines : noOfLines)
        this.editor.setValue(sanitizedCode);
        this.highlightLine(1);
        this.notifySourceCodeObservers();
    }

    private extractCommentsSanitizeCode(sourceCode: string): [any, string, number] {
        let lineComments: string[] = [];
        let noOfLines = 1;
        let regexp = new RegExp("/\\*\\*\\*([\\s\\S]*?)\\*\\*\\*/"); /*** Comment ***/
        let lineByLine = sourceCode.split('\n');

        let sanitizedCode = "";
        for (let line of lineByLine) {
            let matches = regexp.exec(line);
            if (matches) {
                lineComments[noOfLines] = matches[1].trim();
                sanitizedCode += line.replace(matches[0], '');
            } else {
                sanitizedCode += line;
            }

            sanitizedCode += "\n";
            noOfLines++;
        }

        return [lineComments, sanitizedCode.substring(0, sanitizedCode.length - 1), noOfLines];
    }
}