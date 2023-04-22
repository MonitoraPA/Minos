/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const { session, BrowserWindow, BrowserView, app } = require('electron');
const { appendFile } = require('fs');
const { path } = require('path');
const { url } = require('url');

const LOG_FILE = "./log.txt";

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
		width: 800, 
		height: 600, 
		webPreferences: {
			webViewTag: true,
			nodeIntegration: true
		}
	});
	registerForHeaders(mainWindow);
	// disable spellchecker (by default electron will download languages from Google cdn)
	// please see: https://www.electronjs.org/docs/latest/tutorial/spellchecker/#does-the-spellchecker-use-any-google-services
	mainWindow.webContents.session.setSpellCheckerLanguages([]);
	mainWindow.webContents.session.setSpellCheckerEnabled(false);
	const topView = new BrowserView();
	topView.webContents.loadFile('src/gui.html');
	topView.setBounds({ x: 0, y: 0, width: 800, height: 50 });
	topView.setAutoResize({ width: true });
	const mainView = new BrowserView();
	mainView.webContents.loadURL('https://electronjs.org');
	mainView.setBounds({ x: 0, y: 50, width: 800, height: 600 });
	mainView.setAutoResize({ width: true, height: true });
	mainWindow.addBrowserView(topView);
	mainWindow.addBrowserView(mainView);
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
