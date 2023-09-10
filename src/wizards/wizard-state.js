/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */
class WizardState {
    #state = new Map();
    #listeners = [];

    set(key, valueFactory){
        const oldValue = this.#state.get(key);
        const newValue = valueFactory(new ReadonlyWizardState(this, false));
        if(!oldValue || JSON.stringify(oldValue) !== JSON.stringify(newValue)){
            const facade = new ReadonlyWizardState(this, true);
            this.#state.set(key, newValue)
            for(const listener of this.#listeners){
                listener(key, newValue, oldValue, facade);
            }
        }
        return this;
    }

    get(key){
        const oldValue = this.#state.get(key);

        /* forbid (punish?) in-place modifications */
        const deepCopy = structuredClone(oldValue);

        return deepCopy;
    }

    keys(){
        const keys = this.#state.keys();
        return keys;
    }

    observe(listener){
        if(!listener){
            throw new Error("WizardState.observe: missing listener.")
        }
        if(!(listener instanceof Function)){
            throw new Error("WizardState.observe: listener is not a function.")
        }
        const newElementIndex = this.#listeners.push(listener) - 1;
        return () => {
            this.#listeners.splice(newElementIndex, 1);
        }
    }
    
    toObject(){
        return Object.fromEntries(this.#state);
    }
}

class ReadonlyWizardState {
    #state;
    #allowMoreListeners;
    constructor(wizardState, allowMoreListeners){
        this.#state = wizardState;
        this.#allowMoreListeners = allowMoreListeners;
    }
    set(key, valueFactory){
        throw new Error("Cannot modify the WizardState while  computing new values or reacting to their changes.");
    }
    get(key){
        return this.#state.get(key);
    }
    observe(listener){
        if(this.#allowMoreListeners){
            return this.#state.observe(listener);
        }
        throw new Error("Cannot add listeners to the WizardState while computing new values.");
    }

    toObject(){
        return structuredClone(this.#state.toObject());
    }
}

module.exports = WizardState;