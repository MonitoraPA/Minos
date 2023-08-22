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
		const self = this;
		try {
			view.webContents.debugger.attach('1.3');
			console.log(`CDPCollector: attached`);
		} catch(err) {
			console.error(`CDPCollector: attach failed: ${err}.`);
			return;
		}

		view.webContents.debugger.on('message', (event, method, params) => {
			//console.log('CDPCollector: received: ' + method, params);
			self._add(method, params);
		});
		view.webContents.debugger.on('detach', (event, reason) => {
			console.log(`CDPCollector: detached due to: ${reason}`);
		});

		self._sendCommand(view, 'Network.clearBrowserCache');
		self._sendCommand(view, 'Network.clearBrowserCookies');
		self._sendCommand(view, 'Network.setCacheDisabled', {cacheDisabled: true});
		self._sendCommand(view, 'Network.enable', {'maxResourceBufferSize': 100*1024*1024});
		self._sendCommand(view, 'Page.enable');
		self._sendCommand(view, 'Fetch.enable', {'handleAuthRequests': true, patterns: [ { requestStage: 'Response' }, { requestStage: 'Request' } ]});
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

	_sendCommand(view, command, params = undefined){
		view.webContents.debugger.sendCommand(command, params).then(() => {
			console.log(`CDPCollector: ${command} completed.`);
		}).catch((err) => {
			console.error(`CDPCollector: ${command} failed: ${err}`);
		});
	}

	_add(method, params){
		const self = this;
		if(method.indexOf('Page.') === 0){
			params.documentURL = this.view.webContents.getURL();
		}
		this.events.push({method, params});
		if(method === 'Network.requestWillBeSent'
		&& params.hasPostData && !params.postData){
			self._getPostData(params.requestId);
		} else if(method === 'Fetch.authRequired'){
			self._fetchAuthContents(params.requestId);
		} else if(method === 'Fetch.requestPaused'){
			if(!params.responseHeaders){
				self._continueFetchRequest(params.requestId);
			} else if(params.responseStatusCode >= 300 && params.responseStatusCode < 400){
				self._continueFetchRequest(params.requestId);
			} else {
				self._fetchContents(params.requestId);
			}
		}
	}

	_getPostData(requestId){
		const self = this;
		self.view.webContents.debugger.sendCommand('Network.getRequestPostData', {
			requestId: requestId
		}).then((result) => {
			self.events.push({
				method: 'Network.getRequestPostData',
				params: {
					requestId: requestId,
					...result
				}
			});
		}).catch((err) => {});
	}

	_continueFetchRequest(requestId){
		this.view.webContents.debugger.sendCommand('Fetch.continueRequest', {
			requestId: requestId
		});
	}
	_continueFetchRequestWithAuth(requestId){
		this.view.webContents.debugger.sendCommand('Fetch.continueWithAuth', {
			requestId: requestId
		});
	}
	_fetchContents(requestId){
		const self = this;
		self.view.webContents.debugger.sendCommand('Fetch.getResponseBody', {
			requestId: requestId
		}).then((result) => {
			//console.log('fetchContents RESULT', result);
			self.events.push({
				method: 'Fetch.getResponseBody',
				params: {
					requestId: requestId,
					...result
				}
			});
			self._continueFetchRequest(requestId);
		}).catch((err) => {
			console.error('fetchContents ERROR', err);
			self._continueFetchRequest(requestId);
		});
	}
	_fetchAuthContents(requestId){
		const self = this;
		self.view.webContents.debugger.sendCommand('Fetch.getResponseBody', {
			requestId: requestId
		}).then((result) => {
			//console.log('fetchAuthContents RESULT', result);
			self.events.push({
				method: 'Fetch.getResponseBody',
				params: {
					requestId: requestId,
					...result
				}
			});
			self._continueFetchRequestWithAuth(requestId);
		}).catch((err) => {
			console.error('fetchAuthContents ERROR', err);
			self._continueFetchRequestWithAuth(requestId);
		});
	}

	getCollectedEvents(){
		return this.events;
	}
}

module.exports = CDPCollector;