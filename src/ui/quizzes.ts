import { DOMmanipulator } from "./../util/dom-manipulator";
import { Localize } from "./../util/localization";
import { clientViewModel, ObservableViewModel, UIBinder } from "./../util/ui-framework";

var bootstrap = require('bootstrap')
var MustacheIt = require('mustache')

const quizTemplateFront = require('../../assets/quizTemplateFront.html').default;
const quizTemplateBack = require('../../assets/quizTemplateBack.html').default;

type FullScreeNotification = (isFullScreen: boolean) => void;

class QuizUI {
    private static fullscreenModal: bootstrap.Modal;

    private static quizBodyFront: HTMLElement;
    private static quizBodyBack: HTMLElement;
    private static quizFront: HTMLElement;
    private static quizBack: HTMLElement;
    private static quizModalHTML: HTMLElement;

    private uiBinder: UIBinder = undefined;

    static {
        const fullScreenModalTemplate = require('../../assets/quizModal.html').default;
        document.body.append(DOMmanipulator.fromTemplate(fullScreenModalTemplate));

        QuizUI.quizModalHTML = document.getElementById('quizModal');
        QuizUI.quizBodyFront = document.getElementById('quizModalBodyFront');
        QuizUI.quizBodyBack = document.getElementById('quizModalBodyBack');

        QuizUI.fullscreenModal = new bootstrap.Modal(QuizUI.quizModalHTML, {
            keyboard: false
        });

        let parentElement = QuizUI.quizBodyFront.parentElement.parentElement;
        QuizUI.quizFront = parentElement.children[0] as HTMLElement;
        QuizUI.quizBack = parentElement.children[1] as HTMLElement;
    }

    constructor(quizViewModel: ObservableViewModel, private fullscreenNotification: FullScreeNotification) {
        this.uiBinder = new UIBinder(quizViewModel).bindTo(QuizUI.quizModalHTML)
    }

    onNewQuiz(quiz: any) {
        let id = 0;
        for (let answer of quiz.answers) {
            answer.id = id++;
        }

        QuizUI.quizBodyFront.replaceChild(DOMmanipulator.fromTemplate(MustacheIt.render(quizTemplateFront, quiz)), QuizUI.quizBodyFront.firstChild);

        if ('explanation' in quiz) {
            QuizUI.quizBodyBack.replaceChild(DOMmanipulator.fromTemplate(MustacheIt.render(quizTemplateBack, quiz)), QuizUI.quizBodyBack.firstChild);
        }

        this.uiBinder.bindTo(QuizUI.quizBodyFront);
    }

    onHighlightAnswers(quiz: any) {
        this.retrieveAnswers().forEach(answer => {
            let currAnswId = answer.getAttribute('av-id');
            let isCorrectAnswer = quiz.answers.find((answ: any) => answ.correct && answ.id == currAnswId) != undefined;

            if (isCorrectAnswer) {
                answer.classList.add("btn-success");
            } else
                if (answer.classList.contains('active')) {
                    answer.classList.add("btn-danger");
                }

            answer.classList.remove('btn-light');
            answer.classList.remove('active');
            answer.classList.add('disabled');
        });
    }

    onUpdateSelectedAnswers(quiz: any) {
        this.retrieveAnswers().forEach((answer) => {
            let quizAnswer = quiz.answers.find((ans : any) => ans.id == answer.getAttribute('av-id'));

            if (quizAnswer && quizAnswer.selected == false) {
                answer.classList.remove('active');
            }
        })
    }

    private retrieveAnswers() {
        return QuizUI.quizBodyFront.querySelectorAll('[av-bind-onclick=onSelectedAnswer]');
    }

    flipHTMLElement(elementToFlip: HTMLElement) {
        setTimeout(() => {
            elementToFlip.style.display = 'none';
        }, 500);

        elementToFlip.style.animation = 'none';
        elementToFlip.classList.remove('quizFaceShow');
        elementToFlip.classList.remove('quizContainerFlip');
        elementToFlip.classList.add('quizContainerFlip');
    }

    showHtmlElement(elementToShow: HTMLElement) {
        setTimeout(() => {
            elementToShow.style.display = 'block';
        }, 500);

        elementToShow.style.animation = 'none';
        elementToShow.classList.remove('quizFaceShow');
        elementToShow.classList.remove('quizContainerFlip');
        elementToShow.classList.add('quizFaceShow');
    }

    removeScrolling() {
        document.body.classList.add('noScroll');
        document.documentElement.classList.add('noScroll');
    }

    addScrolling() {
        document.body.classList.remove('noScroll');
        document.documentElement.classList.remove('noScroll');
    }

    onShowStatement() {
        this.flipHTMLElement(QuizUI.quizBack);
        this.showHtmlElement(QuizUI.quizFront);
    }

    onShowExplanation() {
        this.flipHTMLElement(QuizUI.quizFront);
        this.showHtmlElement(QuizUI.quizBack);
    }

    goFullScreen() {
        this.removeScrolling();
        QuizUI.fullscreenModal.show();

        this.fullscreenNotification(true);
    }

    exitFullScreen() {
        this.addScrolling();
        QuizUI.fullscreenModal.hide();

        this.fullscreenNotification(false);

        //this.uiBinder.unbind();
    }
}

class Quiz {
    public id: string = "";
    public data: any;

    constructor(id: string, jsonObj: any) {
        this.id = id;
        this.data = jsonObj;
    }
}

class QuizzesConfig {
    private quizzesForLang: Record<string, Quiz[]> = {};

    constructor(json: any = undefined) {
        if (json) {
            this.loadFromJson(json);
        }
    }

    public loadFromJson(json: any) {
        // Loads all quizzes for all languages and puts them in array based on specified order
        if (json) {
            Object.keys(json).filter((value) => value.indexOf('-') == -1).forEach((quizLang: any) => {

                let quizzes: Record<string, Quiz> = {};

                Object.keys(json[quizLang]).filter((key => key != "order")).forEach((quizId: string) => {
                    if (!(quizLang in this.quizzesForLang))
                        this.quizzesForLang[quizLang] = [];

                    quizzes[quizId] = new Quiz(quizId, json[quizLang][quizId]);
                });

                let quizOrder = "order" in json[quizLang] ? json[quizLang]["order"] : [...Array(Object.keys(quizzes).length).keys()];
                console.log(quizzes)
                quizOrder.forEach((qID: string) => {
                    this.quizzesForLang[quizLang].push(quizzes[qID]);
                });
            });
        }
    }

    public getQuizzesForLang(langStr: string): Quiz[] {
        if (langStr in this.quizzesForLang)
            return this.quizzesForLang[langStr];

        return [];
    }
}

class QuizViewModel {
    private quizViewModel: QuizViewModel;
    private quizUI: QuizUI;

    private quizzes: Quiz[] = [];
    private currQuizIdx: number = 0;

    // UI bindings
    private isMultipleChoiceQuiz = false;
    private quizProgress: string = "0%";
    private hasSelectedAnswers = false;
    private isQuizVerified = false;
    private hasMoreQuizzes = false;
    private hasExplanation = false;

    public setDefaults() {
        this.quizzes = [];
        this.currQuizIdx = 0;
        this.isMultipleChoiceQuiz = false;
        this.quizProgress = "0%";
        this.hasSelectedAnswers = false;
        this.isQuizVerified = false;
        this.hasMoreQuizzes = false;
        this.hasExplanation = false;
    }

    constructor(fullscreenNotification: FullScreeNotification) {
        let viewModelObs = new ObservableViewModel(this);
        this.quizViewModel = clientViewModel<typeof this>(viewModelObs);
        this.quizViewModel.setDefaults();

        this.quizUI = new QuizUI(viewModelObs, fullscreenNotification);
    }

    startQuizzes() {
        this.quizUI.goFullScreen();
        this.quizUI.onShowStatement();

        //@ts-ignore
        Prism.highlightAll();
    }

    onNextQuiz(): any {
        let newIdx = Math.min(this.currQuizIdx + 1, this.quizzes.length - 1);

        if (newIdx != this.currQuizIdx) {
            this.currQuizIdx = newIdx;
            this.updateStateOnNewQuiz();

            //@ts-ignore
            Prism.highlightAll();
        }
    };

    onFinishQuiz(): any {
        this.quizUI.exitFullScreen();
    }

    onCheckQuiz(): any {
        this.quizUI.onHighlightAnswers(this.getCurrentQuizData())
        this.quizViewModel.isQuizVerified = true;
    }

    onSelectedAnswer(event: any): any {
        if (this.quizViewModel.isQuizVerified)
            return;

        let hitHtmlElement = (event.target as HTMLElement);
        // Bubble up the hierarchy until we find the button just in case the 
        // triggering element is something not a button
        while (hitHtmlElement && hitHtmlElement.nodeName != 'BUTTON') {        
            hitHtmlElement = hitHtmlElement.parentElement;
        }
        
        let quiz = this.getCurrentQuizData();
        let clickedAnswerId = hitHtmlElement.getAttribute('av-id');

        if (!this.isMultipleChoiceQuiz) {
            quiz.answers.forEach((answ: any) => answ.selected = (answ.id == clickedAnswerId));
            this.quizUI.onUpdateSelectedAnswers(quiz);
        }

        let selectedAnswer = quiz.answers.find((answer: any) => answer.id == clickedAnswerId);

        if (selectedAnswer) {
            selectedAnswer.selected = hitHtmlElement.classList.contains("active");
        }

        this.quizViewModel.hasSelectedAnswers = quiz.answers.find((ans: any) => ans.selected) != undefined;
    }

    onShowExplanation(): any {
        this.quizUI.onShowExplanation();
    }

    onShowStatement(): any {
        this.quizUI.onShowStatement();
    }

    public getCurrentQuizIndex(): number {
        return this.currQuizIdx;
    }

    public getCurrentQuizData(): any {
        return this.quizzes[this.currQuizIdx].data;
    }

    public setQuizzes(quizzes: Quiz[]) {
        this.quizViewModel.setDefaults();

        this.quizzes = [...quizzes];
        this.updateStateOnNewQuiz();
    }

    private updateStateOnNewQuiz() {
        let quiz = this.getCurrentQuizData();

        this.quizViewModel.hasMoreQuizzes = this.currQuizIdx < (this.quizzes.length - 1);
        this.quizViewModel.hasExplanation = 'explanation' in this.getCurrentQuizData();
        this.quizViewModel.quizProgress = 100 * (this.quizzes.length ? (1 + this.currQuizIdx) / this.quizzes.length : 0) + "%";
        this.quizViewModel.isMultipleChoiceQuiz = quiz.answers.filter((answ: any) => answ.correct).length > 1;
        this.quizViewModel.isQuizVerified = false;        
        this.quizViewModel.hasSelectedAnswers = false;

        this.quizUI.onNewQuiz(quiz);
    }
}

export class Quizzes {
    private quizConfigs: Record<string, QuizzesConfig> = {};
    private quizVM: QuizViewModel

    private readonly QUIZZES_URL = "/assets/algovis/quizzes/";    

    constructor(fullscreenNotification: FullScreeNotification) {
        this.quizVM = new QuizViewModel(fullscreenNotification);

        for (let widget of document.querySelectorAll("[class*=av-quiz]")) {
            widget.addEventListener('click', () => {
                let configId = widget.getAttribute('config-id');

                if (!configId)
                    return;

                if (configId in this.quizConfigs) {
                    this.startQuizzes(configId);
                    return;
                }

                fetch(this.QUIZZES_URL + configId)
                    .then((response) => {
                        if (!response.ok)
                            return;

                        response.text().then((quizData: string) => {
                            this.quizConfigs[configId] = new QuizzesConfig(JSON.parse(quizData));
                            this.startQuizzes(configId);
                        });
                    });
            });
        }
    }

    private startQuizzes(configId: string) {
        this.quizVM.setQuizzes(this.quizConfigs[configId].getQuizzesForLang(Localize.getLangStr()));
        this.quizVM.startQuizzes();
    }
}

