/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

import { strings } from './commons/strings.js';
import { enable, disable, isLetter, isDigit, disableInput, hideComponent, showComponent, getElementsByIds } from './commons/util.js';
import { setupText } from './commons/setuptext.js';

let idcard = false;
let signature = false;

const setupInfoboxes = () => {
	const dataControllerInfobox = {'infobox': document.getElementById('form-data-controller-infobox'), 'badge': document.getElementById('form-data-controller-infobadge') };
	const dataResponsibleInfobox = {'infobox': document.getElementById('form-data-responsible-infobox'), 'badge': document.getElementById('form-data-responsible-infobadge') };
	[dataControllerInfobox, dataResponsibleInfobox].forEach(d => {
		d.badge.addEventListener('mouseenter', (event) => {
			showComponent(d.infobox);
		});
		d.badge.addEventListener('mouseleave', (event) => {
			hideComponent(d.infobox);
		});
	});
};

const setupTooltips = () => {
	for(const button of document.getElementsByTagName('button')){
		const ttext = button.getAttribute('tooltip');
		if(ttext){
			// add tooltip to DOM
			const tooltip = document.createElement('div');
			hideComponent(tooltip);
			tooltip.classList.add('tooltip');
			document.getElementsByTagName('body')[0].appendChild(tooltip);
			// setup event listeners
			button.addEventListener('mouseenter', (event) => {
				if(button.classList.contains('disabled') && tooltip.classList.contains('hidden')){ // show tooltip only when button is disabled
					const {x, y, width, height} = event.target.getBoundingClientRect();
					tooltip.style.left = `${x - 30}px`;
					tooltip.style.top = `${y + height + 5}px`;
					tooltip.innerText = button.getAttribute('tooltip');
					showComponent(tooltip);
				}
				else
					hideComponent(tooltip);
			});
			button.addEventListener('mouseleave', (event) => {
				hideComponent(tooltip);
			});
			tooltip.addEventListener('mouseenter', (event) => {
				showComponent(tooltip);
			});
			tooltip.addEventListener('mouseleave', (event) => {
				hideComponent(tooltip);
			})
		}
	}
};

const isSpecialKey = (code) => { return ["Tab", "Backspace", "Delete", "ArrowLeft", "ArrowRight"].some(x => x === code); };
const insertKey = (key, target) => {
	const curPos = target.selectionStart;
	target.value = target.value.slice(0, curPos) + key + target.value.slice(curPos);
	target.selectionStart = curPos + 1;
	target.selectionEnd = curPos + 1;
 };

const onDOMContentLoaded = () => {
	setupText();
	setupTooltips();
	setupInfoboxes();
	/* variables */
	let page = 0;
	const [mainButton, topButton, urlBox, textarea, reportButton, reportLabel, nextButton, prevButton] = getElementsByIds(['main-button', 'top-button', 'url-box', 'report', 'report-button', 'report-label',  'button-next', 'button-prev']);
	const [formLabel, formName, formSurname, formBirthdate, formBirthplace, formFisccode, formAddress] = getElementsByIds(['form-label', 'form-name', 'form-surname', 'form-birthdate', 'form-birthplace', 'form-fisccode', 'form-address']);
	const [formPhone, formPaddr, formEmail, formFax] = getElementsByIds(['form-phone', 'form-paddr', 'form-email', 'form-fax']);
	const [checkPhone, checkPaddr, checkEmail, checkFax] = getElementsByIds(['check-phone', 'check-paddr', 'check-email', 'check-fax']);
	const [radioSign1, radioSign2] = getElementsByIds(['radio-sign-1', 'radio-sign-2']);
	const [signContainer, signatureUploadButton, idCardUploadButton] = getElementsByIds(['sign-button-container', 'sign-button', 'idphoto-button']);
	const [checkDecl1, checkDecl2, checkDecl3] = getElementsByIds(['check-decl-1', 'check-decl-2', 'check-decl-3'])
	const [dataController, dataResponsible] = getElementsByIds(['form-data-controller', 'form-data-responsible']);
	const pageValid = [false, false, false, false];

	/* functions */
	const onClickStart = (event) => {
		// run only the 1st time
		const URL = urlBox.value;
		showComponent(document.getElementById('spinner'));
		if(URL.length !== 0){
			window.electronAPI.start(URL);
			const button = event.target;
			button.innerText = strings.components.topBar.button.analyze;
			disableInput(urlBox);
			// clicked for the 2nd time (analyze)
			button.addEventListener('click', () => {
				window.electronAPI.analyze();
				hideComponent(document.getElementById('spinner'));
			}, { once: true });
			button.removeEventListener('click', onClickStart);
		}
	};

	// return err, which is used to determine whether a given
	// page is valid or not and possibly it is displayed as tooltip
	// above the nextButton
	const validateForm = () => {
		let err = undefined;
		switch(page){
			case 0:
				// first remove invalid from all form elements
				[formName, formSurname, formBirthdate, formBirthplace, formFisccode, formAddress].forEach(target => target.classList.remove('invalid'));
				// then possibly re-add invalid and display error tooltip above next button
				if(formAddress.value.length === 0){
					formAddress.classList.add('invalid');
					err = strings.err.emptyField;
				}
				if(!formFisccode.value.match(/[A-Z]{3}[A-Z]{3}[0-9]{2}[ABCDEHLMPRST]((0[1-9]|[1-2][0-9]|3[0-1])|([4-6][1-9]|7[0-1]))[A-Z][0-9]{3}[A-Z]/g)){
					formFisccode.classList.add('invalid');
					err = strings.err.invalidFiscCode;
				}
				if(formBirthplace.value.length === 0){
					formBirthplace.classList.add('invalid');
					err = strings.err.emptyField;
				}
				if(!formBirthdate.value.match(/((0[1-9]|1[0-9]|2[0-9]|30)\/(04|06|09|11)\/([1-2][0-9]{3}))|((0[1-9]|1[0-9]|2[0-9])\/02\/([1-2][0-9]{3}))|((0[1-9]|1[0-9]|2[0-9]|3[0-1])\/(01|03|05|07|08|10|12)\/([1-2][0-9]{3}))/g)){
					formBirthdate.classList.add('invalid');
					err = strings.err.invalidBirthDate;
				}
				if(formSurname.value.length === 0){
					formSurname.classList.add('invalid');
					err = strings.err.emptyField;
				}
				if(formName.value.length === 0){
					formName.classList.add('invalid');
					err = strings.err.emptyField;
				}
				return err;
			case 1:
				// if none checked
				if([checkPhone, checkPaddr, checkEmail, checkFax].every(checkbox => !checkbox.checked))
					return strings.err.missingContact;
				if(checkFax.checked && !formFax.value.match(/^\d{9,10}$/g)){
					formFax.classList.add('invalid');
					err = strings.err.invalidFax;
				} else {
					formFax.classList.remove('invalid');
				}
				if(checkEmail.checked && !formEmail.value.match(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)){
					formEmail.classList.add('invalid');
					err = strings.err.invalidEmail;
				} else {
					formEmail.classList.remove('invalid');
				}
				if(checkPaddr.checked && formPaddr.value.length === 0){
					formPaddr.classList.add('invalid');
					err = strings.err.emptyField;
				} else {
					formPaddr.classList.remove('invalid');
				}
				if(checkPhone.checked && !formPhone.value.match(/^\d{9,10}$/g)){
					formPhone.classList.add('invalid');
					err = strings.err.invalidPhone;
				} else {
					formPhone.classList.remove('invalid');
				}
				return err;
			case 2:
				if([checkDecl1, checkDecl2, checkDecl3].every(checkbox => !checkbox.checked))
					return strings.err.missingOption;
				if(dataController.value.length === 0){
					dataController.classList.add('invalid');
					return strings.err.missingDataController;
				} else {
					dataController.classList.remove('invalid');
				}
				return err;
			case 3:
				const [radio1, radio2] = getElementsByIds(['radio-sign-1', 'radio-sign-2']);
				if(radio1.checked){
					if(!idcard)
						err = strings.err.missingIDCard;
					if(!signature)
						err = strings.err.missingSignature;
				} else if(radio2.checked){
					if(!idcard)
						err = strings.err.missingIDCard;
				}
				return err;
			default:
				return err;
		}
	};

	const formHandler = () => {
		const err = validateForm();
		if(err){
			pageValid[page] = false;
			disable(nextButton);
			nextButton.setAttribute('tooltip', err);
		} else {
			pageValid[page] = true;
			enable(nextButton);
		}
	};

	/* event listeners */
	mainButton.addEventListener('click', () => {
		hideComponent(document.getElementById('main'));
		showComponent(document.getElementById('top-bar'));
	});

	urlBox.addEventListener('input', (event) => {
		if(event.target.value.length === 0)
			disable(topButton);
		else
			enable(topButton);
	});

	topButton.addEventListener('click', onClickStart);

	radioSign1.addEventListener('change', (event) => {
		if(event.target.checked){
			radioSign2.checked = false;
			showComponent(signContainer);
		}
	});
	radioSign2.addEventListener('change', (event) => {
		if(event.target.checked){
			radioSign1.checked = false;
			hideComponent(signContainer);
		}
	})

	document.getElementById('form-data-controller').addEventListener('input', formHandler);

	getElementsByIds(['check-decl-1', 'check-decl-2', 'check-decl-3'])
    	.forEach((checkbox) => { checkbox.addEventListener('change', formHandler); });

	// add event listeners to checkboxes
	['phone', 'paddr', 'email', 'fax'].forEach((field) => {
		const checkBox = document.getElementById(`check-${field}`);
		const container = document.getElementById(`${field}-container`);
		checkBox.addEventListener('change', (event) => {
			if(event.target.checked){
				showComponent(container);
			} else {
				hideComponent(container);
			}
			formHandler();
		});
	});

	// event listener for fax and phone number
	const numberEventListener = (event) => {
		if(!isSpecialKey(event.code)){
			event.preventDefault();
			// insert only numbers
			if(event.target.value.length < 10 && isDigit(event.key))
				insertKey(event.key, event.target);
		}
		formHandler();
	};

	formPhone.addEventListener('keydown', numberEventListener);
	formPaddr.addEventListener('input', formHandler);
	formEmail.addEventListener('input', formHandler);
	formFax.addEventListener('keydown', numberEventListener);

	formName.addEventListener('input', formHandler);
	formSurname.addEventListener('input', formHandler);
	formFisccode.addEventListener('input', formHandler);
	formBirthplace.addEventListener('input', formHandler);
	formAddress.addEventListener('input', formHandler);
	formBirthdate.addEventListener('input', formHandler);
	formFisccode.addEventListener('keydown', (event) => {
		// insert only uppercase letters
		if(!isSpecialKey(event.code)){
			event.preventDefault();
			if(event.target.value.length < 16 && (isLetter(event.key) || isDigit(event.key)))
				insertKey(event.key.toUpperCase(), event.target);
		}
		formHandler();
	});

	formBirthdate.addEventListener('keydown', (event) => {
		const addSlashes = (date) => {
			if(date.length >= 4)
				return date.slice(0, 2) + "/" + date.slice(2, 4) + "/" + date.slice(4);
			else if(date.length >= 2)
				return date.slice(0, 2) + "/" + date.slice(2);
			else
				return date;
		};
		const curText = event.target.value;
		const textPos = event.target.selectionStart;
		// remove slashes
		const curDate = curText.replaceAll('/', '');
		const datePos = textPos >= 6 ? textPos - 2 : (textPos >= 3 ? textPos - 1 : textPos);
		// if there's a backspace delete backspace + number
		if(event.code === "Backspace"){
			event.preventDefault();
			const newDate = curDate.slice(0, datePos - 1) + curDate.slice(datePos);
			event.target.value = addSlashes(newDate);
			const nextPos = [3,6].some(x => x === textPos) ? textPos - 2 : textPos - 1;
			event.target.selectionStart = nextPos;
			event.target.selectionEnd = nextPos;
		} else if(!isSpecialKey(event.code)){
			event.preventDefault();
			// only allow numbers
			if(Array.from(Array(10).keys()).map(x => String(x)).some(x => x === event.key) && curDate.length < 8){
				// compute new date
				const newDate = curDate.slice(0, datePos) + event.key + curDate.slice(datePos);
				event.target.value = addSlashes(newDate);
				const nextPos = [1,2,4,5].some(x => x === textPos) ? textPos + 2 : textPos + 1;
				event.target.selectionStart = nextPos;
				event.target.selectionEnd = nextPos;
			}
		}
		formHandler();
	});

	const collectFormData = () => {
		const data = {
			name: formName.value,
			surname: formSurname.value,
			birthplace: formBirthplace.value,
			birthdate: formBirthdate.value,
			address: formAddress.value,
			fisccode: formFisccode.value,
			delivery: [[formPhone, checkPhone], [formEmail, checkEmail], [formPaddr, checkPaddr], [formFax, checkFax]]
				.filter(a => a[1].checked)
				.map(a => a[0].getAttribute('placeholder') + ': ' + a[0].value)
				.join(', '),
			declarations: [checkDecl1, checkDecl2, checkDecl3].map((cb, index) => {
				if(cb.checked) // de-capitalize first character
					return strings.components.form.fields.declarations[index].substring(0, 1).toLowerCase() + strings.components.form.fields.declarations[index].substring(1);
				else
					return undefined
			}).filter(decl => decl !== undefined),
			data_controller: dataController.value,
			data_responsible: dataResponsible.value.length === 0 ? strings.components.form.fields.data_responsible.missing : dataResponsible.value,
			signature: radioSign1.checked ? true : false
		} // the other data will be added from index.js
		return data;
	}

	nextButton.addEventListener('mouseenter', formHandler);

	nextButton.addEventListener('click', (event) => {
		if(event.target.classList.contains('disabled'))
			return;
		if(pageValid[page + 1])
			enable(nextButton);
		else
			disable(nextButton);
		switch(page){
			case 0:
				hideComponent(document.getElementById('form-fields-1'));
				showComponent(document.getElementById('form-fields-2'));
				showComponent(prevButton);
				enable(prevButton);
				formLabel.innerText = strings.components.form.pages[1];
				nextButton.setAttribute('tooltip', strings.err.missingContact);
				page++;
				break;
			case 1:
				hideComponent(document.getElementById('form-fields-2'));
				showComponent(document.getElementById('form-fields-3'));
				showComponent(prevButton);
				enable(prevButton);
				formLabel.innerText = strings.components.form.pages[2];
				nextButton.setAttribute('tooltip', strings.err.missingOption);
				page++;
				break;
			case 2:
				hideComponent(document.getElementById('form-fields-3'));
				showComponent(document.getElementById('form-fields-4'));
				showComponent(prevButton);
				enable(prevButton);
				formLabel.innerText = strings.components.form.pages[3];
				nextButton.setAttribute('tooltip', strings.err.missingData);
				nextButton.innerText = strings.components.form.buttons.submit;
				page++;
				break;
			case 3: // next button is submit now
				formHandler(); // check form validity
				window.electronAPI.submitForm(collectFormData());
				break;
		}
	});

	prevButton.addEventListener('click', (event) => {
		if(event.target.classList.contains('disabled'))
			return;
		if(pageValid[page - 1])
			enable(nextButton);
		else
			disable(nextButton);
		if(page === 1)
			hideComponent(prevButton);
		hideComponent(document.getElementById(`form-fields-${page + 1}`));
		showComponent(document.getElementById(`form-fields-${page}`));
		formLabel.innerText = strings.components.form.pages[page - 1];
		if(page === 3)
			nextButton.innerText = strings.components.form.buttons.next;
		page--;
	});

	idCardUploadButton.addEventListener('click', () => {
		window.electronAPI.loadIDCard();
	});

	signatureUploadButton.addEventListener('click', () => {
		window.electronAPI.loadSignature();
	});

	// on page navigation, update the URL in the urlBox
	window.electronAPI.onChangeURL((event, url) => {
		// hide spinner
		hideComponent(document.getElementById('spinner'));
		urlBox.value = url;
	});

	window.electronAPI.onBadRequests((event, data) => {
		hideComponent(document.getElementById('top-bar'));
		showComponent(document.getElementById('report-container'));
		if(data.logfile)
			reportLabel.innerText += " " + data.logfile + ". ";
		else // if logfile is not present it means the log has not been saved
			reportLabel.innerText = strings.components.report.labelNoFile;
		if(data.requests.length > 0){
			reportLabel.innerText += `\r\n${strings.components.report.badHostsDetected}`
			textarea.value = data.requests
				.map(req => req.host.group + ": " + req.host.name) // transform into string
				.filter((val, idx, arr) => arr.indexOf(val) === idx) // remove duplicates
				.reduce((a, b) => a + b + "\r\n", ""); // add cr and newline
			reportButton.addEventListener('click', () => {
				hideComponent(document.getElementById('report-container'));
				showComponent(document.getElementById('form-container'))
			});
		} else {
			reportLabel.innerText += `\r\n${strings.components.report.noBadHostsDetected}`
			hideComponent(textarea);
			hideComponent(reportButton);
		}
	});

	window.electronAPI.onIDCardUpload((event, path) => {
		document.getElementById('idphoto-label').innerText = path;
		idcard = true;
		formHandler();
	});

	window.electronAPI.onSignatureUpload((event, path) => {
		document.getElementById('sign-label').innerText = path;
		signature = true;
		formHandler();
	});

	window.electronAPI.onClaimOutput((event, claimOutput) => {
		hideComponent(document.getElementById('form-container'));
		showComponent(document.getElementById('message-container'));
		const message = document.getElementById('message');
		if(claimOutput.error){
			message.innerText = strings.message.claimOutputFail.replace("%filename%", claimOutput.docpath);
		} else {
			message.innerText = strings.message.claimOutputSuccess.replace("%filename%", claimOutput.docpath);
		}
	});

	window.electronAPI.onNavigationFail((event, errorCode, errorDescription) => {
		const mainDivs = getElementsByIds(['top-bar', 'main', 'report-container', 'form-container', 'spinner']);
		mainDivs.forEach(d => { hideComponent(d); });
		showComponent(document.getElementById('message-container'));
		const message = document.getElementById('message');
		message.innerText = strings.message.navigationFail.replace('%errcode%', errorCode).replace('%errdesc%', errorDescription);
	});
};

window.addEventListener('DOMContentLoaded', onDOMContentLoaded);
