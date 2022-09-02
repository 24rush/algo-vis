import { DOMmanipulator } from "./dom-manipulator.js"
import { ObservablePrimitiveType, ObservableArrayType } from "./observable-type.js"
import { ArrayTypeVisualizer, PrimitiveTypeVisualizer } from "./visualizers.js"
import { Layout } from "./layout.js";
import { OperationRecorder } from "./operation-recorder.js";
import { CodeRenderer } from "./code-renderer.js";

export class Scene {
    private codeRenderer: CodeRenderer;

    constructor(private appId: string, private codeEditorId: string) {
        let parent = document.getElementById(this.appId);
        let width = parent.getBoundingClientRect().width / 2;
        let height = parent.getBoundingClientRect().height;

        this.codeRenderer = new CodeRenderer(this.codeEditorId);

        let len = new ObservablePrimitiveType<number>("len", 0);
        let x = new ObservablePrimitiveType<number>("x", 0);
        let i = new ObservablePrimitiveType<number>("i", 0);
        let j = new ObservablePrimitiveType<number>("j", 0);
        let A = new ObservableArrayType("array", [4, 3, 2, 1]);

        let oprec = new OperationRecorder();
        oprec.registerPrimitives([len, x, i, j]);
        oprec.registerArray(A);

        oprec.startRecording();
        
        oprec.markStartCodeLine(2); len.setValue(A.getValues().length);
        oprec.markStartCodeLine(3); i.setValue(1);
        while (oprec.markStartCodeLine(4) && i.getValue() < len.getValue()) { 
            oprec.markStartCodeLine(5); x.setValue(A.getAtIndex(i.getValue())); 
            oprec.markStartCodeLine(6); j.setValue(i.getValue() - 1);
            while (oprec.markStartCodeLine(7) && j.getValue() >= 0 && A.getAtIndex(j.getValue()) > x.getValue()) {
                oprec.markStartCodeLine(8); A.setValueAtIndex(A.getAtIndex(j.getValue()), j.getValue() + 1);
                oprec.markStartCodeLine(10); j.setValue(j.getValue() - 1);               
            }
            oprec.markStartCodeLine(12); A.setValueAtIndex(x.getValue(), j.getValue() + 1);
            oprec.markStartCodeLine(13); i.setValue(i.getValue() + 1);
        }
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

            DOMmanipulator.setSvgElementAttr(scene, {"transform": "translate(" + (width + paddingWithCode) + " 0)"});
        });

        layout.first(new PrimitiveTypeVisualizer(len));
        layout.below(new PrimitiveTypeVisualizer(x));
        layout.below(new ArrayTypeVisualizer(A));
        layout.below(new PrimitiveTypeVisualizer(i));
        layout.below(new PrimitiveTypeVisualizer(j));

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