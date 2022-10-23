import { LangEnum, Localize } from "./localization";
import { Scene } from "./scene";

require('@popperjs/core')
require('bootstrap')
var MustacheIt = require('mustache')

let cssStyle = require('../assets/styles.css').default;
const htmlTemplate = require('../assets/main.html').default;

Localize.setLang(LangEnum.Ro);

let index = 0;
for (let widget of document.querySelectorAll("[class=algovis]")) {
    let indexStr = (index++).toString();

    let codeId = widget.getAttribute('code-id');
    let appVisId = "app-vis-" + indexStr;
    let codeEditorId = "code-editor-" + indexStr;

    let innerHtml = MustacheIt.render(htmlTemplate, { codeEditorId: codeEditorId, appVisId: appVisId, code: widget.innerHTML, index: index });
    widget.innerHTML = innerHtml;

    new Scene(widget as HTMLElement, appVisId, codeEditorId, codeId);
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