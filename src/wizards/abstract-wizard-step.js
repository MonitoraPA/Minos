/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const { ipcMain } = require("electron");
const DisposableObserver = require("../commons/disposable-observer");

class AbstractWizardStep extends DisposableObserver{
    /**
     * Step identifier (must be unique among the steps of a wizard)
     */
    name;
    #wizard;
    constructor(wizard){
        super();
        this.#wizard = wizard;
    }

    get wizard(){
        return this.#wizard;
    }

    /**
     * Look at the wizard's state to see if the wizard step was already completed.
     *
     * @returns true if the step was already completed, false otherwise
     */
    alreadyCompleted(wizardState) {
        throw new Error("AbstractWizardStep.alreadyCompleted(wizardState) not implemented.");
    }

    setup(minosGUI){
        throw new Error("AbstractWizardStep.setup(wizardState, ...browserViews) not implemented.");
    }
}

module.exports = AbstractWizardStep;