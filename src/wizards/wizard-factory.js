/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */
class WizardFactory{
    label;
    #classConstructor;
    constructor(label, classConstructor){
        this.label = label;
        this.#classConstructor = classConstructor;
    }

    createWizard(){
        const wizard = new this.#classConstructor();
        return wizard;
    }
}

module.exports = WizardFactory;