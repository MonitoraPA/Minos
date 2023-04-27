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

const { app, session, BrowserWindow, BrowserView, ipcMain } = require('electron');
const { appendFile } = require('fs');
const { url } = require('url');
const path = require('path');
const config = require('./config.json');

const getViews = (webContents) => {
	const mainWindow = BrowserWindow.fromWebContents(webContents);
	const views = mainWindow.getBrowserViews();
	return views;
};

const verify = (event) => {
	const views = getViews(event.sender);
	const localView = views[0];
	const webView = views[1];
	localView.setBounds({ ...config.bounds.localView.small });
	webView.setBounds({ ...config.bounds.webView.full });
};

const start = (event, URL) => {
	const views = getViews(event.sender);
	const webView = views[1];
	webView.webContents.loadURL(URL);
};

const registerForEvents = (win) => {
	// whenever a response is received, append it to the log file
	// TODO: do the same for requests
	win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
		appendFile(config.logFilePath, JSON.stringify(details.responseHeaders), err => {
			if(err)
				console.log(`Failed to write log: ${log}.`);
		});
		callback(details);
	});
	// whenever the webView location changes, update the URL in the urlBox 
	const views = win.getBrowserViews();
	const localView = views[0];
	const webView = views[1];
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
	ipcMain.on('verify', verify);
	ipcMain.on('start', start);
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
