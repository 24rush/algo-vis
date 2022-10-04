var ace = require('ace-builds/src-min-noconflict/ace')
require('ace-builds/src-min-noconflict/mode-javascript')
var theme_monokai = require('ace-builds/src-min-noconflict/theme-monokai')

export interface CodeRendererEventNotifier {
    onSourceCodeUpdated(newCode: string): void;
}

export class CodeRenderer {
    private editor: any;
    private marker: any;
    private Range = ace.require('ace/range').Range;
    private eventListeners: CodeRendererEventNotifier[] = [];
    private lineComments: string[] = [];

    constructor(private elementId: string) {
        let currentCode = document.getElementById(elementId).innerHTML;        
        if (currentCode !== "") {
            let newCode = "";
            [this.lineComments, newCode] = this.extractComments(currentCode);
            document.getElementById(elementId).innerHTML = newCode;
        }            

        this.editor = ace.edit(this.elementId);
        this.editor.setOptions({ useWorker: false });
       // this.editor.setTheme(theme_monokai);
        this.editor.session.setMode("ace/mode/javascript");

        let timeoutReloadCode: any;
        let recompileCodeInterval = 1000;
        this.editor.on('change', () => {
            for (let notifier of this.eventListeners) {
                if (timeoutReloadCode)
                    clearInterval(timeoutReloadCode);

                timeoutReloadCode = setTimeout(() => notifier.onSourceCodeUpdated(this.editor.getSession().getValue()), recompileCodeInterval);
            };
        });
        
        this.editor.setOptions({
            maxLines: 30,
            minLines: 12
        }); 
    }

    public registerEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners.push(notifier);
    }

    public unRegisterEventNotifier(notifier: CodeRendererEventNotifier) {
        this.eventListeners = this.eventListeners.slice(this.eventListeners.indexOf(notifier), 1);
    }

    public highlightLine(lineNo: number) {
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

    public getLineComment(lineNo: number) : string {
        if (lineNo >= this.lineComments.length)
            return "";

        return this.lineComments[lineNo] ?? "";
    }

    public setSourceCode(sourceCode: string): void {
        let newCode = "";
        [this.lineComments, newCode] = this.extractComments(sourceCode);
        this.editor.setValue(newCode);
    }

    private extractComments(sourceCode: string) : [any, string] {
        let lineComments : string[] = [];
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