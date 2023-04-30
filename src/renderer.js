/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const onDOMContentLoaded = () => {

};

const disableInput = (input) => {
	input.classList.remove('enabled');
	input.classList.add('disabled');
	input.disabled = true;
};

const showTopBar = () => {
	const topBar = document.getElementsByClassName('top-bar')[0];
	const main = document.getElementsByClassName('main')[0];
	topBar.classList.remove('hidden');
	main.classList.add('hidden');
};

const report = [];

window.addEventListener('DOMContentLoaded', () => {
	const verifyButton = document.getElementById('verify-button');
	verifyButton.addEventListener('click', () => {
		window.electronAPI.verify(); // this will resize the localView and the webView
		showTopBar();
	});
	const urlBox = document.getElementById('url-box');
	const topButton = document.getElementById('top-button');
	const textarea = document.getElementsByClassName('report')[0];
	let index = 1;
	const onStart = (event) => {
		// run only the 1st time
		const URL = urlBox.value; 
		window.electronAPI.start(URL);
		const topButton = event.target;
		topButton.innerText = "Analizza"; // TODO: move labels into config file
		disableInput(urlBox);
		// clicked for the 2nd time (analyze)
		topButton.addEventListener('click', () => {
			console.log(report);
			window.electronAPI.analyze();
			document.getElementById('report').classList.remove('hidden');
			document.getElementsByClassName('top-bar')[0].classList.add('hidden');
			textarea.innerHTML += report[0];
		}, { once: true });
	};
	topButton.addEventListener('click', onStart, { once: true }); 
	// on page navigation, update the URL in the urlBox
	window.electronAPI.onChangeURL((event, url) => {
		urlBox.value = url;
	});
	const hiddenTextarea = document.getElementById('hidden-textarea');
	window.electronAPI.onReport((event, data) => {
		report.push(data);
	});
	const claimButton = document.getElementById('claim-button');
	claimButton.addEventListener('click', () => {
		const divReport = document.getElementById('report');
		divReport.classList.add('hidden');
		const divForm = document.getElementsByClassName('form')[0];
		divForm.classList.remove('hidden');
	});
	const loadIDCardButton = document.getElementById('idcard');
	loadIDCardButton.addEventListener('click', () => {
		window.electronAPI.loadIDCard();
	});
});
