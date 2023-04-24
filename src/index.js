/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const { session, BrowserWindow, BrowserView, app, ipcMain } = require('electron');
const { appendFile } = require('fs');
const { url } = require('url');
const path = require('path');

// TODO: put in configuration file
const LOG_FILE = "./log.txt";

const getViews = (webContents) => {
	const mainWindow = BrowserWindow.fromWebContents(webContents);
	const views = mainWindow.getBrowserViews();
	return views;
};

const verify = (event) => {
	const views = getViews(event.sender);
	const localView = views[0];
	const webView = views[1];
	// TODO: put views bounds into a json configuration file
	localView.setBounds({ x: 0, y: 0, width: 1280, height: 50 });
	webView.setBounds({x: 0, y: 50, width: 1280, height: 1230 });
};

const start = (event, URL) => {
	const views = getViews(event.sender);
	const webView = views[1];
	webView.webContents.loadURL(URL);
};

const registerForHeaders = (win) => {
	// whenever a response is received, append it to the log file
	win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
		appendFile(LOG_FILE, JSON.stringify(details.responseHeaders), err => {
			if(err)
				console.log(`Failed to write log: ${log}.`);
		});
		callback(details);
	});
};

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		// TODO: put bounds and bg color in configuration file
		width: 1280, 
		height: 720, 
		backgroundColor: "#EDEDED",
		webPreferences: {
			webViewTag: true,
			nodeIntegration: true
			// preload: path.join(__dirname, 'preload.js')
		}
	});
	registerForHeaders(mainWindow);
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
	// TODO: put bounds in config file
	localView.setBounds({ x: 0, y: 0, width: 1280, height: 720 });
	localView.setAutoResize({ width: true });
	const webView = new BrowserView();
	// TODO: put bounds in config file
	webView.setBounds({ x: 0, y: 720, width: 1280, height: 0 });
	webView.setAutoResize({ width: true, height: true });
	mainWindow.addBrowserView(localView);
	mainWindow.addBrowserView(webView);
	// localView.webContents.openDevTools();
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
