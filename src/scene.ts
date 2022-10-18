import { DOMmanipulator } from "./dom-manipulator"
import { ObservableVariable } from "./observable-type"
import { Layout } from "./layout";
import { OperationRecorder } from "./operation-recorder";
import { CodeRenderer } from "./code-renderer";
import { clientViewModel, ObservableViewModel, UIBinder } from "./ui-framework"

var bootstrap = require('bootstrap')

class AVViewModel {
    consoleOutput: string = "";

    showComments: boolean = true;
    onShowComments(): any { }

    isPaused = true;
    onAutoplayToggled(): any { }

    compilationStatus: boolean = true;
    compilatonMessage: string = "";
    compilationErrorMessage(): string { return "error: " + this.compilatonMessage; };

    onAdvance(): any { }
    onRestart(): any { }

    public setDefaults() {
        this.consoleOutput = "";
        this.isPaused = true;
        this.showComments = false; // needs sync with UI checked
        this.compilationStatus = true;
        this.compilatonMessage = "";
    }
}

export class Scene {
    private codeRenderer: CodeRenderer;
    private commentsPopover: any = undefined;
    private autoReplayInterval = 200;        
    private autoplayTimer: NodeJS.Timer = undefined;        

    private viewModel: AVViewModel = new AVViewModel();

    private operationRecorder = new OperationRecorder();

    constructor(widget: Element, private appId: string, private codeEditorId: string, private codeId?: string) {
        let parent = document.getElementById(this.appId);
        if (!parent)
            return;

        this.codeRenderer = new CodeRenderer(this.codeEditorId);

        let layout = new Layout(DOMmanipulator.elementStartsWithId(parent, "panelVariablesBody"));

        let viewModelObs = new ObservableViewModel(this.viewModel);
        new UIBinder(widget, viewModelObs);

        let avViewModel = clientViewModel<typeof this.viewModel>(viewModelObs);        
        avViewModel.setDefaults();

        this.viewModel.onShowComments = () => {
            avViewModel.showComments = !avViewModel.showComments;

            if (avViewModel.showComments) {
                highlightLine(this.operationRecorder.getNextCodeLineNumber());
            } else {
                this.commentsPopover?.dispose();
                this.commentsPopover = undefined;
            }
        };

        this.viewModel.onAutoplayToggled = () => {
            if (this.operationRecorder.isReplayFinished()) {
                avViewModel.isPaused = true;
                return;
            }

            avViewModel.isPaused = !avViewModel.isPaused;

            if (!avViewModel.isPaused) {
                this.autoplayTimer = setInterval(() => {
                    advance();

                    if (this.operationRecorder.isReplayFinished() || avViewModel.isPaused) {
                        clearInterval(this.autoplayTimer);
                    }
                }, this.autoReplayInterval);
            }
            else {
                clearInterval(this.autoplayTimer);
            }
        }

        this.viewModel.onAdvance = () => {
            if (avViewModel.isPaused)                
                advance();
        }

        this.viewModel.onRestart = () => {
            avViewModel.isPaused = true;
            avViewModel.consoleOutput = "";

            clearInterval(this.autoplayTimer);            
            layout.clearAll();
            
            this.operationRecorder.startReplay();
            highlightLine(this.operationRecorder.getFirstCodeLineNumber());
        }

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
                avViewModel.consoleOutput = "";
                layout.clearAll();

                this.operationRecorder.setSourceCode(newCode);
                this.operationRecorder.startReplay();

                self.codeRenderer.highlightLine(this.operationRecorder.getFirstCodeLineNumber());
            }
        });

        this.operationRecorder.registerVarScopeNotifier({
            onEnterScopeVariable: (scopeName: string, observable: ObservableVariable) => {
                layout.add(scopeName, observable);
            },
            onExitScopeVariable: (scopeName: string, observable: ObservableVariable) => {
                layout.remove(scopeName, observable);
            }
        });

        this.operationRecorder.registerTraceNotifier({
            onTraceMessage(message: string): void {                
                avViewModel.consoleOutput += message + '\r\n';
            }
        });

        this.operationRecorder.registerCompilationStatusNotifier({
            onCompilationStatus(status: boolean, message: string): void {
                avViewModel.compilatonMessage = message;
                avViewModel.compilationStatus = status;
            }
        });

        var options = {
            'content': "",
        };

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                let aceCursor = document.querySelector("[class=myMarker]") as HTMLElement;
                if (!avViewModel.showComments || mutationRecord.target != aceCursor)
                    return;

                if (this.commentsPopover) this.commentsPopover.dispose();
                let commentsElement = document.getElementById("comments-" + codeEditorId);

                commentsElement.style['left'] = aceCursor.style['left'];
                commentsElement.style['top'] = parseInt(aceCursor.style['top']) + parseInt(aceCursor.style['height']) + "px";

                this.commentsPopover = new bootstrap.Popover(commentsElement, options);
                this.commentsPopover.show();
            });
        });

        let highlightLine = (lineNo: number) => {
            this.codeRenderer.highlightLine(lineNo);

            let lineComment = this.codeRenderer.getLineComment(lineNo);

            if (avViewModel.showComments && lineComment !== "") {
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
            this.operationRecorder.advanceOneCodeLine();
            highlightLine(this.operationRecorder.getNextCodeLineNumber());
        };

        this.operationRecorder.setSourceCode(this.codeRenderer.getSourceCode());
        this.operationRecorder.startReplay();
        highlightLine(this.operationRecorder.getFirstCodeLineNumber());
    }
}
