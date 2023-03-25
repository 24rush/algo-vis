import { DOMmanipulator } from "./dom-manipulator";

const inlineEditorTemplate = require('../assets/inline-editor.html').default;
const boxTemplate = require('../assets/boxTemplates.html').default;

var MustacheIt = require('mustache');
var bootstrap = require('bootstrap')

export class UIHooks {

    constructor() {
        let boxTemplates = [...DOMmanipulator.elemsFromTemplate(boxTemplate)]

        // Search for message boxes
        for (let boxTemplateElem of boxTemplates) {
            let boxClass = boxTemplateElem.classList[0];

            // Looking for only xxxx-box
            if (boxClass.indexOf("-box") == -1)
                continue;

            for (let hookedElem of document.querySelectorAll("[class*=" + boxClass + "]")) {
                let span = DOMmanipulator.createElement('span');
                span.innerHTML = hookedElem.innerHTML;
                hookedElem.innerHTML = "";

                boxTemplateElem = boxTemplateElem.cloneNode(true) as HTMLElement;
                boxTemplateElem.classList.remove(boxClass);

                hookedElem.append(boxTemplateElem);
                hookedElem.append(span);
            }
        }

        // Search for inline code editors (from exercise pages)  
        let hookIdx = -1;
        for (let hookElem of document.querySelectorAll('av-elem')) {
            hookIdx++;

            let type = hookElem.getAttribute('type');

            switch (type) {
                case 'ieditor': {
                    let renderedTemplate = MustacheIt.render(inlineEditorTemplate, {
                        "hookIdx": hookIdx
                    });

                    let template = DOMmanipulator.elemsFromTemplate(renderedTemplate);                    
                    hookElem.after(template[0].cloneNode(true))                    

                    let parentElement = hookElem.parentElement;
                    if (parentElement.tagName.toLowerCase() != 'li') 
                        parentElement = parentElement.parentElement;

                    parentElement.lastChild.after(template[1].cloneNode(true));                    
                    hookElem.remove()
                    
                    break;
                }
            }
        }

        // Search for av-tip        
        for (let hookElem of document.querySelectorAll('[class*=av-tippie]')) {
            hookElem.setAttribute("data-bs-toggle", "tooltip");
            hookElem.setAttribute("data-bs-placement", "top");

            new bootstrap.Tooltip(hookElem)
        }

        // Search for list-arrows
        for (let boxTemplateElem of boxTemplates) {
            let boxClass = boxTemplateElem.classList[0];

            if (boxClass != "list-arrow")
                continue;

            for (let hookedElem of document.querySelectorAll("[class*=list-arrow]")) {                                                                                
                hookedElem.append((boxTemplateElem.cloneNode(true) as HTMLElement).children[0]);                
            }
        }
    }
}