import { UIHooks } from "./ui-hooks";
import { LangEnum, Localize } from "./localization";
import { Quizzes } from "./quizzes";
import { Snippets } from "./snippets";

require('@popperjs/core')

Localize.setLang(LangEnum.Ro);

export type FullScreeNotification = (isFullScreen: boolean) => void;

new UIHooks(() => {
    let snippets = new Snippets();
    new Quizzes(snippets.onFullScreenEvent);
});

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
