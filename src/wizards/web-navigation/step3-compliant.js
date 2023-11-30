/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */
class WebRecording extends AbstractWizardStep{
	constructor(wizard){
		super(wizard);
		this.name = "Log Analysis";
	}

	alreadyCompleted() {
        return false; // TODO fix check
    }

	setup(minosGUI){
		const siteView = minosGUI.getView('site');
		siteView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
		this.setViewsSize(minosGUI);

		minosGUI.showTemplate('main', 'src/wizards/web-navigation/step3-compliant.html')
			.then(() => {
				this.wizard.set('strings', () => strings.components.form);
				this.wizard.set('formPage', () => 0);
			});

		this._whileActive(minosGUI.when('main', 'web-navigation/form-next', this.#nextPage.bind(this)));
		this._whileActive(minosGUI.when('main', 'web-navigation/form-previous', this.#prevPage.bind(this)));
	}

	#nextPage(minosGUI, formValues){

	}

	#prevPage(minosGUI, formValues){

	}
}