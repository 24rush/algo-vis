import { ObservableJSVariable } from "../types/observable-type"
import { Scopes } from "./scopes";
import { CodeDebugger } from "../execution/code-debugger";
import { CodeRenderer } from "./ace-editor-wrapper";
import { clientViewModel, ObservableViewModel, UIBinder } from "../util/ui-framework"
import { Localize } from "../util/localization";
import { Snippet, SnippetEvents } from "./snippets";
import { UserInteractionType } from "../execution/code-executor";

var bootstrap = require('bootstrap')

class AVViewModel {
    consoleOutput: string = "";

    showComments: boolean = true;
    onShowComments(): any { }

    isPaused = true;
    isExecutionCompleted = false;
    isVisualisationDisabled = false;
    onAutoplayToggled(): any { }

    isSnippetSet = false;
    snippets: Snippet[] = [];
    selectedSnippetDesc: string = "";
    selectedSnippetIdx: number = 0;
    hasLevelSpecified: boolean = false;
    hasMoreSnippets: boolean = false;

    timeRemainingForSolution: string = "";

    hasCompilationError: boolean = false;
    compilatonErrorMessage: string = "";
    compilationErrorMessage(): string { return this.compilatonErrorMessage; };

    hasException: boolean = false;
    exceptionMessage: string = "";

    onAdvance(evt: Event): any { }
    onRestart(): any { }
    onFullscreen(): any { }

    isSolution: boolean = false;
    onShowSolution(): any { }

    onSnippetSelected(_event: any): any { };
    onNextSnippet() { }

    onPlaybackSpeedChangedSSlow(): any { }
    onPlaybackSpeedChangedSlow(): any { }
    onPlaybackSpeedChangedRealtime(): any { }

    promptTitle: string = "";
    promptDefaultValue: string = "";
    hasCancelBtn: boolean = true;
    hasInputBox: boolean = true;
    hasSolution: boolean = false;
    onPromptOk(): any { };
    onPromptCancel(): any { };

    isFunctionalityDisabled: boolean = false;
    userInteraction: UserInteractionType = UserInteractionType.Alert;

    public setDefaults() {
        this.consoleOutput = "";

        this.isPaused = true;
        this.isExecutionCompleted = false;
        this.isVisualisationDisabled = false;

        this.isSolution = false;
        this.isSnippetSet = false;
        this.hasLevelSpecified = false;
        this.selectedSnippetDesc = "";
        this.selectedSnippetIdx = 0;
        this.hasMoreSnippets = false;

        this.timeRemainingForSolution = "";
        this.showComments = true; // needs sync with UI checked

        this.hasCompilationError = false;
        this.compilatonErrorMessage = "";
        this.hasException = false;
        this.exceptionMessage = "";

        this.promptTitle = "";
        this.promptDefaultValue = "";
        this.hasCancelBtn = true;
        this.hasInputBox = true;
        this.hasSolution = false;

        this.isFunctionalityDisabled = true;
        this.userInteraction = UserInteractionType.Alert;
    }
}

export class AlgoVisWidget {
    private codeRenderer: CodeRenderer;
    private commentsPopoverHandle: any = undefined;

    private promptWidget: HTMLElement = undefined;
    private userInteractionMsgBox: bootstrap.Toast = undefined;

    private msgBoxWidget: HTMLElement = undefined;
    private userMsgBox: bootstrap.Toast = undefined;

    private autoReplayInterval = 600;
    private autoplayTimer: NodeJS.Timer = undefined;

    private timeoutExpiredOnce: boolean = false;
    private timestampTouched: number = undefined;
    private timerSolution: NodeJS.Timer = undefined;

    private viewModel: AVViewModel = new AVViewModel();

    private codeDebugger: CodeDebugger;
    private lineNoToBeExecuted = -1;
    private userCodeBeforeShowSolution: string = "";

    constructor(private app: HTMLElement, snippets: Snippet[], private snippetEventsCbks: SnippetEvents) {
        let leftPane = app.querySelector("[class*=leftPane]");
        let rightPane = app.querySelector("[class*=rightPane]");
        let variablesPanel = app.querySelector("[class*=panelVariables]") as HTMLElement;
        let codeEditor = app.querySelector("[class*=codeEditor]") as HTMLElement;
        let buttonsBar = app.querySelector("[class*=av-buttonsBar]");
        let snippetsList = app.querySelector("[class*=av-snippets]");

        this.promptWidget = app.querySelector("[id=toast-" + codeEditor.id);
        this.userInteractionMsgBox = new bootstrap.Toast(this.promptWidget);
        this.msgBoxWidget = app.querySelector("[id=msgBox-" + codeEditor.id);
        this.userMsgBox = new bootstrap.Toast(this.msgBoxWidget);

        let isAutoPlay = app.hasAttribute('av-autoplay');
        let isWriteable = app.hasAttribute('av-write');
        let isVisualisationDisabled = app.hasAttribute('av-novis');
        let isAutocomplete = app.hasAttribute('av-autocomplete');

        let selectedSnippedId = -1;
        let isExercise = app.hasAttribute('av-exercise');

        if (isExercise) {
            isWriteable = true;
            isAutoPlay = false;
            isVisualisationDisabled = true;

            selectedSnippedId = parseInt(app.getAttribute('av-exercise').split(':')[1]);
        } else {
            selectedSnippedId = app.hasAttribute('av-selected') ? parseInt(app.attributes.getNamedItem('av-selected').value) : -1;
        }

        // Disable autoplay on mobile
        //if (isAutoPlay && window.matchMedia("(orientation: portrait)").matches) {
        //    isAutoPlay = false;
        //}

        this.codeDebugger = new CodeDebugger(!isVisualisationDisabled);
        this.codeRenderer = new CodeRenderer(codeEditor, !isWriteable, isAutocomplete);
        let scopes = new Scopes(variablesPanel);

        let viewModelObs = new ObservableViewModel(this.viewModel);
        let avViewModel = clientViewModel<typeof this.viewModel>(viewModelObs);
        avViewModel.setDefaults();

        avViewModel.isVisualisationDisabled = isVisualisationDisabled;

        let self = this;

        let onSnippetSelected = (snippetId: number) => {
            let idxSnippet = snippets.findIndex(value => { return value.id == snippetId });

            if (idxSnippet != -1) {
                let selectedSnippet = snippets[idxSnippet];

                avViewModel.selectedSnippetDesc = selectedSnippet.desc;
                avViewModel.hasMoreSnippets = idxSnippet < (snippets.length - 1);
                avViewModel.hasLevelSpecified = selectedSnippet.level != "";
                avViewModel.hasSolution = selectedSnippet.solution != "";

                avViewModel.selectedSnippetIdx = idxSnippet;

                this.userCodeBeforeShowSolution = "";
                this.codeRenderer.setSourceCode(selectedSnippet.code);
                this.timestampTouched = undefined;
                this.timeoutExpiredOnce = false;
            }
        };

        let getCurrentSnippet = (): Snippet => {
            return avViewModel.selectedSnippetIdx < snippets.length ? snippets[avViewModel.selectedSnippetIdx] : undefined;
        }

        this.viewModel.onNextSnippet = () => {
            avViewModel.selectedSnippetIdx++;

            if (avViewModel.selectedSnippetIdx < snippets.length) {
                onSnippetSelected(snippets[avViewModel.selectedSnippetIdx].id);
            }
        };

        this.viewModel.onSnippetSelected = (event: any) => {
            let snippetId = Number.parseInt(event.getAttribute('av-id'));
            onSnippetSelected(snippetId);
        }

        avViewModel.isSnippetSet = snippets.length > 1 && selectedSnippedId == -1;

        if (snippets.length > 0) {
            if (selectedSnippedId != -1 && snippets.findIndex(value => { return value.id == selectedSnippedId }) != -1)
                onSnippetSelected(selectedSnippedId);
            else
                onSnippetSelected(snippets[0].id);
        }

        this.viewModel.onFullscreen = () => {
            if (snippetEventsCbks) snippetEventsCbks.onShowFullscreen(this.app);
        };

        this.viewModel.onShowComments = () => {
            avViewModel.showComments = !avViewModel.showComments;

            if (avViewModel.showComments) {
                highlightLine(this.lineNoToBeExecuted);
            } else {
                this.commentsPopoverHandle = this.snippetEventsCbks.onDisposePopover(this.commentsPopoverHandle);
            }
        };

        this.viewModel.onAutoplayToggled = () => {
            if (avViewModel.isExecutionCompleted) {
                this.viewModel.onRestart();
            }

            if (this.codeDebugger.isNotStarted())
                this.codeDebugger.startReplay();

            avViewModel.isPaused = !avViewModel.isPaused;

            clearInterval(this.autoplayTimer);
            if (avViewModel.isPaused) {
                isAutoPlay = false;
            }
            else {
                this.autoplayTimer = setInterval(() => {
                    avViewModel.isPaused = avViewModel.isExecutionCompleted;

                    if (avViewModel.isPaused) {
                        clearInterval(this.autoplayTimer);
                    }
                    else {
                        if (!this.codeDebugger.isWaiting())
                            advance();
                        else {
                            setTimeout(advance, 20);
                        }
                    }
                }, this.autoReplayInterval);
            }
        }

        this.viewModel.onAdvance = () => {
            if (this.codeDebugger.isNotStarted())
                this.codeDebugger.startReplay();

            if (avViewModel.isPaused)
                advance();
        }

        let advance = () => {
            if (this.codeDebugger.isWaiting()) {
                return;
            }

            this.codeDebugger.advanceOneCodeLine();
        };

        this.viewModel.onRestart = () => {
            avViewModel.isPaused = true;
            avViewModel.isExecutionCompleted = false;
            avViewModel.consoleOutput = "";

            clearInterval(this.autoplayTimer);
            this.autoplayTimer = undefined;
            scopes.clearAll();

            this.codeDebugger.startReplay();
        }

        this.viewModel.onPlaybackSpeedChangedSSlow = () => {
            this.autoReplayInterval = 500;
        }
        this.viewModel.onPlaybackSpeedChangedSlow = () => {
            this.autoReplayInterval = 200;
        }
        this.viewModel.onPlaybackSpeedChangedRealtime = () => {
            this.autoReplayInterval = 0;
        }

        enum OkCancel { Ok, Cancel }

        let retValueOnButton = (userInteraction: UserInteractionType, button: OkCancel, value: any): any => {
            switch (userInteraction) {
                case UserInteractionType.Alert:
                    return undefined;
                case UserInteractionType.Confirm:
                    return button == OkCancel.Ok;
                case UserInteractionType.Prompt:
                    return button == OkCancel.Ok ? value : null;
                default:
                    return undefined;
            }
        }

        let inputBox = self.promptWidget.querySelector('[class=form-control]') as HTMLInputElement;
        inputBox.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                self.viewModel.onPromptOk();
            }
        });

        this.viewModel.onPromptOk = () => {
            let value = (this.promptWidget.querySelector('[class=form-control]') as HTMLInputElement).value;
            this.userInteractionMsgBox.hide();

            this.codeDebugger.onUserInteractionResponse(avViewModel.userInteraction, retValueOnButton(avViewModel.userInteraction, OkCancel.Ok, value));
            avViewModel.isFunctionalityDisabled = false;
        }

        this.viewModel.onPromptCancel = () => {
            this.codeDebugger.onUserInteractionResponse(avViewModel.userInteraction, retValueOnButton(avViewModel.userInteraction, OkCancel.Cancel, null));
            avViewModel.isFunctionalityDisabled = false;
        }

        let formatMsToMMSS = (duration: number) => {
            let milliseconds = Math.floor((duration % 1000) / 100);
            let seconds = Math.floor((duration / 1000) % 60);
            let minutes = Math.floor((duration / (1000 * 60)) % 60);
            let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

            let hoursS = (hours < 10) ? "0" + hours : hours;
            let minutesS = (minutes < 10) ? "0" + minutes : minutes;
            let secondsS = (seconds < 10) ? "0" + seconds : seconds;

            return minutesS + ":" + secondsS;
        }

        this.msgBoxWidget.addEventListener('hidden.bs.toast', () => {
            if (this.timerSolution) {
                clearTimeout(this.timerSolution);
                this.timerSolution = undefined;
            }
        });

        this.viewModel.onShowSolution = () => {
            const MINUTES_REQUIRED_TO_WORK = 2;
            let minToMs = (min: number) => min * 60 * 1000;

            let showSolution = () => {
                this.timeoutExpiredOnce = true;
                avViewModel.isSolution = !avViewModel.isSolution;

                if (avViewModel.isSolution) {
                    this.userCodeBeforeShowSolution = this.codeRenderer.getSourceCode();
                }

                this.codeRenderer.setSourceCode(avViewModel.isSolution ? getCurrentSnippet().solution : this.userCodeBeforeShowSolution);
            }

            let timeWorkedOn = this.timestampTouched ? (Date.now() - this.timestampTouched) : 0;
            avViewModel.timeRemainingForSolution = formatMsToMMSS(minToMs(MINUTES_REQUIRED_TO_WORK) - timeWorkedOn);

            if (timeWorkedOn < minToMs(MINUTES_REQUIRED_TO_WORK)) {
                if (this.timestampTouched) {
                    // If work has started but below threshold then show countdown
                    this.timerSolution = setInterval(() => {
                        let timeWorkedOn = this.timestampTouched ? (Date.now() - this.timestampTouched) : 0;
                        let timeRemainingToWait = minToMs(MINUTES_REQUIRED_TO_WORK) - timeWorkedOn;

                        if (timeRemainingToWait <= 0) {
                            self.userMsgBox.hide();
                            showSolution();
                        } else {
                            avViewModel.timeRemainingForSolution = "" + formatMsToMMSS(timeRemainingToWait);
                        }
                    }, 1000);
                }

                self.userMsgBox.show();
                return
            }

            showSolution();
        }

        new UIBinder(viewModelObs).bindTo(buttonsBar).bindTo(snippetsList).bindTo(rightPane).bindTo(this.promptWidget).bindTo(this.msgBoxWidget);

        // ---------------------------------------

        this.codeDebugger.registerNotificationObserver({
            onEnterScopeVariable: (scopeName: string, observable: ObservableJSVariable) => {
                scopes.add(scopeName, observable);
            },
            onExitScopeVariable: (scopeName: string, observable: ObservableJSVariable) => {
                scopes.remove(scopeName, observable, (status): void => {
                    self.codeDebugger.setWaiting(status);
                });
            }
        });

        this.codeDebugger.registerNotificationObserver({
            onExceptionMessage(status: boolean, message?: string): void {
                avViewModel.exceptionMessage = message;
                avViewModel.hasException = status;

                if (status) {
                    avViewModel.isPaused = status;
                    avViewModel.isExecutionCompleted = true;
                }
            },
            onCompilationError(status: boolean, message?: string): void {
                avViewModel.compilatonErrorMessage = message;
                avViewModel.hasCompilationError = status;

                if (status) {
                    avViewModel.isPaused = status;
                    avViewModel.isExecutionCompleted = true;
                }
            },
            onTraceMessage(message: string): void {
                avViewModel.consoleOutput += message + '\r\n';
            },
            onUserInteractionRequest(userInteraction: UserInteractionType, title?: string, defValue?: string): void {
                self.userInteractionMsgBox.show();
                inputBox.focus();

                avViewModel.isFunctionalityDisabled = true;
                avViewModel.userInteraction = userInteraction;
                avViewModel.promptTitle = title ?? Localize.str(20);
                avViewModel.promptDefaultValue = defValue ?? "";
                avViewModel.hasCancelBtn = (userInteraction != UserInteractionType.Alert);
                avViewModel.hasInputBox = (userInteraction == UserInteractionType.Prompt);
            }
        });

        this.codeDebugger.registerNotificationObserver({
            markcl(lineNo: number): void {
                avViewModel.isExecutionCompleted = false;
                self.lineNoToBeExecuted = lineNo;
                highlightLine(lineNo);
            },
            onExecutionFinished(): void {
                avViewModel.isExecutionCompleted = self.codeDebugger.isReplayFinished();
            }
        });

        let onSourceCodeUpdated = (newCode: string, isUserGenerated: boolean) => {
            if (newCode.trim() == '')
                return;

            if (!this.timeoutExpiredOnce && isUserGenerated)
                this.timestampTouched = Date.now();
            
            avViewModel.isFunctionalityDisabled = false;
            avViewModel.consoleOutput = "";
            scopes.clearAll();

            var doc = new DOMParser().parseFromString(newCode, "text/html");
            newCode = doc.documentElement.textContent;

            self.codeDebugger.setSourceCode(newCode);

            // For pre-filled code in readonly editors, already start the execution
            if (!isWriteable && !isVisualisationDisabled && this.codeDebugger.isNotStarted()) {
                this.codeDebugger.startReplay();
            }

            if (isAutoPlay) 
                this.viewModel.onAutoplayToggled()
        };

        this.codeRenderer.registerEventNotifier({ onSourceCodeUpdated: onSourceCodeUpdated });

        var options = {
            'content': "",
            'html': true,
            "maxLines": "12"
        };

        let getAceCursorElem = (): HTMLElement => { return document.querySelector("[class=myMarker]") as HTMLElement; }

        var displayCommentsPopover = (aceCursor: any) => {
            if (!avViewModel.showComments || isVisualisationDisabled || !aceCursor)
                return;

            this.commentsPopoverHandle = this.snippetEventsCbks.onDisposePopover(this.commentsPopoverHandle);

            let commentsElement = app.querySelector("[class*=commentsPopover]") as HTMLElement;

            if ('style' in aceCursor) {
                commentsElement.style['top'] = parseInt(aceCursor.style['top']) + 1 * parseInt(aceCursor.style['height']) + "px";

                this.commentsPopoverHandle = this.snippetEventsCbks.onShowPopover(commentsElement, options);
            }
        };

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                let aceCursor = getAceCursorElem();

                if (mutationRecord.target != aceCursor && mutationRecord.target != leftPane)
                    return;

                displayCommentsPopover(mutationRecord.target);
            });
        });

        let highlightLine = (lineNo: number) => {
            this.codeRenderer.highlightLine(lineNo);

            let lineComment = this.codeRenderer.getLineComment(lineNo);

            if (lineComment !== "") {
                options.content = lineComment
                let checkerFunc = () => {
                    let aceCursor = getAceCursorElem();

                    if (aceCursor) {
                        observer.observe(aceCursor, { attributes: true, attributeFilter: ['style'] });
                        observer.observe(leftPane, { attributes: true, attributeFilter: ['style'] });

                        // Sometimes the event is lost so trigger it manually
                        displayCommentsPopover(aceCursor);
                    } else {
                        setTimeout(checkerFunc, 200);
                    }
                };

                checkerFunc();
            } else {
                // If we previously had a comment then remove the popover
                if (options.content != "") {
                    this.commentsPopoverHandle = this.snippetEventsCbks.onDisposePopover(this.commentsPopoverHandle);
                }
                options.content = "";
            }
        };

        setTimeout(() => {
            for (let lineMarker of app.querySelectorAll('.ace_gutter-cell')) {
                lineMarker.addEventListener('mouseover', (e) => {
                    let hoveredLineNo = parseInt((e.target as HTMLElement).textContent);

                    options.content = this.codeRenderer.getLineComment(hoveredLineNo);
                    displayCommentsPopover(e.target);
                });

                lineMarker.addEventListener('mouseout', () => {
                    options.content = this.codeRenderer.getLineComment(this.lineNoToBeExecuted);
                    displayCommentsPopover(getAceCursorElem());
                });
            }
        }, 500);

        if (isAutoPlay) {
            this.viewModel.onAutoplayToggled();
        }
    }
}