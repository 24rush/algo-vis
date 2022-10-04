import { DOMmanipulator } from "./dom-manipulator"
import { ObservableTypes } from "./observable-type"
import { Layout } from "./layout";
import { OperationRecorder } from "./operation-recorder";
import { CodeRenderer } from "./code-renderer";
var bootstrap = require('bootstrap')

export class Scene {
    private codeRenderer: CodeRenderer;

    constructor(private appId: string, private codeEditorId: string, private codeId?: string) {
        let parent = document.getElementById(this.appId);
        if (!parent)
            return;

        this.codeRenderer = new CodeRenderer(this.codeEditorId);
        let oprec = new OperationRecorder();

        let consoleTxt: HTMLElement = DOMmanipulator.elementStartsWithId(parent, "consoleTxt");
        let layout = new Layout(DOMmanipulator.elementStartsWithId(parent, "panelVariablesBody"));

        let self = this;

        if (codeId) {
            fetch(codeId)
                .then((response) => {
                    if (!response.ok)
                        return;

                    response.text().then((code: string) => {
                        this.codeRenderer.setSourceCode(code);
                    });
                });
        }

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
            onEnterScopeVariable: (scopeName: string, observable: ObservableTypes) => {
                layout.add(scopeName, observable);
            },
            onExitScopeVariable: (scopeName: string, observable: ObservableTypes) => {
                layout.remove(scopeName, observable);
            }
        });

        oprec.registerTraceNotifier({
            onTraceMessage(message: string): void {
                consoleTxt.textContent += message + '\r\n';                
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

        let showCommentsCheckbox = document.getElementById('showCommentsCheck-' + codeEditorId) as HTMLInputElement;
        let showComments = showCommentsCheckbox.checked;

        showCommentsCheckbox.addEventListener('click', function(){
            showComments = showCommentsCheckbox.checked;
            if (showComments) {
                highlightLine(oprec.getNextCodeLineNumber());
            } else {
                commentsPopover.dispose();
                commentsPopover = undefined;
            }
        });

        let commentsPopover: any = undefined;
        var options = {
            'content': "",
        };

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                let aceCursor = document.querySelector("[class=myMarker]") as HTMLElement;
                if (!showComments || mutationRecord.target != aceCursor)
                    return;

                if (commentsPopover) commentsPopover.dispose();
                let commentsElement = document.getElementById("comments-" + codeEditorId);

                commentsElement.style['left'] = aceCursor.style['left'];
                commentsElement.style['top'] = parseInt(aceCursor.style['top']) + parseInt(aceCursor.style['height']) + "px";

                commentsPopover = new bootstrap.Popover(commentsElement, options);
                commentsPopover.show();
            });
        });

        let highlightLine = (lineNo: number) => {
            this.codeRenderer.highlightLine(lineNo);

            let lineComment = this.codeRenderer.getLineComment(lineNo);

            if (showComments && lineComment !== "") {
                options.content = lineComment;
                let checkerFunc = () => {
                    let aceCursor = document.querySelector("[class=myMarker]") as HTMLElement;

                    aceCursor ?
                        observer.observe(aceCursor, { attributes: true, attributeFilter: ['style'] }) :
                        setTimeout(checkerFunc, 200);
                }

                checkerFunc();
            }
        };

        let advance = () => {
            oprec.advanceOneCodeLine();
            highlightLine(oprec.getNextCodeLineNumber());
        };

        oprec.setSourceCode(this.codeRenderer.getSourceCode());
        oprec.startReplay();
        highlightLine(oprec.getFirstCodeLineNumber());

        let autoReplayInterval = 200;
        let paused = true;
        let autoplay: NodeJS.Timer = undefined;

        let resetAutoPlayBtn = (isPaused: boolean) => {
            document.getElementById("btn-autoplay-text").textContent = !isPaused ? "Pause" : "Autoplay";
            let iElem = document.getElementById("btn-autoplay-i");
            iElem.classList.remove("bi-fast-forward-fill", "bi-pause-fill");
            iElem.classList.add(!isPaused ? "bi-pause-fill" : "bi-fast-forward-fill");
        }

        document.getElementById("btn-execute-" + codeEditorId).addEventListener('click', () => {
            if (paused == false)
                return;

            advance();
        });

        document.getElementById("btn-autoplay-" + codeEditorId).addEventListener('click', () => {
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

        document.getElementById("btn-restart-" + codeEditorId).addEventListener('click', () => {
            paused = true;
            resetAutoPlayBtn(paused);
            clearInterval(autoplay);

            consoleTxt.textContent = "";
            layout.clearAll();
            oprec.startReplay();
            highlightLine(oprec.getFirstCodeLineNumber());
        });        
    }
}
