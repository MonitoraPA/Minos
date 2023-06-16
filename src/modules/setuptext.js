/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

import { strings } from './strings.js';

export const setupText = () => {
	// setup text within the whole page
	document.getElementById('url-box').setAttribute('placeholder', strings.components.topBar.urlBox);

	const topButton = document.getElementById('top-button');
	topButton.setAttribute('tooltip', strings.components.topBar.button.tooltip);
	topButton.innerText = strings.components.topBar.button.start;

	document.getElementById('main-title').innerText = strings.components.main.title;
	document.getElementById('main-button').innerText = strings.components.main.button;

	document.getElementById('report-label').innerText = strings.components.report.label;
	document.getElementById('report-button').innerText = strings.components.report.button;

	document.getElementById('form-title').innerText = strings.components.form.title;
	document.getElementById('form-label').innerText = strings.components.form.pages[0];

	document.getElementById('form-name-label').innerText = strings.components.form.fields.name.label;
	document.getElementById('form-surname-label').innerText = strings.components.form.fields.surname.label;
	document.getElementById('form-birthdate-label').innerText = strings.components.form.fields.birthdate.label;
	document.getElementById('form-birthplace-label').innerText = strings.components.form.fields.birthplace.label;
	document.getElementById('form-fisccode-label').innerText = strings.components.form.fields.fisccode.label;
	document.getElementById('form-address-label').innerText = strings.components.form.fields.address.label;

	document.getElementById('form-name').setAttribute('placeholder', strings.components.form.fields.name.placeholder);
	document.getElementById('form-surname').setAttribute('placeholder', strings.components.form.fields.surname.placeholder);
	document.getElementById('form-birthdate').setAttribute('placeholder', strings.components.form.fields.birthdate.placeholder);
	document.getElementById('form-birthplace').setAttribute('placeholder', strings.components.form.fields.birthplace.placeholder);
	document.getElementById('form-fisccode').setAttribute('placeholder', strings.components.form.fields.fisccode.placeholder);
	document.getElementById('form-address').setAttribute('placeholder', strings.components.form.fields.address.placeholder);

	document.getElementById('check-phone-label').innerText = strings.components.form.fields.phone.label;
	document.getElementById('check-paddr-label').innerText = strings.components.form.fields.paddr.label;
	document.getElementById('check-email-label').innerText = strings.components.form.fields.email.label;
	document.getElementById('check-fax-label').innerText = strings.components.form.fields.fax.label;

	document.getElementById('form-phone-label').innerText = strings.components.form.fields.phone.label;
	document.getElementById('form-paddr-label').innerText = strings.components.form.fields.paddr.label;
	document.getElementById('form-email-label').innerText = strings.components.form.fields.email.label;
	document.getElementById('form-fax-label').innerText = strings.components.form.fields.fax.label;

	document.getElementById('form-phone').setAttribute('placeholder', strings.components.form.fields.phone.placeholder);
	document.getElementById('form-paddr').setAttribute('placeholder', strings.components.form.fields.paddr.placeholder);
	document.getElementById('form-email').setAttribute('placeholder', strings.components.form.fields.email.placeholder);
	document.getElementById('form-fax').setAttribute('placeholder', strings.components.form.fields.fax.placeholder);

	document.getElementById('button-next').innerText = strings.components.form.buttons.next;
	document.getElementById('button-prev').innerText = strings.components.form.buttons.prev;
};