/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

window.addEventListener('DOMContentLoaded', () => {
	const topBar = document.getElementsByClassName('top-bar')[0];
	const verifyButton = document.getElementById('verify-button');
	verifyButton.addEventListener('click', () => {
		window.electronAPI.verify();
	});
});
