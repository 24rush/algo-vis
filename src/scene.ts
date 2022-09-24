import { DOMmanipulator } from "./dom-manipulator.js"
import { ObservableTypes } from "./observable-type.js"
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

        let consoleTxt: HTMLElement = DOMmanipulator.elementStartsWithId(parent, "consoleTxt");
        let layout = new Layout(DOMmanipulator.elementStartsWithId(parent, "panelVariablesBody"));

        let self = this;
        this.codeRenderer.registerEventNotifier({
            onSourceCodeUpdated(newCode: string) {
                consoleTxt.textContent = "";
                layout.clearAll();

                oprec.setSourceCode(newCode);
                oprec.startReplay();

                self.codeRenderer.highlightLine(oprec.getFirstCodeLineNumber());
            }
        });

        oprec.registerVarScopeNotifier({
            onEnterScopeVariable: function (scopeName: string, observable: ObservableTypes) {
                layout.add(scopeName, observable);
            },
            onExitScopeVariable: function (scopeName: string, observable: ObservableTypes) {
                layout.remove(scopeName, observable);
            }
        });

        oprec.registerTraceNotifier({
            onTraceMessage(message: string): void {
                consoleTxt.textContent += message + '\r\n';
                console.log(message);
            }
        });

        oprec.registerCompilationStatusNotifier({
            onCompilationStatus(status: boolean, message: string) : void {
                let btnCompilationStatus = document.getElementById("btn-compilation-status");
                btnCompilationStatus.classList.remove("btn-success", "btn-danger");
                btnCompilationStatus.classList.add(status ? "btn-success" : "btn-danger");
                btnCompilationStatus.textContent = status ? "OK" : "error: " + message;
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
            if (evt.keyCode == 65 || evt.keyCode == 81) {
                evt.keyCode == 65 ? advance() : reverse();
                evt.preventDefault();
            }
        };

        let autoReplayInterval = 200;
        let paused = true;
        let autoplay = undefined;

        let resetAutoPlayBtn = function (isPaused) {
            document.getElementById("btn-autoplay-text").textContent = !paused ? "Pause" : "Autoplay";
            let iElem = document.getElementById("btn-autoplay-i");
            iElem.classList.remove("bi-fast-forward-fill", "bi-pause-fill");
            iElem.classList.add(!paused ? "bi-pause-fill" : "bi-fast-forward-fill");
        }

        document.getElementById("btn-execute").addEventListener('click', () => {
            if (paused == false)
                return;
            
            advance();
        });
        document.getElementById("btn-autoplay").addEventListener('click', () => {
            if (oprec.isReplayFinished()) {
                paused = true;
                resetAutoPlayBtn(paused);
                return;
            }

            paused = !paused;
            resetAutoPlayBtn(paused);

            if (!paused) {
                autoplay = setInterval(() => {
                    advance();

                    if (oprec.isReplayFinished() || paused) {
                        clearInterval(autoplay);
                    }
                }, autoReplayInterval);
            }
            else {
                clearInterval(autoplay);
            }
        });

        document.getElementById("btn-restart").addEventListener('click', () => {
            paused = true;
            resetAutoPlayBtn(paused);
            clearInterval(autoplay);

            consoleTxt.textContent = "";
            layout.clearAll();
            oprec.startReplay();
            this.codeRenderer.highlightLine(oprec.getNextCodeLineNumber());
        });
    }
}