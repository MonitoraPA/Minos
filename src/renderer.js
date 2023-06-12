/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 


const disableInput = (input) => {
	input.classList.remove('enabled');
	input.classList.add('disabled');
	input.disabled = true;
};

const enableInput = (input) => {
	input.classList.add('enabled');
	input.classList.remove('disabled');
	input.disabled = false;
}

const hideComponent = (component) => {
	component.classList.add('hidden');
};

const showComponent = (component) => {
	component.classList.remove('hidden');
};

// convenience function to get more elements at once
const getElementsByIds = (names) => {
	result = [];
	for(const n of names){
		result.push(document.getElementById(n));
	}
	return result;
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
		}
	}
};

const onDOMContentLoaded = () => {
	setupTooltips();
	const [verifyButton, topButton, urlBox, textarea, reportButton, reportLabel, nextButton, prevButton] = getElementsByIds(['verify-button', 'top-button', 'url-box', 'report', 'report-button', 'report-label',  'button-next', 'button-prev']);
	const [formName, formSurname, formBirthdate, formBirthplace, formFisccode, formAddress] = getElementsByIds(['form-name', 'form-surname', 'form-birthdate', 'form-birthplace', 'form-fisccode', 'form-address']);
	// const verifyButton = document.getElementById('verify-button');
	verifyButton.addEventListener('click', () => {
		hideComponent(document.getElementById('main'));
		showComponent(document.getElementById('top-bar'));
	});
	urlBox.addEventListener('input', (event) => {
		if(event.target.value.length === 0)
			topButton.classList.add('disabled');
		else 
			topButton.classList.remove('disabled');
	});
	const onClickStart = (event) => {
		// run only the 1st time
		const URL = urlBox.value; 
		if(URL.length !== 0){
			window.electronAPI.start(URL);
			const topButton = event.target;
			topButton.innerText = "Analizza"; // TODO: move labels into config file
			disableInput(urlBox);
			// clicked for the 2nd time (analyze)
			topButton.addEventListener('click', () => {
				window.electronAPI.analyze();
			}, { once: true });
			topButton.removeEventListener('click', onClickStart);
		}
	};
	topButton.addEventListener('click', onClickStart); 

	const validateForm = () => {
		const showTooltip = (err) => { nextButton.classList.add('disabled'); nextButton.setAttribute('tooltip', err); }
		const hideTooltip = () => { nextButton.classList.remove('disabled'); }
		// first remove invalid from all form elements
		[formName, formSurname, formBirthdate, formBirthplace, formFisccode, formAddress].forEach(target => target.classList.remove('invalid'));
		// then possibly re-add invalid and display error tooltip above next button
		let err = "";
		if(formAddress.value.length === 0){
			formAddress.classList.add('invalid');
			err = "Riempi tutti i campi prima di procedere";
		}
		if(!formFisccode.value.match(/[A-Z]{3}[A-Z]{3}[0-9]{2}[ABCDEHLMPRST]((0[1-9]|[1-2][0-9]|3[0-1])|([4-6][1-9]|7[0-1]))[A-Z][0-9]{3}[A-Z]/g)){
			formFisccode.classList.add('invalid');
			err = "Inserisci un codice fiscale valido";
		}
		if(formBirthplace.value.length === 0){
			formBirthplace.classList.add('invalid');
			err = "Riempi tutti i campi prima di procedere";
		}
		if(!formBirthdate.value.match(/((0[1-9]|1[0-9]|2[0-9]|30)\/(04|06|09|11)\/([1-2][0-9]{3}))|((0[1-9]|1[0-9]|2[0-9])\/02\/([1-2][0-9]{3}))|((0[1-9]|1[0-9]|2[0-9]|3[0-1])\/(01|03|05|07|08|10|12)\/([1-2][0-9]{3}))/g)){
			formBirthdate.classList.add('invalid');
			err = "Inserisci una data di nascita valida";
		}
		if(formSurname.value.length === 0){
			formSurname.classList.add('invalid');
			err = "Riempi tutti i campi prima di procedere";
		}
		if(formName.value.length === 0){
			formName.classList.add('invalid');
			err = "Riempi tutti i campi prima di procedere";
		}
		if(err.length === 0)
			hideTooltip();
		else 
			showTooltip(err);
	};

	formName.addEventListener('blur', validateForm);
	formSurname.addEventListener('blur', validateForm);
	formFisccode.addEventListener('blur', validateForm);
	formBirthplace.addEventListener('blur', validateForm);
	formAddress.addEventListener('blur', validateForm);
	formBirthdate.addEventListener('blur', validateForm);
	formBirthdate.addEventListener('keydown', (event) => {
		event.preventDefault();
		const current = event.target.value;
		if(event.keyCode === 8){
			if([0,1,4,7,8,9,10].some(x => x === current.length))
				event.target.value = current.slice(0, -1);
			else if([3,6].some(x => x === current.length))
				event.target.value = current.slice(0, -2);
		}
		if([0,1,2,3,4,5,6,7,8,9].some(x => x == event.key) && current.length < 10){
			// simply insert letter
			if([0,3,6,7,8,9].some(x => x === current.length))
				event.target.value = current + event.key;
			// insert letter and slash
			else if([1,4].some(x => x === current.length))
				event.target.value = current + event.key + "/";
		}
	});

	nextButton.addEventListener('mouseenter', validateForm);

	// on page navigation, update the URL in the urlBox
	window.electronAPI.onChangeURL((event, url) => {
		urlBox.value = url;
	});
	window.electronAPI.onBadRequests((event, data) => {
		hideComponent(document.getElementById('top-bar'));
		showComponent(document.getElementById('report-container'));
		reportLabel.innerText += " " + data.logfile + ". ";
		if(data.requests.length > 0){
			reportLabel.innerText += "\r\nDurante la navigazione sono stati individuati trasferimenti illeciti verso questi hosts:"
			textarea.value = data.requests
				.map(d => d.hosts.source + ": " + d.hosts.values.map(v => String(v)).join()) // transform into string
				.filter((val, idx, arr) => arr.indexOf(val) === idx) // remove duplicates
				.reduce((a, b) => a + b + "\r\n", ""); // add cr and newline
			reportButton.addEventListener('click', () => {
				hideComponent(document.getElementById('report-container'));
				showComponent(document.getElementById('form-container'))
			});
		} else {
			reportLabel.innerText += "\r\nNon sono stati individuati trasferimenti illeciti durante la navigazione."
			hideComponent(textarea);
			hideComponent(reportButton);
		}
	});
};

window.addEventListener('DOMContentLoaded', onDOMContentLoaded);
