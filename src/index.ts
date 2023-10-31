import { UIHooks } from "./ui/hooks";
import { Quizzes } from "./ui/quizzes";
import { Snippets } from "./ui/snippets";

import { LangEnum, Localize } from "./util/localization";
Localize.setLang(LangEnum.En);

require('@popperjs/core')

new UIHooks(() => {    
    new Quizzes(new Snippets().onFullScreenEvent);
});

let addCss = (fileName: string) => {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = fileName;

    document.head.appendChild(link);
}

//addCss('https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css');
addCss('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css');
addCss('https://fonts.googleapis.com/css?family=Source+Sans+Pro');
