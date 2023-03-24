import { UIHooks } from "./ui-hooks";
import { LangEnum, Localize } from "./localization";
import { Quizzes } from "./quizzes";
import { Snippets } from "./snippets";

require('@popperjs/core')

let cssStyle = require('../assets/styles.css').default;

Localize.setLang(LangEnum.Ro);

new UIHooks();
new Snippets();
new Quizzes();

let addCss = (fileName: string) => {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = fileName;

    document.head.appendChild(link);
}

addCss('https://cdn.jsdelivr.net/npm/bootstrap@5.2.1/dist/css/bootstrap.min.css');
addCss('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css');
addCss('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

let styles = document.createElement('style');
styles.appendChild(document.createTextNode(cssStyle));
document.head.append(styles);