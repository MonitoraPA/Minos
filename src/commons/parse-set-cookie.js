/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */
"use strict";

function parseSetCookie(headerValue){
	const elements = headerValue.split(';').map(x => x.trim())
	const nameAndValue = elements.shift().split('=');
	const name = nameAndValue.shift();
	const value = "" + nameAndValue.join('=');

	const result = {};
	for(const kvp of elements.map(x => x.split('='))){
		let key = kvp.shift();
		switch(key){
			case "httponly":
				key = "httpOnly";
				break;
			case "samesite":
				key = "sameSite";
				break;
		}
		result[key] = kvp.length > 0 ? kvp.join('=') : true;
	}
	result["name"] = name;
	result["value"] = value;
	if(result["expires"]){
		result["expires"] = new Date(result["expires"]).toISOString()
	}
	if(!result["httpOnly"]){
		result["httpOnly"] = false;
	}

	return result;
}
module.exports = parseSetCookie;