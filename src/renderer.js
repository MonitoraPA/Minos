/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const showTopBar = () => {
	const topBar = document.getElementsByClassName('top-bar')[0];
	const main = document.getElementsByClassName('main')[0];
	topBar.classList.remove('hidden');
	main.classList.add('hidden');
};

window.addEventListener('DOMContentLoaded', () => {
	const verifyButton = document.getElementById('verify-button');
	verifyButton.addEventListener('click', () => {
		window.electronAPI.verify(); // this will resize the localView and the webView
		showTopBar();
	});
	const urlBox = document.getElementById('url-box');
	const startButton = document.getElementById('start-button');
	startButton.addEventListener('click', () => {
		const URL = urlBox.value;
		window.electronAPI.start(URL);
	});
});
