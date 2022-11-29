import { LangEnum, Localize } from "./localization";
import { Scene } from "./scene";

var Split = require('split.js').default

require('@popperjs/core')
var bootstrap = require('bootstrap')
var MustacheIt = require('mustache')

let cssStyle = require('../assets/styles.css').default;
const appTemplate = require('../assets/main.html').default;
const fullScreenModalTemplate = require('../assets/fullscreen.html').default;

Localize.setLang(LangEnum.Ro);

let fullscreenModalTemplate = document.createElement('div');
fullscreenModalTemplate.innerHTML = fullScreenModalTemplate;
document.body.append(fullscreenModalTemplate.firstChild);

let fullscreenModal = new bootstrap.Modal(document.getElementById('fullscreenModal'), {
    keyboard: true
});

let appContainer : HTMLElement = undefined;

fullscreenModal._element.addEventListener('hidden.bs.modal', (event: any) => {
    appContainer.append(document.getElementById('modalBody').children[0]);
    console.log('hide');
});

let index = 0;
for (let widget of document.querySelectorAll("[class=algovis]")) {
    let codeId = widget.getAttribute('code-id');
    let codeEditorId = "code-editor-" + (index++).toString();

    let innerHtml = MustacheIt.render(appTemplate, { codeEditorId: codeEditorId, code: widget.innerHTML });
    widget.innerHTML = innerHtml;

    new Scene(widget as HTMLElement, codeId, () => {
        appContainer = widget.parentElement;
        document.getElementById('modalBody').appendChild(widget);
        fullscreenModal.show();
    }
    );
    Split([widget.children[0], widget.children[1]]);
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