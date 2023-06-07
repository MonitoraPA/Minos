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

class Page {

	constructor(){
		this._responseBodyCounter = 0;
		this.firstRequestId = undefined;
		this.firstRequestMs = undefined;
		this.domContentEventFiredMs = undefined;
		this.loadEventFiredMs = undefined;
		this.entries = new Map();
	}

	processEvent(method, params){
		const methodName = `_${method.replace('.', '_')}`;
		if(methodName in Page.prototype){
			const handler = Page.prototype[methodName];
			handler.call(this, params);
		}
	}

	_Network_requestWillBeSent(params){
		const {requestId, initiator, timestamp, redirectResponse} = params;
		// the first is the first request
		if (!this.firstRequestId && initiator.type === 'other') {
			this.firstRequestMs = timestamp * 1000;
			this.firstRequestId = requestId;
		}
		// redirect responses are delivered along the next request
		if (redirectResponse) {
			const redirectEntry = this.entries.get(requestId);
			// craft a synthetic response params
			redirectEntry.responseParams = {
				response: redirectResponse
			};
			// set the redirect response finished when the redirect
			// request *will be sent* (this may be an approximation)
			redirectEntry.responseFinishedS = timestamp;
			redirectEntry.encodedResponseLength = redirectResponse.encodedDataLength;
			// since Chrome uses the same request id for all the
			// redirect requests, it is necessary to disambiguate
			const newId = requestId + '_redirect_' + timestamp;
			// rename the previous metadata entry
			this.entries.set(newId, redirectEntry);
			this.entries.delete(requestId);
		}
		// initialize this entry
		this.entries.set(requestId, {
			requestParams: params,
			responseParams: undefined,
			responseLength: 0, // built incrementally
			encodedResponseLength: undefined,
			responseFinishedS: undefined,
			responseBody: undefined,
			responseBodyIsBase64: undefined,
			newPriority: undefined
		});
	}

	_Network_dataReceived(params) {
			const {requestId, dataLength} = params;
		const entry = this.entries.get(requestId);
		if (!entry) {
		    return;
		}
		entry.responseLength += dataLength;
	}

	_Network_responseReceived(params) {
		const entry = this.entries.get(params.requestId);
		if (!entry) {
			return;
		}
		entry.responseParams = params;
	}

	_Network_resourceChangedPriority(params) {
		const {requestId, newPriority} = params;
		const entry = this.entries.get(requestId);
		if (!entry) {
			return;
		}
		entry.newPriority = newPriority;
	}

	_Network_loadingFinished(params) {
		const {requestId, timestamp, encodedDataLength} = params;
		const entry = this.entries.get(requestId);
		if (!entry) {
			return;
		}
		entry.encodedResponseLength = encodedDataLength;
		entry.responseFinishedS = timestamp;
		// check termination condition
		this._responseBodyCounter++;
	}

	_Network_loadingFailed(params) {
		const {requestId, errorText, canceled, timestamp} = params;
		const entry = this.entries.get(requestId);
		if (!entry) {
			return;
		}
		entry.responseFailedS = timestamp;
		// abort the whole page if the first request fails
		if (requestId === this.firstRequestId) {
			const message = errorText || canceled && 'Canceled';
			throw new Error(`first request failed due to: ${message}`);
		}
	}

	_Network_getResponseBody(params) {
		const {requestId, body, base64Encoded} = params;
		const entry = this.entries.get(requestId);
		if (!entry) {
			return;
		}
		entry.responseBody = body;
		entry.responseBodyIsBase64 = base64Encoded;
		// check termination condition
		this._responseBodyCounter--;
	}

	_Page_domContentEventFired(params) {
		const {timestamp} = params;
		this.domContentEventFiredMs = timestamp * 1000;
	}

	_Page_loadEventFired(params) {
		const {timestamp} = params;
		this.loadEventFiredMs = timestamp * 1000;
	}

}


module.exports = Page;
