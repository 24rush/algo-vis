import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { Scene } from "./scene";

var MustacheIt = require('mustache')
var Split = require('split.js').default
var bootstrap = require('bootstrap')

const appTemplate = require('../assets/main.html').default;
const fullScreenModalTemplate = require('../assets/fullscreen.html').default;

let GITHUB_SNIPPETS_URL = "../wp-content/uploads/2023/snips/";

export class Snippet {
    public id: number = -1;
    public code: string = "";
    public desc: string = "";
    public level: string = "";

    constructor(jsonObj: any, id: number) {
        this.id = id;
        this.code = jsonObj.code;
        this.desc = jsonObj.desc;
        this.level = jsonObj.level ?? "";
    }
}

type SnippetsAtLevel = Record<string, Snippet[]>;
type SnippetsForLang = Record<string, SnippetsAtLevel>;

class SnippetsConfig {
    public snippetsForLang: SnippetsForLang = {};

    constructor(json: any = undefined) {
        if (json) {
            this.loadFromJson(json);
        }
    }

    public loadFromJson(json: any) {
        if (json) {
            let counterSnippets = 0;
            Object.keys(json).forEach((snippetLang: any) => {
                if (!(snippetLang in this.snippetsForLang))
                    this.snippetsForLang[snippetLang] = {};

                json[snippetLang].forEach((snippetObj: any) => {
                    let snippet = new Snippet(snippetObj, counterSnippets++);

                    if (!(snippet.level in this.snippetsForLang[snippetLang]))
                        this.snippetsForLang[snippetLang][snippet.level] = [];

                    this.snippetsForLang[snippetLang][snippet.level].push(snippet);
                });
            });
        }
    }

    public getSnippetsForLang(langStr: string): SnippetsAtLevel {
        if (langStr in this.snippetsForLang)
            return this.snippetsForLang[langStr];

        return {};
    }

    public getSnippetsForAllLevels(snippetsForLang: SnippetsAtLevel): Snippet[] {
        let allSnips: Snippet[] = [];

        for (let snipLevel in snippetsForLang) {
            allSnips = allSnips.concat(snippetsForLang[snipLevel]);
        }

        return allSnips;
    }

    public getAllSnippetsForLang(langStr: string): Snippet[] {
        let allSnips: Snippet[] = [];

        for (let snipLevel in this.snippetsForLang[langStr]) {
            allSnips = allSnips.concat(this.snippetsForLang[langStr][snipLevel]);
        }

        return allSnips;
    }
}

class SnippetsUI {
    public static fullscreenModal: any;
    public static snippetsModalBody: HTMLElement;
    public static appContainer: HTMLElement;
    public static orientationWatcher: MediaQueryList = window.matchMedia("(orientation: portrait)");

    static initialize() {
        document.body.append(DOMmanipulator.fromTemplate(fullScreenModalTemplate));

        SnippetsUI.snippetsModalBody = document.getElementById('modalBody');
        SnippetsUI.fullscreenModal = new bootstrap.Modal(document.getElementById('fullscreenModal'), {
            keyboard: true
        });
        SnippetsUI.fullscreenModal._element.addEventListener('hidden.bs.modal', (event: any) => {
            SnippetsUI.appContainer.append(document.getElementById('modalBody').children[0]);
        });
    }
}

export class Snippets {
    private snippetsConfig: SnippetsConfig;

    constructor() {
        SnippetsUI.initialize();

        let index = 0;
        for (let widget of document.querySelectorAll("[class*=algovis]")) {
            let configId = widget.getAttribute('config-id');
            let codeEditorId = "code-editor-" + (index++).toString();

            let widgetLoader = (mustacheSnippets: any[] = [], snippets: Snippet[] = []) => {             
                widget.innerHTML = MustacheIt.render(appTemplate, {
                    codeEditorId: codeEditorId,
                    levels: mustacheSnippets,
                    code: widget.innerHTML
                });

                // Move attributes from existing hooked element to the created child div                
                let childWidget = (widget.firstChild as HTMLElement)

                for (let attr of [...widget.attributes]) {                    
                    childWidget.setAttribute(attr.name, attr.value);
                    widget.removeAttribute(attr.name);
                }                

                new Scene(childWidget as HTMLElement, snippets, () => {
                    // Fullscreen callback
                    SnippetsUI.appContainer = childWidget.parentElement;
                    SnippetsUI.snippetsModalBody.appendChild(childWidget);
                    SnippetsUI.fullscreenModal.show();
                });

                let splitWidget = !childWidget.classList.contains('verticalView') ? Split([childWidget.children[0], childWidget.children[1]]) : undefined;

                SnippetsUI.orientationWatcher.addEventListener("change", function (e) {
                    if (e.matches) {
                        if (splitWidget)
                            splitWidget.destroy();
                    } else {
                        if (!childWidget.classList.contains('verticalView'))
                            splitWidget = Split([childWidget.children[0], childWidget.children[1]]);
                    }
                });
            };

            if (configId) {
                fetch(GITHUB_SNIPPETS_URL + configId)
                    .then((response) => {
                        if (!response.ok)
                            return;

                        response.text().then((config: string) => {
                            this.snippetsConfig = new SnippetsConfig();
                            this.snippetsConfig.loadFromJson(JSON.parse(config));

                            let snippetsForLang = this.snippetsConfig.getSnippetsForLang(Localize.getLangStr());

                            let mustacheSnippets: any[] = []
                            for (let level in snippetsForLang) {
                                mustacheSnippets.push({ 'level': level, 'snippets': snippetsForLang[level] });
                            }

                            let snippets = this.snippetsConfig.getSnippetsForAllLevels(snippetsForLang);
                            widgetLoader(mustacheSnippets, snippets);
                        });
                    });
            } else {
                widgetLoader();
            }
        }
    }
}