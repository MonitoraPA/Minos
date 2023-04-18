const { session, BrowserWindow, app } = require('electron');
const { appendFile } = require('fs');

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
	const mainWindow = new BrowserWindow({width: 800, height: 600});
	registerForHeaders(mainWindow);
	mainWindow.loadURL('https://duckduckgo.com');
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
