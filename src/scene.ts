import { DOMmanipulator } from "./dom-manipulator.js"
import { ObservablePrimitiveType, ObservableArrayType, ObservableTypes } from "./observable-type.js"
import { ArrayTypeVisualizer, PrimitiveTypeVisualizer } from "./visualizers.js"
import { Layout } from "./layout.js";
import { OperationRecorder } from "./operation-recorder.js";
import { CodeRenderer } from "./code-renderer.js";
import { logd, strformat } from "../main.js"

export class Scene {
    private codeRenderer: CodeRenderer;

    constructor(private appId: string, private codeEditorId: string) {
        let parent = document.getElementById(this.appId);
        if (!parent)
            return;

        this.codeRenderer = new CodeRenderer(this.codeEditorId);

        let oprec = new OperationRecorder();
        oprec.setSourceCode(this.codeRenderer.getSourceCode());

        oprec.startRecording();       
        oprec.stopRecording();

        oprec.startReplay();

        let scene = DOMmanipulator.createSpan({
            "class": "halfScreen"      
        });
        let layout = new Layout(0, 0, scene);
        parent.append(scene);

        oprec.registerVariableScopeNotifier({
            onEnterScopeVariable: function (scopeName: string, observable: ObservableTypes) {
               layout.add(scopeName, observable);
            },
            onExitScopeVariable: function (scopeName: string, observable: ObservableTypes) {
                layout.remove(scopeName, observable);
            }
        });

        let advance = () => {
            oprec.advanceOneCodeLine();
            this.codeRenderer.highlightLine(oprec.getNextCodeLineNumber());

            //console.log('Current code line: ', oprec.getCurrentCodeLineNumber(), 'highlight: ', oprec.getNextCodeLineNumber());
        };

        let reverse = () => {
            oprec.reverseOneCodeLine();
            this.codeRenderer.highlightLine(oprec.getNextCodeLineNumber());

            //console.log('Current code line: ', oprec.getCurrentCodeLineNumber(), 'highlight: ', oprec.getNextCodeLineNumber());
        };

        this.codeRenderer.highlightLine(oprec.getFirstCodeLineNumber());

        window.onkeydown = (evt) => {
            if (evt.keyCode == 65) { // A (q=81)
                advance();
                evt.preventDefault();
            } else if (evt.keyCode == 81) {
                reverse();
                evt.preventDefault();
            }
        };
    }
}