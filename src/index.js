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

const dateString = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
const LOG_FILE = config.logFilePrefix + dateString + ".txt"

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
		webView.webContents.loadURL(URL);
	},
	analyze: (event) => {
		resizeViews(getWin(event.sender), config.bounds.localView.full, config.bounds.webView.hidden);
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

const registerForEvents = (win) => {
	const views = win.getBrowserViews();
	const localView = views[0];
	const webView = views[1];

	try {
		webView.webContents.debugger.attach('1.3');
		console.log(`Debugger attached`);
	} catch(err) {
		console.log(`Debugger attach failed: ${err}.`);
	}

	webView.webContents.debugger.on('detach', (event, reason) => {
		console.log(`Debugger detached due to: ${reason}`);
		// console.log(JSON.stringify(requests, null, 4));
	});

	const actions = {
		'Network.requestWillBeSent': function(params) {
		},
		'Network.dataReceived': function(params) {
		},
		'Network.loadingFinished': function(params) {
		},
		'Network.requestServedFromCache': function(params) {
		},
		'Network.requestWillBeSentExtraInfo': function(params) {
		},
		'Network.responseReceived': function(params) {
		}
		// 'Network.responseReceivedExtraInfo': (params) => {}
	};

	webView.webContents.debugger.on('message', (event, method, params) => {
		if(actions.hasOwnProperty(method))
			actions[method](params);
	});

	webView.webContents.debugger.sendCommand('Network.enable');

	win.on('resize', () => {
		cropViewsToWindowSize(win);
	});
	// whenever the webView location changes, update the URL in the urlBox 
	webView.webContents.on('did-navigate-in-page', (event, URL, httpResponseCode, httpStatusText) => {
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
