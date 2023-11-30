/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const strings = require('../../commons/strings');
const CDPCollector = require("../../commons/cdp-collector");
const AbstractWizardStep = require("../abstract-wizard-step");
const analyzeCDPLogs = require('../../commons/analyze-cdp-logs');

class WebRecording extends AbstractWizardStep{
	#collector;
	constructor(wizard){
		super(wizard);
		this.#collector = new CDPCollector();
		this.name = "WebRecording";
	}

	alreadyCompleted() {
        return !!this.wizard.navigationLogs;
    }

    setup(minosGUI){
		const siteView = minosGUI.getView('site');
		this._whileActive(this.#collector.attach(siteView));

		const onNavigation = this.#onNavigation.bind(this, minosGUI);
        siteView.webContents.on('did-navigate', onNavigation);
        siteView.webContents.on('did-navigate-in-page', onNavigation);
		this._onDeactivation(() => {
			try{
				siteView.webContents.removeListener('did-navigate', onNavigation);
				siteView.webContents.removeListener('did-navigate-in-page', onNavigation);
			} catch (e) {
				if(!this.alreadyCompleted()){
					console.warn("Error during WebRecordin disposition", e);
				}
			}
		});

        this._whileActive(minosGUI.when('main', 'web-navigation/start', this.#startNavigation.bind(this)));
		this._whileActive(minosGUI.when('main', 'web-navigation/analyze', this.#analyze.bind(this)));

		minosGUI.showTemplate('main', 'src/wizards/web-navigation/step1-web-recording.html')
			//.then(() => minosGUI.getView('main').webContents.openDevTools({ mode: 'detach' }))
			.then(() => {
				this.setViewsSize(minosGUI);
				this.wizard.set('strings', () => strings.components.topBar);
			});
    }

	#onNavigation(minosGUI, event, url, httpResponseCode, httpStatusText){
		if(!url.startsWith('about:')){
			this.wizard.set('url', state => {
				const old = state.get('url');
				return {...old, current: url};
			});
		}
    }

    #startNavigation(minosGUI, event, url){
		if(url.startsWith('about:')){
			/* nothing to do */
			return;
		}
        if(!url.startsWith('https://') && !url.startsWith('http://')){
			url = 'https://' + url;
		}
		this.wizard.set('url', _ => ({initial: url, current: url}));
		this.wizard.set('loading', _ => true);
		this.setViewsSize(minosGUI);

		const siteView = minosGUI.getView('site');
		siteView.webContents.loadURL(url)
			.then(() => {
				this.wizard.set('loading', _ => false);
				this.setViewsSize(minosGUI);
			});
    }

	#analyze(minosGUI, event){
		this.wizard.set('loading', _ => true);
		this.setViewsSize(minosGUI);
		minosGUI.getView('site').webContents.loadURL('about:blank')
			.then(() => {
				setTimeout(() => {
					/* wait one more second for the debugger to notify all events */
					const collectedEvents = this.#collector.getCollectedEvents();
					this.wizard.saveNavigationLogs(collectedEvents);
					const issues = analyzeCDPLogs(collectedEvents, this.wizard.get('url').current);

					this.wizard.set('issues', _ => issues);
					this.wizard.set('loading', _ => false);
					this.setViewsSize(minosGUI);
				}, 5000);
			});
	}

	setViewsSize(minosGUI){
		const bounds = minosGUI.getBounds();
		const siteView = minosGUI.getView('site');
		const addressView = minosGUI.getView('main');
		if(this.alreadyCompleted()){
			/* nothing to do */
		} else if(this.wizard.get('loading')){
			addressView.setBounds({...bounds, x: 0, y: 0});
			siteView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
		} else {
			addressView.setBounds({ x: 0, y: 0, width: bounds.width, height: 50 });
			siteView.setBounds({ x: 0, y: 50, width: bounds.width, height: bounds.height - 50 });
		}
	}

    _onDispose() {

    }
}

module.exports = WebRecording;