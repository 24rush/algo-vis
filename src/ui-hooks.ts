import { DOMmanipulator } from "./dom-manipulator";

const inlineEditorTemplate = require('../assets/inline-editor.html').default;

var MustacheIt = require('mustache');

export class UIHooks {
    private hookIdx = -1;
    
    constructor() {
        let hookedElems = document.querySelectorAll('av-elem');

        for (let hookElem of hookedElems) {
            this.hookIdx++;

            let type = hookElem.getAttribute('type');

            switch (type) {
                case 'ieditor': { 
                    let renderedTemplate = MustacheIt.render(inlineEditorTemplate, {
                        "hookIdx": this.hookIdx 
                    });

                    let template = DOMmanipulator.elemsFromTemplate(renderedTemplate);                    
                    hookElem.parentElement.lastChild.after(template[1]);       
                    hookElem.replaceWith(template[0]);             

                    break;
                }
            }
        }
    }
}