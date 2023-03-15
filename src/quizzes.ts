import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { clientViewModel, ObservableViewModel, UIBinder } from "./ui-framework";

var bootstrap = require('bootstrap')
var MustacheIt = require('mustache')

const fullScreenModalTemplate = require('../assets/quizModal.html').default;
const quizTemplateFront = require('../assets/quizTemplateFront.html').default;
const quizTemplateBack = require('../assets/quizTemplateBack.html').default;

class QuizUI {
    public static fullscreenModal: any;
    public static quizModalHTML: HTMLElement;

    public static quizBodyFront: HTMLElement;
    public static quizBodyBack: HTMLElement;
    public static quizFront: HTMLElement;
    public static quizBack: HTMLElement;

    static initialize() {
        document.body.append(DOMmanipulator.fromTemplate(fullScreenModalTemplate));

        QuizUI.quizModalHTML = document.getElementById('quizModal');
        QuizUI.fullscreenModal = new bootstrap.Modal(QuizUI.quizModalHTML, {
            keyboard: false
        });

        QuizUI.quizBodyFront = document.getElementById('quizModalBodyFront');
        QuizUI.quizBodyBack = document.getElementById('quizModalBodyBack');

        let parentElement = QuizUI.quizBodyFront.parentElement.parentElement;
        QuizUI.quizFront = parentElement.children[0] as HTMLElement;
        QuizUI.quizBack = parentElement.children[1] as HTMLElement;
    }

    static retrieveAnswers() {
        return QuizUI.quizBodyFront.querySelectorAll('[av-bind-onclick=onSelectedAnswer]');
    }

    static flipHTMLElement(elementToFlip: HTMLElement) {
        setTimeout(() => {
            elementToFlip.style.display = 'none';
        }, 500);

        elementToFlip.style.animation = 'none';
        elementToFlip.classList.remove('quizFaceShow');
        elementToFlip.classList.remove('quizContainerFlip');
        elementToFlip.classList.add('quizContainerFlip');
    }

    static showHtmlElement(elementToShow: HTMLElement) {
        setTimeout(() => {
            elementToShow.style.display = 'block';
        }, 500);

        elementToShow.style.animation = 'none';
        elementToShow.classList.remove('quizFaceShow');
        elementToShow.classList.remove('quizContainerFlip');
        elementToShow.classList.add('quizFaceShow');
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

                json[quizLang]["order"].forEach((qID: string) => {
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

    constructor(quizModalHtml: HTMLElement) {        
        let viewModelObs = new ObservableViewModel(this);
        this.quizViewModel = clientViewModel<typeof this>(viewModelObs);
        this.quizViewModel.setDefaults();

        new UIBinder(viewModelObs).bindTo(quizModalHtml);
    }

    startQuizzes() {
        QuizUI.fullscreenModal.show();
    }

    onNextQuiz(): any {
        let newIdx = Math.min(this.currQuizIdx + 1, this.quizzes.length - 1);

        if (newIdx != this.currQuizIdx) {
            this.currQuizIdx = newIdx;
            this.quizViewModel.isQuizVerified = false;
            this.updateStateOnNewQuiz();
        }
    };

    onFinishQuiz(): any {
        QuizUI.fullscreenModal.hide();
    }

    onCheckQuiz(): any {
        let quiz = this.getCurrentQuizData();

        QuizUI.retrieveAnswers().forEach(answer => {
            let currAnswId = answer.getAttribute('av-id');
            let isCorrectAnswer = 'correct' in quiz && (quiz.correct.find((answ: any) => answ == currAnswId) != undefined);

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

        this.quizViewModel.isQuizVerified = true;
    }

    onSelectedAnswer(event: any): any {
        let quiz = this.getCurrentQuizData();
        let clickedAnswerId = event.target.getAttribute('av-id');

        if (!this.isMultipleChoiceQuiz) {
            QuizUI.retrieveAnswers().forEach(answer => {
                let currAnswId = answer.getAttribute('av-id');
                if (currAnswId != clickedAnswerId) {
                    answer.classList.remove('active');
                    quiz.answers.find((answ: any) => answ.id == currAnswId).selected = false;
                }
            });
        }

        let selectedAnswer = quiz.answers.find((answer: any) => answer.id == clickedAnswerId);

        if (selectedAnswer) {
            selectedAnswer.selected = event.target.classList.contains("active");
            this.quizViewModel.hasSelectedAnswers = quiz.answers.find((ans: any) => ans.selected) != undefined;
        }
    }

    onShowExplanation(): any {
        QuizUI.flipHTMLElement(QuizUI.quizFront);
        QuizUI.showHtmlElement(QuizUI.quizBack);
    }

    onShowStatement(): any {
        QuizUI.flipHTMLElement(QuizUI.quizBack);
        QuizUI.showHtmlElement(QuizUI.quizFront);
    }

    public getCurrentQuizIndex(): number {
        return this.currQuizIdx;
    }

    public getCurrentQuizData(): any {
        return this.quizzes[this.currQuizIdx].data;
    }

    public setQuizzes(quizzes: Quiz[]) {
        this.quizViewModel.setDefaults();

        this.quizzes = quizzes;
        this.updateStateOnNewQuiz();
    }

    private updateStateOnNewQuiz() {
        let quiz = this.getCurrentQuizData();
        console.log(quiz);

        this.quizViewModel.hasMoreQuizzes = this.currQuizIdx < (this.quizzes.length - 1);
        this.quizViewModel.hasExplanation = 'explanation' in this.getCurrentQuizData();
        this.quizViewModel.quizProgress = 100 * (this.quizzes.length ? (1 + this.currQuizIdx) / this.quizzes.length : 0) + "%";

        this.fillQuizData();
    }

    private fillQuizData() {
        let quiz = this.getCurrentQuizData();
        QuizUI.quizBodyFront.replaceChild(DOMmanipulator.fromTemplate(MustacheIt.render(quizTemplateFront, quiz)), QuizUI.quizBodyFront.firstChild);
        this.quizViewModel.isMultipleChoiceQuiz = 'correct' in quiz && quiz.correct.length > 1;

        if ('explanation' in quiz) {
            QuizUI.quizBodyBack.replaceChild(DOMmanipulator.fromTemplate(MustacheIt.render(quizTemplateBack, quiz)), QuizUI.quizBodyBack.firstChild);
        }

        new UIBinder(new ObservableViewModel(this)).bindTo(QuizUI.quizBodyFront);
    }
}

export class Quizzes {
    private quizConfigs: Record<string, QuizzesConfig> = {};
    private quizVM: QuizViewModel
    private readonly QUIZZES_URL = "";

    constructor() {
        QuizUI.initialize();
        this.quizVM = new QuizViewModel(QuizUI.quizModalHTML);

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

