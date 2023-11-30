/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const { app, Menu, ipcMain, BrowserWindow, dialog, session } = require("electron");
const WizardSelector = require('../wizards/start/wizard-selector');
const WebNavigationAnalyzer = require('../wizards/web-navigation/web-navigation-analyzer');
const WizardFactory = require('../wizards/wizard-factory');
const packageInfo = require('../../package');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

class MinosGUI {
    #window;
    #currentWizard;
    #home;
    #config;
    #views = {};
    #showingTemplate = {}
    #pendingWindowOpen = [];
    #wizards = [
        new WizardFactory("Navigazione Web", WebNavigationAnalyzer)
    ];
    constructor(config){
        this.#config = config;
        app.userAgentFallback = config.userAgent;
        this.#home = new WizardSelector(this.#wizards, this.#activateWizard.bind(this));
        this.#window = new BrowserWindow({
            backgroundColor: "#EDEDED",
            icon: 'assets/icon.png',
            webPreferences: {
                nodeIntegration: false
            }
        });
        this.#window.webContents.setUserAgent(config.userAgent);

        // disable spellchecker (by default electron will download languages from Google cdn)
        // please see: https://www.electronjs.org/docs/latest/tutorial/spellchecker/#does-the-spellchecker-use-any-google-services
        this.#window.webContents.session.setSpellCheckerLanguages([]);
        this.#window.webContents.session.setSpellCheckerEnabled(false);

        setTimeout(() => {
            this.#home.activate(this);
            this.#currentWizard = this.#home;
        }, 0);
    }

    get packageInfos(){
        return packageInfo;
    }

    get config(){
        return this.#config;
    }

    get dialog(){
        return dialog;
    }

    showTemplate(view, templatePath){
        const targetView = this.getView(view);
        return targetView.webContents.loadFile(templatePath)
            .then(() =>
                targetView.webContents.send('minos/template/loaded', view)
            )
            .then(() =>
                targetView.webContents.executeJavaScript("activateDocument()")
            )
            .then(() => {
                this.#showingTemplate[view] = templatePath;
            })
            .catch(
                e => console.error(e)
            );
    }

    notifyStateChange(newState){
        const sentState = newState.toObject();
        for(const name in this.#showingTemplate){
            //console.log(`MinosGUI.notifyStateChange to ${name}: sending wizardState/changed`, sentState);

            const view = this.#views[name];
            view.webContents.send('wizardState/changed', sentState);
        }
    }

    #activateWizard(factory){
        if(this.#currentWizard){
            console.log('disposing', this.#currentWizard);
            this.#currentWizard.dispose();
        }
        this.#currentWizard = factory.createWizard();
        console.log('activating', this.#currentWizard);
        this.#currentWizard.activate(this);
    }

    getBounds(){
        return this.#window.getContentBounds();
    }

    async openExternal(url){
        const { shell } = require('electron');
        return () => {
            shell.openExternal(url);
        }
    }

    setWizardMenu(menuConfig){
        const controls = this.#wizards.map((w) => ({
            label: w.label,
            click: () => { this.#activateWizard(w); }
        }));

        const template = [
            { role: 'fileMenu' },
            { role: 'editMenu' },
            {
                label: 'Controlli',
                submenu: controls
            },
            ...menuConfig,
            {
                role: 'help',
                submenu: [{
                    label: 'Contatti',
                    click: this.openExternal('https://monitora-pa.it/contatti.html')
                }, {
                    label: 'Sorgenti (GitHub)',
                    click: this.openExternal('https://github.com/MonitoraPA/Minos')
                }, {
                    label: 'Segnalazioni (GitHub)',
                    click: this.openExternal('https://github.com/MonitoraPA/Minos/issues')
                }, {
                    label: 'Licenza',
                    click: this.openExternal('https://monitora-pa.it/LICENSE.txt')
                }]
            }];
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
        return () => this.setWizardMenu([]);
    }

    getView(name){
        const view = this.#views[name];
        if(!view){
            throw new Error(`View "${name}" is not attached.`)
        }
        return view;
    }

    attach(name, view){
        this.#views[name] = view;
        view.name = name;

        const onWebViewWindowCreation = this.#onWebViewWindowCreation.bind(this, view);
		view.webContents.on('did-create-window', onWebViewWindowCreation);

        this.#window.addBrowserView(view);
        return () => {
            view.webContents.removeListener('did-create-window', onWebViewWindowCreation);
            this.#window.removeBrowserView(view);
            if(this.#showingTemplate[name]){
                delete this.#showingTemplate[name];
            }
            delete this.#views[name];
        }
    }

    #onWebViewWindowCreation(view, window, details){
        console.log("onWebViewWindowCreation", details);
        const newViewName = view.name + "/" + window.id;
		window.name = newViewName;
        window.removeMenu();
        window.webContents.session.setSpellCheckerLanguages([]);
        window.webContents.session.setSpellCheckerEnabled(false);
    }

    on(windowEvent, callback){
        const subscription = async (...args) => await callback(this, ...args);
        this.#window.on(windowEvent, subscription);
        return () => this.#window.removeListener(windowEvent, subscription)
    }

    #callbackWithMinos(callback){
        if(callback instanceof AsyncFunction) {
            return async (...args) => {
                //console.log('MinosGUI: (async) ipcMain.on', ipcEvent, args);
                await callback(this, ...args);
            };
        } else {
            return (...args) => {
                //console.log('MinosGUI: ipcMain.on', ipcEvent, args);
                callback(this, ...args);
            };
        }
    }

    when(viewName, ipcEvent, callback){
        if(!this.#views[viewName]){
            throw new Error(`Cannot wait for ${ipcEvent} from ${viewName}: view was not registered.`);
        }
        const subscription = this.#callbackWithMinos(callback);
        ipcMain.on(viewName + ":" + ipcEvent, subscription);
        return () => ipcMain.removeListener(viewName + ":" + ipcEvent, subscription);
    }
}
module.exports = MinosGUI;