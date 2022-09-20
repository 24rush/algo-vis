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
        oprec.recordSourceCode();        

        let consoleTxt: HTMLElement = DOMmanipulator.elementStartsWithId(parent, "consoleTxt");
        let layout = new Layout(DOMmanipulator.elementStartsWithId(parent, "panelVariablesBody"));       

        let self = this;
        this.codeRenderer.registerEventNotifier({
            onSourceCodeUpdated(newCode: string) {
                consoleTxt.textContent = "";
                layout.clearAll();

                oprec.setSourceCode(newCode);
                oprec.recordSourceCode();  
                
                oprec.startReplay();
                self.codeRenderer.highlightLine(oprec.getFirstCodeLineNumber());
            }
        });

        oprec.registerVariableScopeNotifier({
            onEnterScopeVariable: function (scopeName: string, observable: ObservableTypes) {
                layout.add(scopeName, observable);
            },
            onExitScopeVariable: function (scopeName: string, observable: ObservableTypes) {
                layout.remove(scopeName, observable);
            }
        });

        oprec.registerTraceMessageNotifier({
            onTraceMessage(message: string): void {
                consoleTxt.textContent += message + '\r\n';
                console.log(message);
            }
        });

        oprec.startReplay();
        this.codeRenderer.highlightLine(oprec.getFirstCodeLineNumber());

        let advance = () => {
            oprec.advanceOneCodeLine();
            this.codeRenderer.highlightLine(oprec.getNextCodeLineNumber());
        };

        let reverse = () => {
            oprec.reverseOneCodeLine();
            this.codeRenderer.highlightLine(oprec.getNextCodeLineNumber());
        };

        window.onkeydown = (evt) => {
            if (evt.keyCode == 65) { // A (q=81)
                advance();
                evt.preventDefault();
            } else if (evt.keyCode == 81) {
                reverse();
                evt.preventDefault();
            }
        };

        let autoReplayInterval = 200;
        let pause = false;

        document.getElementById("btn-execute").addEventListener('click', () => advance());
        document.getElementById("btn-autoplay").addEventListener('click', () => {
            pause = false;
            var autoplay = setInterval(() => {                
                advance();

                if (oprec.isReplayFinished() || pause) {
                    clearInterval(autoplay);
                }
            }, autoReplayInterval);
        });

        document.getElementById("btn-pause").addEventListener('click', () => { pause = true; });
        document.getElementById("btn-restart").addEventListener('click', () => {         
            consoleTxt.textContent = "";
            layout.clearAll();
            oprec.startReplay();            
            this.codeRenderer.highlightLine(oprec.getNextCodeLineNumber());
        });        
    }
}