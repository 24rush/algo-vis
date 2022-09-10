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

        let width = parent.getBoundingClientRect().width / 2;
        let height = parent.getBoundingClientRect().height;

        this.codeRenderer = new CodeRenderer(this.codeEditorId);

        let oprec = new OperationRecorder();
        oprec.setSourceCode(this.codeRenderer.getSourceCode());

        oprec.startRecording();

        // oprec.markStartCodeLine(2); len.setValue(A.getValues().length);
        // oprec.markStartCodeLine(3); i.setValue(1);
        // while (oprec.markStartCodeLine(4) && i.getValue() < len.getValue()) {
        //     oprec.markStartCodeLine(5); x.setValue(A.getAtIndex(i.getValue()));
        //     oprec.markStartCodeLine(6); j.setValue(i.getValue() - 1);
        //     while (oprec.markStartCodeLine(7) && j.getValue() >= 0 && A.getAtIndex(j.getValue()) > x.getValue()) {
        //         oprec.markStartCodeLine(8); A.setValueAtIndex(A.getAtIndex(j.getValue()), j.getValue() + 1);
        //         oprec.markStartCodeLine(10); j.setValue(j.getValue() - 1);
        //     }
        //     oprec.markStartCodeLine(12); A.setValueAtIndex(x.getValue(), j.getValue() + 1);
        //     oprec.markStartCodeLine(13); i.setValue(i.getValue() + 1);
        // }
        oprec.stopRecording();

        oprec.startReplay();

        let paddingWithCode = 5;
        let scene = DOMmanipulator.createSvg({
            "width": width, "height": height,
            "viewBox": "0 0 " + (width + paddingWithCode) + " " + height,
            "transform": "translate(" + (width + paddingWithCode) + " 0)"
        });
        let layout = new Layout(0, 0, scene);
        parent.append(scene);

        window.addEventListener('resize', (event) => {
            let parent = document.getElementById(this.appId);
            let width = parent.getBoundingClientRect().width / 2;

            DOMmanipulator.setSvgElementAttr(scene, { "transform": "translate(" + (width + paddingWithCode) + " 0)" });
        });

        oprec.registerVariableScopeNotifier({
            onEnterScopeVariable: function (scopeName: string, observable: ObservableTypes) {
                //logd(scopeName, 'enter');
                if (observable instanceof ObservablePrimitiveType)
                    layout.below(new PrimitiveTypeVisualizer(observable));
                if (observable instanceof ObservableArrayType)
                    layout.below(new ArrayTypeVisualizer(observable));
            },
            onExitScopeVariable: function (scopeName: string, observable: ObservableTypes) {

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