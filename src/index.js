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
const config = require('./config.json');
const createHAR = require('./cdp2har');
const Page = require('./page');

const dateString = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
const LOG_FILE = config.logFilePrefix + dateString + ".txt"

const page = new Page();

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

const handlers = {
	start: (event, URL) => {
		resizeViews(getWin(event.sender), config.bounds.localView.small, config.bounds.webView.full);
		const views = getViews(getWin(event.sender));
		const webView = views[1];
		if(!URL.startsWith('https://')){
			URL = 'https://' + URL;
		}
		attachDebugger(webView);
		webView.webContents.loadURL(URL);
	},
	analyze: (event) => {
		resizeViews(getWin(event.sender), config.bounds.localView.full, config.bounds.webView.hidden);
		const HAR = createHAR([page]);
		console.log(JSON.stringify(HAR, null, 4));
	},
	loadIDCard: (event) => {
		dialog.showOpenDialog({ properties: ['openFile'] }).then((response) => {
			if(!response.canceled){
				console.log(response);
			} else {
				console.log("no file selected");
			}
		});
	}
};

const getWin = (webContents) => BrowserWindow.fromWebContents(webContents);
const getViews = (mainWindow) => mainWindow.getBrowserViews();

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

const registerForEvents = (win) => {
	const views = win.getBrowserViews();
	const localView = views[0];
	const webView = views[1];

	win.on('resize', () => {
		cropViewsToWindowSize(win);
	});
	webView.webContents.on('did-navigate', (event, URL, httpResponseCode, httpStatusText) => {
		// TODO check if navigation ok
		page.url = URL;
	});
	// whenever the webView location changes, update the URL in the urlBox 
	webView.webContents.on('did-navigate-in-page', (event, URL, httpResponseCode, httpStatusText) => {
		// TODO check if navigation ok
		localView.webContents.send('change-url', URL);
	});
};

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: config.bounds.browserWindow.width, 
		height: config.bounds.browserWindow.height, 
		backgroundColor: config.colors.background,
		webPreferences: {
			webViewTag: true,
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
	localView.webContents.loadFile('src/main.html');
	localView.setBounds({ ...config.bounds.localView.full });
	localView.setAutoResize({ width: true });
	const webView = new BrowserView();
	webView.setBounds({ ...config.bounds.webView.hidden });
	webView.setAutoResize({ width: true, height: true });
	mainWindow.addBrowserView(localView);
	mainWindow.addBrowserView(webView);
	if(config.debug)
		localView.webContents.openDevTools();
	registerForEvents(mainWindow);
};

const onReadyApp = () => {
	ipcMain.on('start', handlers.start);
	ipcMain.on('analyze', handlers.analyze);
	ipcMain.on('loadIDCard', handlers.loadIDCard);
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
