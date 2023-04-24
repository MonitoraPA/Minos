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

const LOG_FILE = "./log.txt";

const resizeViews = (event) => {
	console.log('resize');
	const webContents = event.sender;
	const mainWindow = BrowserWindow.fromWebContents(webContents);
	const views = mainWindow.getBrowserViews();
	const localView = views[0];
	localView.setBounds({ x: 0, y: 0, width: 1280, height: 50 });
	const webView = views[1];
	webView.setBounds({x: 0, y: 60, width: 1280, height: 1230 });
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
	localView.setBounds({ x: 0, y: 0, width: 1280, height: 720 });
	localView.setAutoResize({ width: true });
	const webView = new BrowserView();
	// webView.webContents.loadURL('https://electronjs.org');
	webView.setBounds({ x: 0, y: 720, width: 1280, height: 0 });
	webView.setAutoResize({ width: true, height: true });
	mainWindow.addBrowserView(localView);
	mainWindow.addBrowserView(webView);
	// localView.webContents.openDevTools();
	ipcMain.on('verify', resizeViews);
};

const onReadyApp = () => {
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
