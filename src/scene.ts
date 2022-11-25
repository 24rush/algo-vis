import { ObservableJSVariable } from "./observable-type"
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
    isExecutionCompleted = false;
    onAutoplayToggled(): any { }

    hasCompilationError: boolean = false;
    compilatonErrorMessage: string = "";
    compilationErrorMessage(): string { return this.compilatonErrorMessage; };

    hasException: boolean = false;
    exceptionMessage: string = "";

    onAdvance(): any { }
    onRestart(): any { }

    onPlaybackSpeedChangedSSlow(): any { }
    onPlaybackSpeedChangedSlow(): any { }
    onPlaybackSpeedChangedRealtime(): any { }

    public setDefaults() {
        this.consoleOutput = "";
        this.isPaused = true;
        this.showComments = false; // needs sync with UI checked
        this.hasCompilationError = false;
        this.compilatonErrorMessage = "";
        this.hasException = false;
        this.exceptionMessage = "";
    }
}

export class Scene {
    private codeRenderer: CodeRenderer;
    private commentsPopover: any = undefined;
    private autoReplayInterval = 200;
    private autoplayTimer: NodeJS.Timer = undefined;

    private viewModel: AVViewModel = new AVViewModel();

    private operationRecorder = new OperationRecorder();

    constructor(widget: HTMLElement, codeId?: string) {
        let rightPane = widget.querySelector("[class*=rightPane]");
        let variablesPanel = widget.querySelector("[class*=panelVariables]") as HTMLElement;
        let codeEditor = widget.querySelector("[class*=codeEditor]") as HTMLElement;
        let buttonsBar = widget.querySelector("[class*=buttonsBar]");

        this.codeRenderer = new CodeRenderer(codeEditor, widget.hasAttribute('av-ro'));
        let layout = new Layout(variablesPanel);

        let viewModelObs = new ObservableViewModel(this.viewModel);
        new UIBinder(viewModelObs).bindTo(buttonsBar).bindTo(rightPane);

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
            if (avViewModel.isExecutionCompleted) {
                this.viewModel.onRestart();
            }

            avViewModel.isPaused = !avViewModel.isPaused;

            clearInterval(this.autoplayTimer);

            if (!avViewModel.isPaused) {
                this.autoplayTimer = setInterval(() => {
                    avViewModel.isPaused = avViewModel.isExecutionCompleted;

                    if (avViewModel.isPaused) {
                        clearInterval(this.autoplayTimer);
                    }
                    else {
                        if (!this.operationRecorder.isWaiting())
                            advance();
                        else {
                            setTimeout(advance, 20);
                        }
                    }
                }, this.autoReplayInterval);
            }
        }

        this.viewModel.onAdvance = () => {
            if (avViewModel.isPaused)
                advance();
        }

        let advance = () => {
            if (this.operationRecorder.isWaiting()) {
                return;
            }

            this.operationRecorder.advanceOneCodeLine();
        };

        this.viewModel.onRestart = () => {
            avViewModel.isPaused = true;
            avViewModel.isExecutionCompleted = false;
            avViewModel.consoleOutput = "";

            clearInterval(this.autoplayTimer);
            this.autoplayTimer = undefined;
            layout.clearAll();

            this.operationRecorder.startReplay();
        }

        this.viewModel.onPlaybackSpeedChangedSSlow = () => {
            this.autoReplayInterval = 400;
        }
        this.viewModel.onPlaybackSpeedChangedSlow = () => {
            this.autoReplayInterval = 200;
        }
        this.viewModel.onPlaybackSpeedChangedRealtime = () => {
            this.autoReplayInterval = 0;
        }

        let self = this;

        this.codeRenderer.registerEventNotifier({
            onSourceCodeUpdated(newCode: string) {
                avViewModel.consoleOutput = "";
                layout.clearAll();

                var doc = new DOMParser().parseFromString(newCode, "text/html");
                newCode = doc.documentElement.textContent;

                self.operationRecorder.setSourceCode(newCode);                
                self.operationRecorder.startReplay();
            }
        });

        this.operationRecorder.registerNotificationObserver({
            onEnterScopeVariable: (scopeName: string, observable: ObservableJSVariable) => {
                layout.add(scopeName, observable);
            },
            onExitScopeVariable: (scopeName: string, observable: ObservableJSVariable) => {
                layout.remove(scopeName, observable, (status): void => {
                    self.operationRecorder.setWaiting(status);
                });
            }
        });

        this.operationRecorder.registerNotificationObserver({
            onTraceMessage(message: string): void {
                avViewModel.consoleOutput += message + '\r\n';
            }
        });

        this.operationRecorder.registerNotificationObserver({
            onCompilationError(status: boolean, message?: string): void {
                avViewModel.compilatonErrorMessage = message;
                avViewModel.hasCompilationError = status;
            }
        });

        this.operationRecorder.registerNotificationObserver({
            onExceptionMessage(status: boolean, message?: string): void {
                avViewModel.exceptionMessage = message;
                avViewModel.hasException = status;
            }
        });

        this.operationRecorder.registerNotificationObserver({
            onLineExecuted(lineNo: number) : void {
                highlightLine(lineNo);
            },
            onExecutionFinished() : void {
                avViewModel.isExecutionCompleted = self.operationRecorder.isReplayFinished();
            }
        });

        // Actual code start
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

        var options = {
            'content': "",
        };

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                let aceCursor = document.querySelector("[class=myMarker]") as HTMLElement;
                if (!avViewModel.showComments || mutationRecord.target != aceCursor)
                    return;

                if (self.commentsPopover) self.commentsPopover.dispose();
                let commentsElement = widget.querySelector("[class*=commentsPopover]") as HTMLElement;

                commentsElement.style['left'] = aceCursor.style['left'];
                commentsElement.style['top'] = parseInt(aceCursor.style['top']) + parseInt(aceCursor.style['height']) + "px";

                self.commentsPopover = new bootstrap.Popover(commentsElement, options);
                self.commentsPopover.show();
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
            } else options.content = "";
        };

        // Avoid mismatches between actual html content and .textContent used later on
        let code = this.codeRenderer.getSourceCode();
        let codeLines = code.split('\n');

        if (codeLines && codeLines.length) {
            if (codeLines[0].trim() == '')
                codeLines.shift();

            code = codeLines.join('\n');
        }

        this.codeRenderer.setSourceCode(code);                
    }
}
