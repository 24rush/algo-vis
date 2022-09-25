import { Scene } from "./scene";
require('bootstrap')
var MustacheIt = require('mustache')

export function logd(msg: string) {
    console.log(msg);
}

let template = 
`<div class="halfScreen">
    <div class="btn-group btn-group-sm">
    <button id="btn-execute" type="button" class="btn">
        <i class="bi bi-play-fill"></i>
        <span>Execute line</span>
    </button>
    <button id="btn-autoplay" type="button" class="btn">
        <i id="btn-autoplay-i" class="bi bi-fast-forward-fill"></i>
        <span id="btn-autoplay-text">Autoplay</span>
    </button>        
    <button id="btn-restart" type="button" class="btn">
        <i class="bi bi-arrow-clockwise"></i>
        <span >Restart</span>
    </button>
    </div>
    <div id="{{codeEditorId}}" style="height: 100%"></div>
    </div>

    <div id="{{appVisId}}" class="halfScreen">
    <ul class="list-group list-group">
        <li class="list-group-item fw-semibold">Compilation
        <button id="btn-compilation-status" type="button" class="btn btn-success btn-sm" style="padding: 1px;">OK</button>
        </li>
        <li class="list-group-item fw-semibold">Variables
        <div id="panelVariablesBody" class="accordion-body">
        </div>
        </li>
        <li class="list-group-item fw-semibold">Console output
        <textarea class="form-control" style="background-color:white; width: 100%; max-width: 100%;" rows="2"
            max-rows="8" id="consoleTxt" disabled></textarea>
        </li>
    </ul>
</div>`;

let index = 0;
for (let widget of document.querySelectorAll("[id=app]")) {
    let codeId = widget.getAttribute('code-id');
    let appVisId = "app-vis-" + index.toString();
    let codeEditorId = "code-editor-" + index.toString();

    let innerHtml = MustacheIt.render(template, { codeEditorId: codeEditorId, appVisId: appVisId});
    widget.innerHTML = innerHtml;

    new Scene(appVisId, codeEditorId, codeId);
}