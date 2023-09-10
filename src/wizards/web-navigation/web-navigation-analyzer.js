/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const AbstractWizard = require('../abstract-wizard');
const WebRecording = require("./step1-web-recording");
const WebNavigationAnalysis = require("./step2-analisys");
const { app, BrowserView } = require("electron");
const path = require('path');

class WebNavigationAnalyzer extends AbstractWizard {
    #steps;
    #currentStep;
    #logs;
    constructor(){
        super();
        this.#steps = [
            new WebRecording(this),
            new WebNavigationAnalysis(this)
        ];
    }

    activate(minosGUI){
        super.activate(minosGUI);
        const addressView = new BrowserView({
            webPreferences: {
                preload: path.resolve(app.getAppPath(), 'src/preload.js'),
            }
        });
        const siteView = new BrowserView({
            x: 0,
            y: 0,
            width: 0,
            height: 0
        });

        //siteView.webContents.setWindowOpenHandler(this.#windowOpenHandler.bind(this));

        this._whileActive(minosGUI.attach('main', addressView));
        this._whileActive(minosGUI.attach('site', siteView));
        this._whileActive(minosGUI.on('resize', this.#setViewsSize.bind(this)));
        this._whileActive(minosGUI.when('main', 'minos/template/activated', () => this.#setViewsSize(minosGUI)));

        this.#currentStep = this.#steps[0];
        this.#currentStep.setup(minosGUI);
    }

    get navigationLogs(){
        return this.#logs;
    }

    saveNavigationLogs(logs){
        /* Navigation logs are NOT saved in wizardState because they do
         * not need to be seen by the views
         */
        if(this.#logs){
            throw new Error("Cannot save navigation's log twice.")
        }
        this.#logs = deepFreeze(logs);
    }

    #setViewsSize(minosGUI){
        if(this.#currentStep){
            this.#currentStep.setViewsSize(minosGUI);
        }
    }

    _onStateChange(minosGUI, key, value, oldValue, state){
        for(const step of this.#steps){
            if(!step.alreadyCompleted()){
                if(step === this.#currentStep){
                    /* the current step is not completed yet */
                    break;
                }
                if(this.#currentStep){
                    this.#currentStep.dispose();
                }
                this.#currentStep = step;
                step.setup(minosGUI)
                break;
            }
        }
        super._onStateChange(minosGUI, key, value, oldValue, state);
    }

    _onDispose() {
        if(this.#currentStep){
            this.#currentStep.dispose();
        }
        this.#currentStep = null;
        this.#logs = null;
    }
}

const deepFreeze = o => {
    if(o === null || typeof o !== "object"){
        return o;
    }
    for (let [key, value] of Object.entries(o)) {
        if (o.hasOwnProperty(key) && typeof value === "object") {
            deepFreeze(value);
        }
    }
    Object.freeze(o);
    return o;
}

module.exports = WebNavigationAnalyzer;