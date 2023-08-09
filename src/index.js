/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

/**
 * Portions of this file are Copyright (C) 2023 Massimo Ghisalberti 
 * (see licenses/MIT.txt)
 */

const { app, session, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const { appendFile, readFile, createReadStream } = require('fs');
const { url } = require('url');
const path = require('path');
const createHAR = require('./har/cdp2har');
const Page = require('./har/page');
const document = require('./modules/document');

const MODE_IS_DEV = !app.isPackaged;
const APP_PATH = app.getAppPath();
const CONF_PATH = MODE_IS_DEV
  ? path.join(app.getAppPath(), "config")
  : path.dirname(APP_PATH);
const config = require(path.join(CONF_PATH, 'conf.json'));

const page = new Page();

const hosts = require('../hosts.json');
const badRequests = {'requests': []};

const filePaths = {};
let log_file = undefined;
let navigation_url = undefined;

const cropViewsToWindowSize = (mainWindow) => {
	const winBounds = mainWindow.getBounds();
	const views = mainWindow.getBrowserViews();
	const localView = views[0];
	const webView = views[1];
	localView.setBounds({ ...localView.getBounds(), width: Math.min(localView.getBounds().width, winBounds.width)});
	webView.setBounds({ ...webView.getBounds(), width: Math.min(webView.getBounds().width, winBounds.width)});
};

const resizeViews = (mainWindow, localViewBounds, webViewBounds) => {
	const winBounds = mainWindow.getBounds();
	const views = mainWindow.getBrowserViews();
	const localView = views[0];
	const webView = views[1];
	localView.setBounds({ ...localViewBounds, width: Math.min(localViewBounds.width, winBounds.width)});
	webView.setBounds({ ...webViewBounds, width: Math.min(webViewBounds.width, winBounds.width)});
};

const fileDialogOptions = {
	properties: ['openFile'],
	filters: [ { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] } ]
};

const handlers = {
	start: (event, URL) => {
		const [localView, webView] = getViews(getWin(event.sender));
		if(!URL.startsWith('https://') && !URL.startsWith('http://')){
			URL = 'https://' + URL;
		}
		navigation_url = URL;
		attachDebugger(webView);
		const options = { userAgent: config.userAgent };
		webView.webContents.loadURL(URL, options)
			.then()
			.catch((err) => {
				console.log(`could not load page!`);
				// resizeViews(getWin(event.sender), config.bounds.localView.full, config.bounds.webView.hidden);
				// localView.webContents.send('navigation-fail', errorCode, errorDescription);		
			});
	},
	analyze: (event) => {
		resizeViews(getWin(event.sender), config.bounds.localView.full, config.bounds.webView.hidden);
		const [localView, webView] = getViews(getWin(event.sender));
		const HAR = createHAR([page]);
		detachDebugger(webView);
		writeLog(HAR);
		localView.webContents.send('bad-requests', badRequests);
	},
	loadIDCard: (event) => {
		const [localView, webView] = getViews(getWin(event.sender));
		dialog.showOpenDialog(fileDialogOptions)
			.then((response) => {
				if(!response.canceled){
					filePaths['idcard'] = response.filePaths[0];
					// send idCard path to renderer
					localView.webContents.send('idcard-upload', filePaths['idcard']);	
				} else {
					// do nothing
				}
			}).catch((err) => {
				console.log(`error: ${err}.`);
			});
	},
	loadSignature: (event) => {
		const [localView, webView] = getViews(getWin(event.sender));
		dialog.showOpenDialog(fileDialogOptions)
			.then((response) => {
				if(!response.canceled){
					filePaths['signature'] = response.filePaths[0];
					// send idCard path to renderer
					localView.webContents.send('signature-upload', filePaths['signature']);	
				} else {
					// do nothing
				}
			}).catch((err) => {
				console.log(`error: ${err}.`);
			});
	}, 
	submitForm: (event, data) => {
		const [localView, webView] = getViews(getWin(event.sender));
		data = {...data,
			attachment: log_file,
			website: navigation_url,
			badhosts: badRequests.requests.map(r => {
				return r.hosts.values[0] + " (" + r.hosts.source + ")"
			}).filter((val, idx, arr) => arr.indexOf(val) === idx), // remove duplicates
			signature: filePaths['signature'],
			idcard: filePaths['idcard']
		}
		const timestamp = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
		const docpath = config.claimPrefix + "_" + timestamp + ".pdf"
		try {
			document.createDocument(docpath, data);
			localView.webContents.send('claim-output', docpath);
		} catch(err){
			console.log(`Could not generate claim: ${err}.`);
			localView.webContents.send('claim-output', undefined); // signal error
		}
	}
};

const getWin = (webContents) => BrowserWindow.fromWebContents(webContents);
const getViews = (mainWindow) => mainWindow.getBrowserViews();

const writeLog = (HAR) => {
	const timestamp = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
	log_file = config.logFilePrefix + "_" + timestamp + ".har";
	badRequests['logfile'] = log_file;
	appendFile(log_file, JSON.stringify(HAR, null, 4), (err) => {
		if(err)
			console.error(`error: writing log file failed due to: ${err}.`);
	});
};

const getCookies = (webContents) => {
	webContents.debugger.sendCommand('Network.getCookies')
	    .then((cookies) => {
			for(const cookie of cookies){
				console.log(`cookie:`);
				console.log(cookie);
			}
		}).catch((err) => {
			if(err){
				console.log(`err: ${err}`);
			}
		});
}

const attachDebugger = (view) => {

	try {
		view.webContents.debugger.attach('1.3');
		console.log(`debugger: attached`);
	} catch(err) {
		console.log(`debugger: attach failed due to: ${err}.`);
	}

	view.webContents.debugger.on('detach', (event, reason) => {
		console.log(`debugger: detached due to: ${reason}`);
	});

	view.webContents.debugger.on('message', (event, method, params) => {
		// identify requests to "bad" hosts (sooner is better!)
		if(method === 'Network.requestWillBeSent'){
			const {url} = params.request;	
			const timestamp = new Date(params.wallTime * 1000).toISOString();
			matching = Object.entries(hosts)
					.map(([src, hs]) => [src, hs.filter(u => url.indexOf(u.slice(1)) >= 0)]) // identify matching hosts
					.filter(([src, matchingHosts]) => matchingHosts.length > 0)
					.reduce((obj, [src, matchingHosts]) => { 
						obj['url'] = url; 
						obj['hosts'] = {'source': src, 'values': matchingHosts}; 
						obj['timestamp'] = timestamp; 
						return obj }
					, {});
			if(Object.entries(matching).length > 0)
				badRequests.requests.push(matching);
		}
		const methodName = `_${method.replace('.', '_')}`;
		if(methodName in Page.prototype){
			try {
				page.processEvent(method, params);
			} catch(err){
				console.log(`err: ${err}`);
			}
		}
		// we need to explicitly fetch the response body, since the
		// loadingFinished params do not contain the response body
		if(method === 'Network.loadingFinished'){
			// only if entry is being tracked (e.g. no cached items)
			if(page.entries.get(params.requestId)){
				view.webContents.debugger.sendCommand('Network.getResponseBody', {
					requestId: params.requestId
				}).then((result) => {
					page.processEvent('Network.getResponseBody', {requestId: params.requestId, ...result});
				}).catch((err) => {
					// sometimes it is impossible to fetch the whole content (please refer to: https://github.com/cyrus-and/chrome-har-capturer/issues/82)
					page.processEvent('Network.getResponseBody', {requestId: params.requestId});
				});
			}
		}
	});

	view.webContents.debugger.sendCommand(`Network.setCacheDisabled`, {cacheDisabled: true}).then(() => {
		console.log(`debugger: network cache disabled.`);
	}).catch((err) => {
		console.log(`debugger: could not disable network cache due to: ${err}.`);
	});

	const enableCmds = ['Network', 'Page'];

	for(const cmd of enableCmds){
		view.webContents.debugger.sendCommand(`${cmd}.enable`).then(() => {
			console.log(`debugger: ${cmd} enabled.`);
		}).catch((err) => {
			console.log(`debugger: ${cmd} could not be enabled due to: ${err}.`);
		});
	}

	view.webContents.debugger.sendCommand('Network.enable').then(() => {
		console.log(`debugger: network enabled.`);
	}).catch((err) => {
		console.log(`debugger: network could not be enabled due to: ${err}.`);
	});
	view.webContents.debugger.sendCommand('Page.enable').then(() => {
		console.log(`debugger: page enabled.`);
	}).catch((err) => {
		console.log(`debugger: page could not be enabled due to: ${err}.`);
	});
};

const detachDebugger = (view) => {
	try {
		view.webContents.debugger.detach();
	} catch(err) {
		console.log(`debugger: detach failed due to: ${err}.`);
	}
};

const registerForEvents = (win) => {
	const views = win.getBrowserViews();
	const localView = views[0];
	const webView = views[1];

	win.on('resize', () => {
		cropViewsToWindowSize(win);
	});
	webView.webContents.on('did-navigate', (event, URL, httpResponseCode, httpStatusText) => {
		resizeViews(getWin(event.sender), config.bounds.localView.small, config.bounds.webView.full);
		localView.webContents.send('change-url', URL);
		page.url = URL;
	});
	// whenever the webView location changes, update the URL in the urlBox 
	webView.webContents.on('did-navigate-in-page', (event, URL, httpResponseCode, httpStatusText) => {
		localView.webContents.send('change-url', URL);
	});
	webView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validateURL, isMainFrame, frameProcessId, frameRoutingId) => {
		resizeViews(getWin(event.sender), config.bounds.localView.full, config.bounds.webView.hidden);
		localView.webContents.send('navigation-fail', errorCode, errorDescription);		
	});
};

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: config.bounds.browserWindow.width, 
		height: config.bounds.browserWindow.height, 
		backgroundColor: config.colors.background,
		icon: 'assets/icon.png',
		webPreferences: {
			nodeIntegration: true
		}
	});
	// disable spellchecker (by default electron will download languages from Google cdn)
	// please see: https://www.electronjs.org/docs/latest/tutorial/spellchecker/#does-the-spellchecker-use-any-google-services
	mainWindow.webContents.session.setSpellCheckerLanguages([]);
	mainWindow.webContents.session.setSpellCheckerEnabled(false);
	const localView = new BrowserView({ 
		webPreferences: { 
				preload: path.join(__dirname, 'preload.js') 
			}
		}
	);
	const webView = new BrowserView();
	mainWindow.addBrowserView(localView);
	mainWindow.addBrowserView(webView);
	localView.webContents.loadFile('src/main.html').then(() => {
		localView.setBounds({ ...config.bounds.localView.full });
		localView.setAutoResize({ width: true });
	});
	webView.setBounds({ ...config.bounds.webView.hidden });
	webView.setAutoResize({ width: true, height: true });
	if(config.debug)
		localView.webContents.openDevTools();
	registerForEvents(mainWindow);
	// due to some bugs, browserviews will not show up until the 
	// main window is resized; see: https://github.com/electron/electron/issues/31424
	// however, Electron himself suggests not using webview tags, so
	// by now the cleanest solution seems to be the BrowserView
	// see: https://www.electronjs.org/docs/latest/api/webview-tag#warning
};

const onReadyApp = () => {
	ipcMain.on('start', handlers.start);
	ipcMain.on('analyze', handlers.analyze);
	ipcMain.on('loadIDCard', handlers.loadIDCard);
	ipcMain.on('loadSignature', handlers.loadSignature);
	ipcMain.on('submit-form', handlers.submitForm);
	createWindow();
	app.on('activate', () => {
		if(BrowserWindow.getAllWindows().length === 0)
			createWindow();
	});
};

app.on('ready', onReadyApp);

app.on('window-all-closed', () => {
	if(process.platform !== 'darwin')
		app.quit();
});
