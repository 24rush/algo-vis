import { Popover } from "bootstrap";
import { FullScreeNotification } from ".";
import { DOMmanipulator } from "./dom-manipulator";
import { Localize } from "./localization";
import { Scene } from "./scene";

var MustacheIt = require('mustache')
var Split = require('split.js').default
var bootstrap = require('bootstrap')

const appTemplate = require('../assets/main.html').default;
const fullScreenModalTemplate = require('../assets/fullscreen.html').default;

export class Snippet {
    public id: number = -1;
    public code: string = "";
    public desc: string = "";
    public level: string = "";
    public solution: string = "";

    constructor(jsonObj: any, counterId: number) {
        this.id = ('id' in jsonObj) ? jsonObj.id : counterId;
        this.code = jsonObj.code;
        this.desc = jsonObj.desc;
        this.level = jsonObj.level ?? "";
        this.solution = jsonObj.solution ?? "";
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

    public loadFromJson(jsonData: any) {
        if (jsonData) {
            Object.keys(jsonData).forEach((snippetLang: any) => {
                if (!(snippetLang in this.snippetsForLang))
                    this.snippetsForLang[snippetLang] = {};

                let counter = 0;
                Object.values(jsonData[snippetLang]).forEach((snippetObj: any) => {
                    if (snippetLang.indexOf("src-") != -1)
                        return;

                    let snippet = new Snippet(snippetObj, counter++);

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

export interface SnippetEvents {
    onShowFullscreen(appWidget: HTMLElement): void;
    onShowPopover(widget: HTMLElement, options: any): bootstrap.Popover;
    onDisposePopover(popover: bootstrap.Popover): any;

    onHideAllPopovers(): any;
    onShowAllPopovers(): any;
}

class SnippetsUI implements SnippetEvents {
    private popoverCache: bootstrap.Popover[] = [];

    public fullscreenModal: any;
    public snippetsModalBody: HTMLElement;
    public appContainer: HTMLElement;
    public orientationWatcher: MediaQueryList = window.matchMedia("(orientation: portrait)");

    initialize() {
        document.body.append(DOMmanipulator.fromTemplate(fullScreenModalTemplate));

        this.snippetsModalBody = document.getElementById('modalBody');
        this.fullscreenModal = new bootstrap.Modal(document.getElementById('fullscreenModal'), {
            keyboard: true
        });
        this.fullscreenModal._element.addEventListener('hidden.bs.modal', (event: any) => {
            this.appContainer.append(document.getElementById('modalBody').children[0]);
            this.onShowAllPopovers();
        });
    }

    onShowFullscreen(appWidget: HTMLElement): void {
        this.appContainer = appWidget.parentElement;
        this.snippetsModalBody.appendChild(appWidget);

        this.onHideAllPopovers();
        this.fullscreenModal.show();
    }

    onShowPopover(widget: HTMLElement, options: any): Popover {
        let popover = new bootstrap.Popover(widget, options);
        this.popoverCache.push(popover);

        popover.show();

        return popover;
    }

    onDisposePopover(popover: typeof bootstrap.Popover): void {
        let idxPopover = this.popoverCache.indexOf(popover);

        if (idxPopover != -1) {
            popover.dispose();
            this.popoverCache.splice(idxPopover, 1);

            return undefined;
        }

        return popover;
    }

    onHideAllPopovers() {
        for (let popover of this.popoverCache) {
            popover.hide();
        }
    }

    onShowAllPopovers() {
        for (let popover of this.popoverCache) {
            popover.show();
        }
    }
}

export class Snippets {
    private snippetsConfig: SnippetsConfig;
    private static snippetsUI: SnippetsUI = new SnippetsUI();

    private readonly GITHUB_SNIPPETS_URL = window.location.hostname == "localhost" ? "/wordpress/snippets/" : "../wp-content/uploads/2023/snips/";

    constructor() {
        Snippets.snippetsUI.initialize();

        let index = 0;
        for (let widget of document.querySelectorAll("[class*=algovis]")) {
            let configId: string = undefined;

            if (widget.hasAttribute('av-exercise')) {
                let jsonFileAndId = widget.getAttribute('av-exercise').split(':');
                configId = jsonFileAndId[0];
            } else {
                configId = widget.getAttribute('config-id');
            }

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

                new Scene(childWidget as HTMLElement, snippets, Snippets.snippetsUI);

                // Don't create the Splitter if we have explicit verticalView or we are in portrait
                let splitWidget: any = undefined;
                let splitSizes = {
                    sizes: [60, 40],
                };

                if (!Snippets.snippetsUI.orientationWatcher.matches && !childWidget.classList.contains('verticalView'))
                    splitWidget = Split([childWidget.children[0], childWidget.children[1]], splitSizes);

                Snippets.snippetsUI.orientationWatcher.addEventListener("change", function (e) {
                    if (e.matches) {
                        if (splitWidget)
                            splitWidget.destroy();
                    } else {
                        if (!childWidget.classList.contains('verticalView'))
                            splitWidget = Split([childWidget.children[0], childWidget.children[1]], splitSizes);
                    }
                });
            };

            if (configId) {
                fetch(this.GITHUB_SNIPPETS_URL + configId)
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

    onFullScreenEvent(isFullScreen: boolean): void {
        isFullScreen ? Snippets.snippetsUI.onHideAllPopovers() : Snippets.snippetsUI.onShowAllPopovers();
    }
}