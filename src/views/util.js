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

const hideComponent = (component) => {
	component.classList.add('hidden');
};

const showComponent = (component) => {
	component.classList.remove('hidden');
};

const enable = (component) => { component.classList.remove('disabled'); }
const disable = (component) => { component.classList.add('disabled'); }

const isUpper = (key) => { return key.charCodeAt(0) >= 'A'.charCodeAt(0) && key.charCodeAt(0) <= 'Z'.charCodeAt(0) };
const isLower = (key) => { return key.charCodeAt(0) >= 'a'.charCodeAt(0) && key.charCodeAt(0) <= 'z'.charCodeAt(0) };
const isLetter = (key) => { return key.length === 1 && (isUpper(key) || isLower(key)) };
const isDigit = (key) => { return key.length === 1 && (key.charCodeAt(0) >= '0'.charCodeAt(0) && key.charCodeAt(0) <= '9'.charCodeAt(0)) };

// convenience function to get more elements at once
const getElementsByIds = (names) => {
	const result = [];
	for(const n of names){
		result.push(document.getElementById(n));
	}
	return result;
};
