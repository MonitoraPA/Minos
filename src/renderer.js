/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const createTooltip = (text) => {
	const tooltip = document.createElement('div');
	tooltip.classList.add('tooltip');
	tooltip.innerText = text;
	return tooltip;
};

const disableInput = (input) => {
	input.classList.remove('enabled');
	input.classList.add('disabled');
	input.disabled = true;
};

const showTopBar = () => {
	const topBar = document.getElementById('top-bar');
	const main = document.getElementById('main');
	topBar.classList.remove('hidden');
	main.classList.add('hidden');
};

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
}

const report = [];

const onDOMContentLoaded = () => {
	const [verifyButton, topButton, topTooltip, urlBox, textarea, claimButton] = getElementsByIds(['verify-button', 'top-button', 'top-tooltip', 'url-box', 'report', 'claim-button']);
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
	topButton.addEventListener('mouseenter', () => {
		if(urlBox.value.length <= 0)
			showComponent(topTooltip);
		else 
			hideComponent(topTooltip);
	});
	topButton.addEventListener('mouseleave', () => {
		hideComponent(topTooltip);
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
	// on page navigation, update the URL in the urlBox
	window.electronAPI.onChangeURL((event, url) => {
		urlBox.value = url;
	});
	window.electronAPI.onBadRequests((event, data) => {
		hideComponent(document.getElementById('top-bar'));
		showComponent(document.getElementById('report-container'));
		textarea.value = data
			.map(d => d.hosts.source + ": " + d.hosts.host)
			.filter((val, idx, arr) => arr.indexOf(val) === idx) // remove duplicates
			.reduce((a, b) => a + b + "\r\n", "");
	});
	claimButton.addEventListener('click', () => {
		hideComponent(document.getElementById('report-container'));
		showComponent(document.getElementById('form-container'))
	});
};

window.addEventListener('DOMContentLoaded', onDOMContentLoaded);
