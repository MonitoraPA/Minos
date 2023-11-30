/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const strings = require("../../commons/strings");
const AbstractWizard = require('../abstract-wizard');

const { app, BrowserView } = require("electron");
const path = require('path');

class WizardSelector extends AbstractWizard {
    #factories;
    #activator;
    constructor(factories, activator){
        super();
        this.#factories = factories;
        this.#activator = activator;
    }

    activate(minosGUI){
        super.activate(minosGUI);
        const view = new BrowserView({
            webPreferences: {
                preload: path.resolve(app.getAppPath(), 'src/preload.js'),
            }
        });
        this._whileActive(minosGUI.attach('view', view));
        this._whileActive(minosGUI.when('view', 'wizard/start', this.#onSelection.bind(this)));
        this._whileActive(minosGUI.when('view', 'minos/template/activated', () => this.#setViewSize(minosGUI)));
        this._whileActive(minosGUI.when('view', 'minos/show/license', minosGUI.openExternal('https://monitora-pa.it/LICENSE.txt')));
        this._whileActive(minosGUI.setWizardMenu([]));

        this._whileActive(minosGUI.on('resize', this.#setViewSize.bind(this)));
        minosGUI.showTemplate('view','src/wizards/start/home.html')
            //.then(() => view.webContents.openDevTools({ mode: 'detach' }))
            .then(() => {
                this.set('strings', () => strings.components.main);
                this.set('wizards', () => this.#factories.map(w => w.label));
            })
            .catch(e => console.error(e));
    }

    #setViewSize(minosGUI){
        const bounds = minosGUI.getBounds();
        minosGUI.getView('view').setBounds({ ...bounds, x: 0, y: 0 });
    }

    #onSelection(minosGUI, event, index){
        this.#activator(this.#factories[index]);
    }

    _onDispose() {
    }
}

module.exports = WizardSelector;