import { DOMmanipulator } from "./../util/dom-manipulator";

const inlineEditorTemplate = require('../../assets/inline-editor.html').default;
const boxTemplate = require('../../assets/boxTemplates.html').default;

var MustacheIt = require('mustache');
var bootstrap = require('bootstrap')

export class UIHooks {
    constructor(onHookingCompleted: any) {
        window.addEventListener("load", () => {
            this.loadHooks();

            onHookingCompleted();
        });
    }

    loadHooks() {
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

                    let clonedNode = template[1].cloneNode(true);
                    for (let attr of hookElem.attributes) {
                        (clonedNode.firstChild.nextSibling as HTMLElement).setAttribute(attr.name, attr.value);
                    }

                    parentElement.lastChild.after(clonedNode);
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

        // Search for counters
        for (let counter of document.querySelectorAll('[class=counter]')) {
            counter.textContent = "0";

            let updateCounter = () => {
                const target = parseInt(counter.getAttribute("data-target"))
                let count = parseInt(counter.textContent);

                if (count < target) {
                    counter.textContent = `${Math.ceil(++count)}`;
                    setTimeout(updateCounter, 5);
                } else {
                    counter.textContent = target.toString();
                }
            };

            setInterval(updateCounter, 1000);
        };

        // Move counters below the logo
        let counters = document.querySelector('[class=counters]');
        let logo = document.querySelector('[class=flex-container]');
        if (counters && logo) {            
            logo.after(counters);
        }

        // Table of contents            
        let ez_toc_container = document.getElementById('ez-toc-container');
        if (ez_toc_container) {
            ez_toc_container.classList.add('av-ez-toc-container');
        }

        let options = {
            rootMargin: "0px",
            threshold: 1.0,
        };

        let visibilityCache: Record<string, boolean> = {};

        let observer = new IntersectionObserver((entries) => {
            let updHighlightEntry = (targetId: string, highlight: boolean) => {
                let tocElement = document.querySelector('a[href="#' + targetId + '"]') as HTMLElement;
                tocElement.style.fontWeight = highlight ? 'bold' : 'normal';
            };

            entries.forEach((entry) => {
                let ez_toc_container = document.getElementById('ez-toc-container');

                if (ez_toc_container) {
                    ez_toc_container.querySelectorAll('a').forEach((elem) => {
                        elem.style.fontWeight = 'normal';
                    });
                }

                visibilityCache[entry.target.id] = entry.isIntersecting;

                for (let targetId in visibilityCache) {
                    updHighlightEntry(targetId, visibilityCache[targetId]);
                }
            })
        }, options);

        setTimeout(() => { // delay the hook in case the toc was not loaded yet
            for (let tocItem of document.querySelectorAll('[class=ez-toc-section]')) {
                observer.observe(tocItem);
            }
        }, 2000);
    }
}