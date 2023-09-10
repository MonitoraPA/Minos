/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const DisposableObserver = require("../commons/disposable-observer");
const WizardState = require("./wizard-state");

/**
 * Base class for wizards
 *
 * Wizards define the GUI and coordinate the processing of user's requests
 * to get a certain job done.
 */
class AbstractWizard extends DisposableObserver {
    #state;
    #pendingViewNotification;

    constructor(){
        super();
        this.#state = new WizardState();
    }

    set(key, valueFactory){
        this.#state.set(key, valueFactory);
    }

    get(key){
        return this.#state.get(key);
    }

    keys(){
        const keys = this.#state.keys();
        return keys;
    }

    activate(minosGUI){
        this._whileActive(this.#state.observe(this._onStateChange.bind(this, minosGUI)));
    }

    _onStateChange(minosGUI, key, newValue, oldValue, state){
        //console.log('AbstractWizard._onStateChange', key, newValue, oldValue, state);
        if(!this.#pendingViewNotification){
            this.#pendingViewNotification = setTimeout(() => {
                /* we defer the notification so that if several changes occur in the same time-slice
                 * they will be reflected by the GUI in a single redraw
                 */
                minosGUI.notifyStateChange(state);
                this.#pendingViewNotification = null;
            }, 0)
        }
    }
}

module.exports = AbstractWizard;