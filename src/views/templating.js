/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

/**
 * Minimal templating system to connect views with controllers via IPC
 */

function renderUI(state){
    window.wizardState = state;
    renderTree(document.body, state);
}

function activateDocument(){
    activateTree(document.body, []);

    /* if the document require some initialization, just define initView */
    if(typeof initView === 'function'){
        initView();
    }

    /* subscribe to wizard's state changes */
    window.minos.onWizardStateChange((event, newState) => {
        renderUI(newState);
    });

    /* inform Minos we are ready */
    window.minos.dispatch('minos/template/activated', window.location.href);
}

function logOnException(message, code){
    return `try{
        ${code}
    } catch (e) {
        console.error("${message}", e, currentElement);
        throw new Error("${message}" + ": " + e);
    }`;
}

function activateSingleNode(node, parentScope){
    let activationError = false;
    let code = "";

    /* wherther we need to do anything */
    const conditionText = node.getAttribute("if");
    if(conditionText){
        code = logOnException("Cannot compute condition", `return (${conditionText});`);
        node.condition = Function("currentElement", "wizardState", ...parentScope, code);
    }

    /* variables in scope */
    code = "";
    const newVars = Object.keys(node.dataset);
    if(newVars.length > 0){
        node.scopeVars = [...parentScope, ...newVars];
        code += `currentElement.scopeValues = [...(currentElement.parentElement?.scopeValues ?? [])];\n`
        for(const idxS in newVars){
            const idx = parseInt(idxS);
            const index = idx + parentScope.length;
            const variableName = newVars[idx];
            const rhs = node.dataset[variableName];
            code += `currentElement.scopeValues[${index}] = (${rhs});\n`
        }
        code = logOnException("Cannot compute scope values", code);
        node.scopeBuilder = Function("currentElement", "wizardState", ...parentScope, code);
    } else {
        node.scopeVars = parentScope;
    }

    /* actual dom manipulation */
    code = "";

    const innerText = node.getAttribute("text");
    if(innerText){
        code += `currentElement.innerText = (${innerText})\n`;
    }

    const attributes = node.getAttributeNames();
    for(const name of attributes.filter(n => n.indexOf(":") > -1)){
        if(name.startsWith("set:")){
            const toSet = name.substring(4);
            if(toSet.length === 0){
                console.error("Missing attribute name to set in ", node);
                activationError = true;
            } else if(["disabled", "autofocus"].includes(toSet)){
                /* WHATWG and W3C are not dumb: they are evil! ... */
                code += `if(${node.getAttribute(name)}){
                    currentElement.setAttribute("${toSet}", "${toSet}");
                } else {
                    currentElement.removeAttribute("${toSet}");
                }\n`;
            } else if(node.tagName === "INPUT" && toSet === "value"){
                /* ... REALLY evil! */
                code += `currentElement.value = (${node.getAttribute(name)})\n`;
            } else {
                code += `currentElement.setAttribute("${toSet}", (${node.getAttribute(name)}));\n`;
            }
        } else if(name.startsWith("on:")) {
            const dataIndex = name.indexOf(":data");
            if(dataIndex > -1){
                if(!node.getAttribute(name.substring(0, dataIndex))){
                    console.error("Missing event for payload " + name, node);
                    activationError = true;
                }
            } else {
                const domEvent = name.replace("on:", "");
                const minosEvent = node.getAttribute(name);
                const dataText = node.getAttribute(name + ":data");
                if(dataText){
                    if(!node.minosEvents){
                        node.minosEvents = {};
                    }
                    node.minosEvents[minosEvent] = Function("currentElement", ...node.scopeVars, `return (${dataText});`)
                }
                if(!node.eventSubscriptions){
                    node.eventSubscriptions = [];
                }
                node.eventSubscriptions.push(
                    n => n.addEventListener(domEvent, minosDispatch.bind(n, minosEvent), {passive: true})
                );
            }
        }
    }

    const loopIterable = node.getAttribute("to");
    const loopTemplateId = node.getAttribute("map");

    if((!!loopIterable || !!loopTemplateId)
    &&!(!!loopIterable && !!loopTemplateId)){
        console.error("Incomplete loop in ", node);
        activationError = true;
    }

    if(!!loopIterable && !!loopTemplateId){
        const loopTemplate = document.getElementById(loopTemplateId);
        if(!loopTemplate){
            console.error("Cannot find template with id="+ loopTemplateId + " required in loop", node);
            activationError = true;
        }

        const iteractionKey = loopTemplate.getAttribute('key');
        const iteractionItem = loopTemplate.getAttribute('item');
        if(!iteractionKey && !iteractionItem){
            console.error("Missing both key and item attributes in template with id=", node.getAttribute("id"));
            activationError = true;
        }

        bindTemplate(node, loopTemplate, iteractionKey, iteractionItem);

        code += `
        currentElement.innerHTML = '';
        for(const k in (${loopIterable})){
            const i = (${loopIterable})[k];
            const newChild = cloneTemplate(currentElement.activeTemplate);
            newChild.scopeValues = [...currentElement.scopeValues];
            `
        if(iteractionKey){
            code += `newChild.scopeValues.push(k);
            `;
        }
        if(iteractionItem){
            code += `newChild.scopeValues.push(i);
            `;
        }
        code += `
            /* the scopeValues are ready */
            newChild.scopeBuilder = () => {};

            currentElement.appendChild(newChild);
        }
        `;
    }
    code = logOnException("Cannot compute how to renderData", code);
    node.renderData = Function("currentElement", "wizardState", ...node.scopeVars, code);

    if(node.eventSubscriptions){
        subscribeNodeEvents(node);
    }

    if(activationError){
        throw new Error("Error while activating " + node.outerHTML + " (see console logs)");
    }
}

function subscribeNodeEvents(node){
    for(const subscribe of node.eventSubscriptions){
        subscribe(node);
    }
}
function minosDispatch(minosEvent){
    const data = getDataFor(minosEvent, this);
    window.minos.dispatch(minosEvent, data);
}

function getDataFor(minosEvent, node){
    console.log('getDataFor', minosEvent, node.minosEvents);
    if(node.minosEvents){
        const retriever = node.minosEvents[minosEvent];
        if(retriever){
            const data = retriever(node, ...node.scopeValues);
            return data;
        }
    }
}

function elementIsEnabled(currentElement, wizardState, parentScope){
    if(!currentElement.condition){
        return true;
    }

    const enabled = currentElement.condition(currentElement, wizardState, ...parentScope);
    return enabled
}

function renderSingleNode(currentElement, wizardState){
    const parentScope = currentElement.parentElement?.scopeValues ?? [];
    if(elementIsEnabled(currentElement, wizardState, parentScope)){
        if(currentElement.scopeBuilder){
            currentElement.scopeBuilder(currentElement, wizardState, ...parentScope);
        } else {
            currentElement.scopeValues = parentScope;
        }
        if(currentElement.renderData){
            currentElement.renderData(currentElement, wizardState, ...currentElement.scopeValues);
        }
        if(currentElement.style.display=='none'){
            currentElement.style.display = null;
        }
        return true;
    } else {
        currentElement.style.display='none';
        return false;
    }
}

function renderTree(rootElement, wizardState){
    if(renderSingleNode(rootElement, wizardState)){
        for (let i = 0; i < rootElement.children.length; i++) {
            renderTree(rootElement.children[i], wizardState);
        }
    }
}

function cloneTemplate(activeTemplate){
    if(!activeTemplate){
        debugger;
    }
    const clone = activeTemplate.cloneNode(true);
    copyScopingInfos(activeTemplate, clone);
    return clone;
}

function copyScopingInfos(source, target){
    /* The array and the function copied are not going to be modified,
     * so we can set direct references.
     */
    if(source.scopeVars){
        target.scopeVars = source.scopeVars;
    }
    if(source.scopeBuilder){
        target.scopeBuilder = source.scopeBuilder;
    }
    if(source.condition){
        target.condition = source.condition;
    }
    if(source.renderData){
        target.renderData = source.renderData;
    }
    if(source.minosEvents){
        target.minosEvents = source.minosEvents;
    }
    if(source.activeTemplate){
        target.activeTemplate = source.activeTemplate;
    }
    if(source.eventSubscriptions){
        target.eventSubscriptions = source.eventSubscriptions;
        subscribeNodeEvents(target);
    }
    for (let i = 0; i < source.children.length; i++) {
        copyScopingInfos(source.children[i], target.children[i]);
    }
}

function createWrapperFor(containerTagName){
    console.log('createWrapperFor', containerTagName)
    switch(containerTagName){
        case 'TABLE':
            return document.createElement("TR");
        case 'TBODY':
            return document.createElement("TR");
        case 'OL':
            return document.createElement("LI");
        case 'UL':
            return document.createElement("LI");
        default:
            return document.createElement('DIV');
    }
}

function bindTemplate(loopingNode, templateNode, iteractionKey, iteractionItem){
    const wrapper = createWrapperFor(loopingNode.tagName);
    const scopeVars = [...loopingNode.scopeVars]
    if(iteractionKey){
        scopeVars.push(iteractionKey);
    }
    if(iteractionItem){
        scopeVars.push(iteractionItem);
    }
    wrapper.append(templateNode.content.cloneNode(true));
    activateTree(wrapper, scopeVars);

    loopingNode.activeTemplate = wrapper;
}

function activateTree(node, parentScope){
    activateSingleNode(node, parentScope);
    for(const child of node.children){
        activateTree(child, node.scopeVars);
    }
}

/*
[
    "data-variableName=expression",
    "apply=tpl to=iterable",
    "if=condition",
    "set:attribute=expression",
    "text",
    "on:event=dispatch on:event:payload=payload"
] => nodeScope (inherited by children)
*/
