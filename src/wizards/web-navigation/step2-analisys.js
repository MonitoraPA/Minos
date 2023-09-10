/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const strings = require('../../commons/strings');
const AbstractWizardStep = require("../abstract-wizard-step");
const convertCDPtoHAR = require("../../commons/convert-cdp-to-har");
const { writeFile } = require('fs');

class WebNavigationAnalysis extends AbstractWizardStep{
	constructor(wizard){
		super(wizard);
		this.name = "Loading...";
	}

	alreadyCompleted() {
        return !!this.wizard.get('complainRequested');
    }

	setup(minosGUI){
		const siteView = minosGUI.getView('site');
		siteView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
		this.setViewsSize(minosGUI);

		minosGUI.showTemplate('main', 'src/wizards/web-navigation/step2-analysis.html')
			.then(() => {
				this.wizard.set('strings', () => strings.components.report);
			});

		this._whileActive(minosGUI.when('main', 'web-navigation/save-har', this.#downloadHAR.bind(this)));
		this._whileActive(minosGUI.when('main', 'web-navigation/start-complaint', this.#startComplaint.bind(this)));
	}

	setViewsSize(minosGUI){
		const bounds = minosGUI.getBounds();
		const mainView = minosGUI.getView('main');
		mainView.setBounds({...bounds, x: 0, y: 0});
	}

	#startComplaint(minosGUI){
		this.wizard.set('complainRequested', _ => true);
	}

	#downloadHAR(minosGUI){
		const har = convertCDPtoHAR(minosGUI.packageInfos, this.wizard.navigationLogs);
		const timestamp = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
		const initialURL = new URL(this.wizard.get('url').initial);
		const log_file_path = minosGUI.config.logFilePrefix + '_' + initialURL.hostname + "_" + timestamp + ".har";
		minosGUI.dialog.showSaveDialog({
			properties: ['showOverwriteConfirmation', 'createDirectory'],
			title: "Salva il log della navigazione",
			defaultPath: log_file_path,
			buttonLabel: 'Salva',
			filters: [ { name: 'HAR files', extensions: ['har'] } ]
		}).then((response) => {
			if(!response.canceled){
				try {
					writeFile(response.filePath, JSON.stringify(har, null, 4), (err) => {
						if(err)
							console.error(`error: writing log file failed due to`, err);
						});
					this.wizard.set('log', _ => ({file: response.filePath}));
				} catch(err){
					console.error(`error: something bad happened while saving log file.`, err);
				}
			}
		});
	}

	_onDispose(){
		/* nothing to do */
	}
}

module.exports = WebNavigationAnalysis;