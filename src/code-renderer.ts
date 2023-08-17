var ace = require('ace-builds/src-min-noconflict/ace')
require('ace-builds/src-min-noconflict/mode-javascript')

export interface CodeRendererEventNotifier {
    onSourceCodeUpdated(newCode: string, isUserGenerated: boolean): void;
}

export class CodeRenderer {
    private readonly MaxCodeLines = 30;
    private readonly MinCodeLines = 5; // Fill with empty lines 

    private editor: any;
    private marker: any;
    private Range = ace.require('ace/range').Range;
    private eventListeners: CodeRendererEventNotifier[] = [];
    private lineComments: string[] = [];
    private skipEventsCount = 0;

    constructor(codeEditorHtmlElement: HTMLElement, isReadonly: boolean = false, isAutocomplete: boolean = false) {
        let code = codeEditorHtmlElement.textContent;//.trim();
        let codeLines = code.split('\n');

        let [lineComments, sanitizedCode] = this.processNewCode(code);
        this.lineComments = lineComments;

        this.editor = ace.edit(codeEditorHtmlElement.id);
        this.editor.session.setMode("ace/mode/javascript");

        this.editor.setFontSize(18);
        this.editor.setShowPrintMargin(false);
        this.editor.setAutoScrollEditorIntoView(true);
        this.editor.setReadOnly(isReadonly);
        this.editor.setOptions({
            useWorker: false,
            wrap: 80
        });

        this.setMaxLines(codeLines.length);
        sanitizedCode = this.unescapeSpecialChars(sanitizedCode);

        let indexChar = 0;
        let linesSoFar = 0;
        let msBetweenChars = 10;//Math.max(5, Math.floor(3000 / code.length));

        let autoCompleteFunc = () => {
            let isNewLine = false;
            if (sanitizedCode.charAt(indexChar) == '\n') { linesSoFar++; isNewLine = true; }

            this.editor.session.setValue(sanitizedCode.substring(0, indexChar) + "\n".repeat(codeLines.length - linesSoFar + (isNewLine ? 1 : 0)));

            if (indexChar < sanitizedCode.length) {
                indexChar++;
                setTimeout(autoCompleteFunc, msBetweenChars);
            } else {
                this.registerOnChangeNotifier();
                this.editor.session.setValue(sanitizedCode + '\n');
            }
        };

        if (isAutocomplete)
            autoCompleteFunc();
        else {
            this.registerOnChangeNotifier();
            // Set the code so that it's sanitized
            this.editor.session.setValue(sanitizedCode + '\n');
        }
    }

    private setMaxLines(requestedLineNo: number) {
        this.editor.setOption('maxLines', Math.min(this.MaxCodeLines, 1 + requestedLineNo));
    }

    private unescapeSpecialChars(convert: string) {
        return convert.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    };

    private registerOnChangeNotifier() {
        this.editor.on('change', () => {
            if (this.skipEventsCount > 0) {
                this.skipEventsCount--;
                return;
            }

            let [, newCode, noOfLines] = this.removeComments(this.editor.getSession().getValue());
            this.setMaxLines(noOfLines);

            let codeWithoutComments = this.unescapeSpecialChars(newCode);
            if (codeWithoutComments != newCode) // Triggered when first loading code from html
            {
                this.editor.setValue(codeWithoutComments);
                return;
            }

            this.notifySourceCodeObservers(true);
        });
    }

    public registerEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners.push(notifier);
        notifier.onSourceCodeUpdated(this.editor.getSession().getValue(), false);
    }

    public unRegisterEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners = this.eventListeners.slice(this.eventListeners.indexOf(notifier), 1);
    }

    public notifySourceCodeObservers(isUserGenerated: boolean) {
        for (let notifier of this.eventListeners) {
            notifier.onSourceCodeUpdated(this.editor.getSession().getValue(), isUserGenerated);
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

        let [lineComments, newCode, noOfLines] = this.removeComments(sourceCode);

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
        this.setMaxLines(noOfLines);
        this.editor.setValue(sanitizedCode);
        this.highlightLine(1);
        this.notifySourceCodeObservers(false);
    }

    private removeComments(sourceCode: string): [any, string, number] {
        let lineComments: string[] = [];
        let noOfLines = 0;
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