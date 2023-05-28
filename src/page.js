/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

/**
 * Portions of this file are Copyright (C) 2020 Andrea Cardaci <cyrus.and@gmail.com>
 * (see licenses/MIT.txt)
 */

function Page(url){
	this._responseBodyCounter = 0;
	this.url = url;
	this.firstRequestId = undefined;
	this.firstRequestMs = undefined;
	this.domContentEventFiredMs = undefined;
	this.loadEventFiredMs = undefined;
	this.entries = new Map();
}
