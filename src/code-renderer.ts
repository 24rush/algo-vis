
export class CodeRenderer {
    private editor: any;
    private marker: any;
    private Range = ace.require('ace/range').Range;

    constructor(private elementId: string) {
        this.editor = ace.edit(this.elementId);
        this.editor.setOptions({ useWorker: false });
        this.editor.setTheme("ace/theme/monokai");
        this.editor.session.setMode("ace/mode/javascript");
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
}