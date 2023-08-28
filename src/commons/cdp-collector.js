/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */
class CDPCollector {
	constructor(events){
		if(!events){
			events = [];
		}
		this.events = events;
	}

	attach(view){
		this.view = view;
		try {
			view.webContents.debugger.attach('1.3');
			console.log(`CDPCollector: attached`);
		} catch(err) {
			console.error(`CDPCollector: attach failed: ${err}.`);
			return;
		}

		view.webContents.debugger.on('message', (event, method, params) => {
			//console.log('CDPCollector: received: ' + method, params);
			this.#add(method, params);
		});
		view.webContents.debugger.on('detach', (event, reason) => {
			console.log(`CDPCollector: detached due to: ${reason}`);
		});

		this.#sendCommand(view, 'Network.clearBrowserCache');
		this.#sendCommand(view, 'Network.clearBrowserCookies');
		this.#sendCommand(view, 'Network.setCacheDisabled', {cacheDisabled: true});
		this.#sendCommand(view, 'Network.enable', {'maxResourceBufferSize': 100*1024*1024});
		this.#sendCommand(view, 'Page.enable');
		this.#sendCommand(view, 'Fetch.enable', {'handleAuthRequests': true, patterns: [ { requestStage: 'Response' }, { requestStage: 'Request' } ]});
	}

	detach(view){
		if(this.view && this.view != view){
			throw new Error("CDPCollector: detached from unattached view.")
		}
		try {
			view.webContents.debugger.detach();
			this.view = undefined;
		} catch(err) {
			console.log(`CDPCollector: detach failed due to: ${err}.`);
		}
	}

	#sendCommand(view, command, params = undefined){
		view.webContents.debugger.sendCommand(command, params).then(() => {
			console.log(`CDPCollector: ${command} completed.`);
		}).catch((err) => {
			console.error(`CDPCollector: ${command} failed: ${err}`);
		});
	}

	#add(method, params){
		if(method.indexOf('Page.') === 0){
			params.documentURL = this.view.webContents.getURL();
		}
		this.events.push({method, params});
		if(method === 'Network.requestWillBeSent'
		&& params.hasPostData && !params.postData){
			this.#getPostData(params.requestId);
		} else if(method === 'Fetch.authRequired'){
			this.#fetchAuthContents(params.requestId);
		} else if(method === 'Fetch.requestPaused'){
			if(!params.responseHeaders){
				this.#continueFetchRequest(params.requestId);
			} else if(params.responseStatusCode >= 300 && params.responseStatusCode < 400){
				this.#continueFetchRequest(params.requestId);
			} else {
				this.#fetchContents(params.requestId);
			}
		}
	}

	#getPostData(requestId){
		this.view.webContents.debugger.sendCommand('Network.getRequestPostData', {
			requestId: requestId
		}).then((result) => {
			this.events.push({
				method: 'Network.getRequestPostData',
				params: {
					requestId: requestId,
					...result
				}
			});
		}).catch((err) => {});
	}

	#continueFetchRequest(requestId){
		this.view.webContents.debugger.sendCommand('Fetch.continueRequest', {
			requestId: requestId
		});
	}
	#continueFetchRequestWithAuth(requestId){
		this.view.webContents.debugger.sendCommand('Fetch.continueWithAuth', {
			requestId: requestId
		});
	}
	#fetchContents(requestId){
		this.view.webContents.debugger.sendCommand('Fetch.getResponseBody', {
			requestId: requestId
		}).then((result) => {
			//console.log('fetchContents RESULT', result);
			this.events.push({
				method: 'Fetch.getResponseBody',
				params: {
					requestId: requestId,
					...result
				}
			});
			this.#continueFetchRequest(requestId);
		}).catch((err) => {
			console.error('fetchContents ERROR', err);
			this.#continueFetchRequest(requestId);
		});
	}
	#fetchAuthContents(requestId){
		this.view.webContents.debugger.sendCommand('Fetch.getResponseBody', {
			requestId: requestId
		}).then((result) => {
			//console.log('fetchAuthContents RESULT', result);
			this.events.push({
				method: 'Fetch.getResponseBody',
				params: {
					requestId: requestId,
					...result
				}
			});
			this.#continueFetchRequestWithAuth(requestId);
		}).catch((err) => {
			console.error('fetchAuthContents ERROR', err);
			this.#continueFetchRequestWithAuth(requestId);
		});
	}

	getCollectedEvents(){
		return this.events;
	}
}

module.exports = CDPCollector;