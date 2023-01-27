import { LangEnum, Localize } from "./localization";
import { Scene } from "./scene";

var Split = require('split.js').default

require('@popperjs/core')
var bootstrap = require('bootstrap')
var MustacheIt = require('mustache')

let cssStyle = require('../assets/styles.css').default;
const appTemplate = require('../assets/main.html').default;
const fullScreenModalTemplate = require('../assets/fullscreen.html').default;

let GITHUB_SNIPPETS_URL = "https://raw.githubusercontent.com/24rush/algo-vis/develop/snippets/";

Localize.setLang(LangEnum.Ro);

let fullscreenModalTemplate = document.createElement('div');
fullscreenModalTemplate.innerHTML = fullScreenModalTemplate;
document.body.append(fullscreenModalTemplate.firstChild);

let fullscreenModal = new bootstrap.Modal(document.getElementById('fullscreenModal'), {
    keyboard: true
});

let appContainer: HTMLElement = undefined;

fullscreenModal._element.addEventListener('hidden.bs.modal', (event: any) => {
    appContainer.append(document.getElementById('modalBody').children[0]);
    console.log('hide');
});

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

export type SnippetsAtLevel = Record<string, Snippet[]>;
export type SnippetsForLang = Record<string, SnippetsAtLevel>;

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

let index = 0;
for (let widget of document.querySelectorAll("[class=algovis]")) {
    let configId = widget.getAttribute('config-id');
    let codeEditorId = "code-editor-" + (index++).toString();

    let widgetLoader = (mustacheSnippets : any[] = [], snippets :  Snippet[] = []) => {
        widget.innerHTML = MustacheIt.render(appTemplate, {
            codeEditorId: codeEditorId,
            levels: mustacheSnippets,
            code: widget.innerHTML
        });

        new Scene(widget as HTMLElement, snippets, () => {
            appContainer = widget.parentElement;
            document.getElementById('modalBody').appendChild(widget);
            fullscreenModal.show();
        });

        Split([widget.children[0], widget.children[1]]);
    };

    if (configId) {
        fetch(GITHUB_SNIPPETS_URL + configId)
            .then((response) => {
                if (!response.ok)
                    return;

                response.text().then((config: string) => {
                    let snippetsConfig = new SnippetsConfig();
                    snippetsConfig.loadFromJson(JSON.parse(config));

                    let snippetsForLang = snippetsConfig.getSnippetsForLang(Localize.getLangStr());

                    let mustacheSnippets: any[] = []                    
                    for (let level in snippetsForLang) {
                        mustacheSnippets.push({ 'level': level, 'snippets': snippetsForLang[level] });
                    }

                    let snippets = snippetsConfig.getSnippetsForAllLevels(snippetsForLang);
                    widgetLoader(mustacheSnippets, snippets);
                });
            });
    } else {
        widgetLoader();
    }
}

let styles = document.createElement('style');
styles.appendChild(document.createTextNode(cssStyle));
document.head.append(styles);

let addCss = (fileName: string) => {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = fileName;

    document.head.appendChild(link);
}

addCss('https://cdn.jsdelivr.net/npm/bootstrap@5.2.1/dist/css/bootstrap.min.css');
addCss('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css');