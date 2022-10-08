import { Scene } from "./scene";
require('@popperjs/core')
require('bootstrap')
var MustacheIt = require('mustache')

export function logd(msg: string) {
    console.log(msg);
}

let cssStyle = `.algovis {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .btn-overrides {
    padding: 3px !important;
  }

  .halfScreen {
    width: 50%;
  }

  .var-box {
    padding: 3px;
  }

  .var-name {
    display: table-cell;
    vertical-align: middle;
    font: 21px/normal 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace
  }

  .var-value {
    display: table-cell;
    text-align: center;
    vertical-align: middle;
    border: 1px solid;
    font: 21px/normal 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace
  }

  .myMarker {
    position: absolute;
    background: rgba(100, 200, 100, 0.5);
    z-index: 20
  }

  .blink {
    animation: blinker 0.2s linear 3;
  }

  @keyframes blinker {
    0% {
      color: rgb(207, 74, 74);
    }

    50% {
      opacity: 0;
      color: rgb(207, 74, 74);
    }

    100% {
      color: black;
    }
  }
  * {
      border-radius: 1px !important;
  }`;

let htmlTemplate =
    `<div class="halfScreen">
        <div class="btn-group btn-group-sm">
            <button id="btn-execute-{{codeEditorId}}" type="button" class="btn btn-light btn-overrides">
                <i class="bi bi-play-fill"></i>
                <span>Execute line</span>
            </button>
            <button id="btn-autoplay-{{codeEditorId}}" type="button" class="btn btn-light btn-overrides">
                <i id="btn-autoplay-i" class="bi bi-fast-forward-fill"></i>
                <span id="btn-autoplay-text">Autoplay</span>
            </button>        
            <button id="btn-restart-{{codeEditorId}}" type="button" class="btn btn-light btn-overrides">
                <i class="bi bi-arrow-clockwise"></i>
                <span >Restart</span>
            </button>
            <div class="btn form-check-inline">
                <input class="form-check-input" type="checkbox" value="" id="showCommentsCheck-{{codeEditorId}}" unchecked>
                <label class="form-check-label" for="showCommentsCheck-{{codeEditorId}}">
                    Show comments
                </label>
            </div>
        </div>        
        <div style="position:relative;" id="comments-{{codeEditorId}}" 
            data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom">    
        </div>
        <div id="{{codeEditorId}}">{{code}}</div>
    </div>

    <div id="{{appVisId}}" class="halfScreen">
    <ul class="list-group list-group">
        <li class="list-group-item fw-semibold">Compilation
        <button id="btn-compilation-status" type="button" class="btn btn-success btn-sm">OK</button>
        </li>
        <li class="list-group-item fw-semibold">Variables    
        
        <div id="panelVariablesBody">
        
        <ul class="list-group list-group-flush" style="display: none;" id="scopeTemplate>
          <li class="list-group-item">{{scopeName}}</li>
        </ul>

        </div>
        </li>
        <li class="list-group-item fw-semibold">Console output
        <textarea class="form-control" style="background-color:white; width: 100%; max-width: 100%;" rows="2"
            max-rows="8" id="consoleTxt" disabled></textarea>
        </li>
    </ul>
</div>`;

let index = 0;
for (let widget of document.querySelectorAll("[class=algovis]")) {
    let indexStr = (index++).toString();

    let codeId = widget.getAttribute('code-id');
    let appVisId = "app-vis-" + indexStr;
    let codeEditorId = "code-editor-" + indexStr;

    let innerHtml = MustacheIt.render(htmlTemplate, { codeEditorId: codeEditorId, appVisId: appVisId, code: widget.innerHTML, index: index });
    widget.innerHTML = innerHtml;

    new Scene(appVisId, codeEditorId, codeId);
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