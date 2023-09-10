/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const DisposableObserver = require("./disposable-observer");

class CDPCollector extends DisposableObserver {
	#views;
	#events;
	#navigatedURLs;
	constructor(){
		super();
		this.#views = [];
		this.#navigatedURLs = {};
	}

	attach(view){
		if(this.#views.length === 0){
			this.#events = [];
			this.#navigatedURLs = {};
		}
		this.#views.push(view);
		try {
			view.webContents.debugger.attach('1.3');
			console.log(`CDPCollector: attached to ${view.name}.`);
		} catch(err) {
			console.error(`CDPCollector: attach to ${view.name} failed: ${err}.`);
			return;
		}

		const onWebViewNavigationRequest = this.#onWebViewNavigationRequest.bind(this, view);
		view.webContents.on('will-navigate', onWebViewNavigationRequest);

		const onWebViewNavigation = this.#onWebViewNavigation.bind(this, view);
        view.webContents.on('did-navigate', onWebViewNavigation);

		const onWebViewWindowCreation = this.#onWebViewWindowCreation.bind(this, view);
		view.webContents.on('did-create-window', onWebViewWindowCreation);

		const onCookiesChange = this.#onCookiesChange.bind(this, view);

		const onDebuggerMessage = this.#onDebuggerMessage.bind(this, view);
		view.webContents.debugger.on('message', onDebuggerMessage);

		const onDebuggerDetach = this.#onDebuggerDetach.bind(this, view);
		view.webContents.debugger.on('detach', onDebuggerDetach);

		this.#sendCommand(view, 'Network.clearBrowserCache');
		this.#sendCommand(view, 'Network.clearBrowserCookies').then(() => {
			setTimeout(() => view.webContents.session.cookies.on('changed', onCookiesChange), 1000);
		});
		this.#sendCommand(view, 'Network.setCacheDisabled', {cacheDisabled: true});
		this.#sendCommand(view, 'Network.enable', {'maxResourceBufferSize': 100*1024*1024});
		this.#sendCommand(view, 'Page.enable');
		this.#sendCommand(view, 'Fetch.enable', {
			'handleAuthRequests': true,
			patterns: [
				{ requestStage: 'Response' },
				{ requestStage: 'Request' }
			]
		});

		this._onDeactivation(() => {
			try{
				this.#sendCommand(view, 'Network.disable');
				this.#sendCommand(view, 'Page.disable');
				this.#sendCommand(view, 'Fetch.disable');
				view.webContents.session.cookies.removeListener('changed', onCookiesChange);
				view.webContents.removeListener('will-navigate', onWebViewNavigationRequest);
				view.webContents.removeListener('did-navigate', onWebViewNavigation);
				view.webContents.removeListener('did-create-window', onWebViewWindowCreation);
				view.webContents.debugger.removeListener('message', onDebuggerMessage);
				view.webContents.debugger.removeListener('detach', onDebuggerDetach);
			} catch (e){
				console.warn("Exception while executing CDPCollector._onDeactivation", e);
			}
		});

		return () => this.dispose();
	}

	#onCookiesChange(view, event, cookie, cause, removed){
		const synteticEvent = {
			cookie: cookie,
			cause: cause,
			removed: removed
		};
		this.#add(view, 'WebView.setCookie', synteticEvent);
	}

	#onDebuggerMessage(view, event, method, params){
		//console.log('CDPCollector: received: ' + method, params);
		this.#add(view, method, params);
	}

	#onDebuggerDetach(view, event, reason){
		const viewName = view.name ?? "unidentified view";
		if(view.name && this.#navigatedURLs[view.name]){
			delete this.#navigatedURLs[view.name];
		}
		console.log(`CDPCollector: detached from ${viewName} due to: ${reason}`);
	}

	#onWebViewNavigationRequest(view, details){
		const synteticEvent = {
			documentURL: details.url,
			frameId: details.frame.frameTreeNodeId,
			frame: {
				name: details.frame.name,
				osProcessId: details.frame.osProcessId,
				processId: details.frame.processId,
				routingId: details.frame.routingId,
				visibilityState: details.frame.visibilityState,
				currentURL: details.frame.url
			}
		};
		this.#add(view, 'WebView.willNavigate', synteticEvent);
    }

	#onWebViewNavigation(view, event, url, httpResponseCode, httpStatusText){
		this.#navigatedURLs[view.name] = url;
		const synteticEvent = {
			documentURL: url
		};
		this.#add(view, 'WebView.didNavigate', synteticEvent);
    }

	#onWebViewWindowCreation(view, window, details){
		/* yes we attach a window as a view since it has a webContents field anyway */
		this.attach(window);
		const synteticEvent = {
			...details,
			documentURL: details.url,
			newBrowserView: window.name
		};
		delete synteticEvent.session;
		this.#add(view, 'WebView.createdWindow', synteticEvent);

		const onOpenedWindowClosed = this.#onOpenedWindowClosed.bind(this, view, window.name);
		window.on('closed', onOpenedWindowClosed);
	}

	#onOpenedWindowClosed(view, windowName){
		const synteticEvent = {
			newBrowserView: windowName
		};
		this.#add(view, 'WebView.windowClosed', synteticEvent);
	}

	_onDispose(){
		if(this.#views.length === 0){
			return;
		}
		try {
			for(const view of this.#views){
				view.webContents.debugger.detach();
			}
			this.#views = [];
			this.#navigatedURLs = {};
			this.#events = [];
		} catch(err) {
			console.log(`CDPCollector: detach failed due to: ${err}.`);
		}
	}

	#sendCommand(view, command, params = undefined){
		return view.webContents.debugger.sendCommand(command, params).then(() => {
			console.log(`CDPCollector: ${command} completed.`);
		}).catch((err) => {
			if(command.endsWith(".disable")){
				console.warn(`CDPCollector: ${command} failed: ${err}`);
			} else {
				console.error(`CDPCollector: ${command} failed: ${err}`);
			}
		});
	}

	#add(view, method, params){
		if(view.name){
			params._browserView = view.name;
		}

		if(!params.documentURL && !method.startsWith("Network.")){
			try{
				params.documentURL = view.webContents.getURL();
			} catch (e) {
				if(e instanceof TypeError && e.message === "Object has been destroyed"){
					if(this.#navigatedURLs[view.name]){
						params.documentURL = this.#navigatedURLs[view.name];
					}
				} else {
					console.error(`CDPCollector.#add: cannot read current url from ${view.name}`, method, params, e);
					throw e;
				}
			}
		}
		try{
			this.#events.push({method, params});
		} catch (e) {
			console.error('CDPCollector.#add: cannot push new event', method, params, e);
			throw e;
		}
		try{
			if(method === 'Network.requestWillBeSent'
			&& params.hasPostData && !params.postData){
				this.#getPostData(view, params.requestId);
			} else if(method === 'Fetch.authRequired'){
				this.#fetchAuthContents(view, params.requestId);
			} else if(method === 'Fetch.requestPaused'){
				if(!params.responseHeaders){
					this.#continueFetchRequest(view, params.requestId);
				} else if(params.responseStatusCode >= 300 && params.responseStatusCode < 400){
					this.#continueFetchRequest(view, params.requestId);
				} else {
					this.#fetchContents(view, params.requestId);
				}
			}
		} catch (e) {
			if(e instanceof TypeError && e.message === "Object has been destroyed"){
				/* nothing to do */
			} else {
				console.error(`CDPCollector.#add: ${view.name}: error in collection followup`, method, params, e);
				throw e;
			}
		}
	}

	#getPostData(view, requestId){
		view.webContents.debugger.sendCommand('Network.getRequestPostData', {
			requestId: requestId
		}).then((result) => {
			this.#events.push({
				method: 'Network.getRequestPostData',
				params: {
					requestId: requestId,
					...result
				}
			});
		}).catch((err) => {});
	}

	#continueFetchRequest(view, requestId){
		view.webContents.debugger.sendCommand('Fetch.continueRequest', {
			requestId: requestId
		});
	}
	#continueFetchRequestWithAuth(view, requestId){
		view.webContents.debugger.sendCommand('Fetch.continueWithAuth', {
			requestId: requestId
		});
	}
	#fetchContents(view, requestId){
		view.webContents.debugger.sendCommand('Fetch.getResponseBody', {
			requestId: requestId
		}).then((result) => {
			//console.log('fetchContents RESULT', result);
			this.#events.push({
				method: 'Fetch.getResponseBody',
				params: {
					requestId: requestId,
					...result
				}
			});
			this.#continueFetchRequest(view, requestId);
		}).catch((err) => {
			console.error('fetchContents ERROR', err);
			this.#continueFetchRequest(view, requestId);
		});
	}
	#fetchAuthContents(view, requestId){
		view.webContents.debugger.sendCommand('Fetch.getResponseBody', {
			requestId: requestId
		}).then((result) => {
			//console.log('fetchAuthContents RESULT', result);
			this.#events.push({
				method: 'Fetch.getResponseBody',
				params: {
					requestId: requestId,
					...result
				}
			});
			this.#continueFetchRequestWithAuth(view, requestId);
		}).catch((err) => {
			console.error('fetchAuthContents ERROR', err);
			this.#continueFetchRequestWithAuth(view, requestId);
		});
	}

	getCollectedEvents(){
		return this.#events;
	}
}

module.exports = CDPCollector;