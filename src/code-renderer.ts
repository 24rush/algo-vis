/*var ace = require('ace-builds/src-min-noconflict/ace');
var theme_monokai = require('ace-builds/src-min-noconflict/theme-monokai');
require("ace-builds/src-min-noconflict/mode-javascript")
*/
var ace = require('ace-builds/src-min-noconflict/ace')
require('ace-builds/src-min-noconflict/mode-javascript')

var theme_monokai = require('ace-builds/src-min-noconflict/theme-monokai')

export interface CodeRendererEventNotifier {
    onSourceCodeUpdated(newCode: string) : void;
}

export class CodeRenderer {
    private editor: any;
    private marker: any;
    private Range = ace.require('ace/range').Range;
    private eventListeners: CodeRendererEventNotifier[] = [];    
    
    constructor(private elementId: string) {
        this.editor = ace.edit(this.elementId);
        this.editor.setOptions({ useWorker: false });        
        this.editor.setTheme(theme_monokai);

        this.editor.session.setMode("ace/mode/javascript");
    
        let timeoutReloadCode : any;
        this.editor.on('change', () => {            
            this.eventListeners.forEach(notifier =>  {
                if (timeoutReloadCode)
                    clearInterval(timeoutReloadCode);
                    
                timeoutReloadCode = setTimeout(() => notifier.onSourceCodeUpdated(this.editor.getSession().getValue()), 1000);                              
            });
        });
    }

    public registerEventNotifier(notifier: CodeRendererEventNotifier)
    {
        this.eventListeners.push(notifier);
    }

    public unRegisterEventNotifier(notifier: CodeRendererEventNotifier)
    {
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

    public getSourceCode() : string {
        return this.editor.getValue();
    }

    public setSourceCode(sourceCode: string) : void {
        this.editor.setValue(sourceCode);
    }
}