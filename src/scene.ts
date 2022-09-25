import { DOMmanipulator } from "./dom-manipulator"
import { ObservableTypes } from "./observable-type"
import { Layout } from "./layout";
import { OperationRecorder } from "./operation-recorder";
import { CodeRenderer } from "./code-renderer";

export class Scene {
    private codeRenderer: CodeRenderer;

    constructor(private appId: string, private codeEditorId: string, private codeId: string) {
        let parent = document.getElementById(this.appId);
        if (!parent)
            return;

        this.codeRenderer = new CodeRenderer(this.codeEditorId);
        let oprec = new OperationRecorder();

        oprec.setSourceCode(this.codeRenderer.getSourceCode());

        let consoleTxt: HTMLElement = DOMmanipulator.elementStartsWithId(parent, "consoleTxt");
        let layout = new Layout(DOMmanipulator.elementStartsWithId(parent, "panelVariablesBody"));

        let self = this;
        fetch(codeId)            
            .then(function (response) {
                if (!response.ok)
                    return;

                response.text().then(function (code: string) {                    
                    self.codeRenderer.setSourceCode(code);
                });
            });

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
            onCompilationStatus(status: boolean, message: string): void {
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
        let autoplay: NodeJS.Timer = undefined;

        let resetAutoPlayBtn = function (isPaused: boolean) {
            document.getElementById("btn-autoplay-text").textContent = !isPaused ? "Pause" : "Autoplay";
            let iElem = document.getElementById("btn-autoplay-i");
            iElem.classList.remove("bi-fast-forward-fill", "bi-pause-fill");
            iElem.classList.add(!isPaused ? "bi-pause-fill" : "bi-fast-forward-fill");
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
