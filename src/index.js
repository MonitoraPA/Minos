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

const { app, Menu, session, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');

try{ if (require('electron-squirrel-startup')) app.quit(); } catch {}

const packageInfo = require('../package');

const { writeFile } = require('fs');
const path = require('path');
const convertCDPtoHAR = require('./commons/convert-cdp-to-har');
const CDPCollector = require('./commons/cdp-collector');

const document = require('./commons/document');

const MODE_IS_DEV = !app.isPackaged;
const APP_PATH = app.getAppPath();
const CONF_PATH = MODE_IS_DEV
  ? path.join(app.getAppPath(), "config")
  : path.dirname(APP_PATH);
const config = require(path.join(CONF_PATH, 'conf.json'));

const hosts = require('../hosts.json');
const badRequests = {'requests': []};

const collector = new CDPCollector();

const filePaths = {};
let log_file_path = undefined;
let navigation_url = undefined;
let mainWindow = undefined;
let webView = undefined;
let localView = undefined;

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

const openFileDialogOptions = {
	properties: ['openFile'],
	filters: [ { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] } ]
};

const urlToFilePrefix = function(url){
	const noscheme = url.replace("https://", "").replace("http://", "");
	const domain = noscheme.indexOf('/') > -1
				 ? noscheme.substring(0, noscheme.indexOf('/'))
				 : noscheme;
	if (domain.indexOf('@') > -1){
		return domain.substring(domain.indexOf('@') + 1);
	}
	return domain;
}

const handlers = {
	start: (event, URL) => {
		if(!URL.startsWith('https://') && !URL.startsWith('http://')){
			URL = 'https://' + URL;
		}
		navigation_url = URL;
		attachDebugger(webView);
		const options = { userAgent: config.userAgent };
		webView.webContents.loadURL(URL, options)
			.then()
			.catch((err) => {
				console.error('start ERROR', err);
				// resizeViews(getWin(event.sender), config.bounds.localView.full, config.bounds.webView.hidden);
				// localView.webContents.send('navigation-fail', errorCode, errorDescription);
			});
	},
	analyze: (event) => {
		resizeViews(mainWindow, config.bounds.localView.full, config.bounds.webView.hidden);
		const timestamp = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
		log_file_path = config.logFilePrefix + '_' + urlToFilePrefix(navigation_url) + "_" + timestamp + ".har";
		dialog.showSaveDialog({
			properties: ['showOverwriteConfirmation', 'createDirectory'],
			title: "Salva il log della navigazione",
			defaultPath: log_file_path,
			buttonLabel: 'Salva',
			filters: [ { name: 'HAR files', extensions: ['har'] } ]
		}).then((response) => {
			/* delay collection to wait for all contents from debugger */
			const collectedEvents = collector.getCollectedEvents();

			collectedEvents.forEach(({method, params}) => {
				if(method === 'Network.requestWillBeSent'){
					const {url} = params.request;
					let timestamp = 0;
					try{
						timestamp = new Date(params.wallTime * 1000).toISOString();
					} catch (err){
						console.error('timestamp', timestamp, err);
						console.log(params);
					}
					let match = undefined;
					for(const [group, hostnames] of Object.entries(hosts)){
						for(const hostname of hostnames){
							if(url.indexOf(hostname.slice(1)) >= 0){ 	// slice to remove the beginning "dot" in the hostname
								if(match === undefined)
									match = {url: url, timestamp: timestamp, host: {name: hostname, group: group}};
								else {
									if(hostname.length > match.host.name){ // take only the longest matching host
										match.host.name = hostname;
										match.host.group = group;
									}
								}
							} 
						}
					}
					if (match !== undefined)
						badRequests.requests.push(match);
				}
			});

			if(response.canceled){
				localView.webContents.send('bad-requests', badRequests);
			} else {
				try {
					const HAR = convertCDPtoHAR(packageInfo, collectedEvents);
					detachDebugger(webView);
					writeFile(response.filePath, JSON.stringify(HAR, null, 4), (err) => {
						if(err)
							console.error(`error: writing log file failed due to`, err);
						});
					badRequests['logfile'] = response.filePath;
					localView.webContents.send('bad-requests', badRequests);
				} catch(err){
					console.error(`error: something bad happened while saving log file.`, err);
				}
			}
		});
	},
	loadIDCard: (event) => {
		dialog.showOpenDialog(openFileDialogOptions)
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
		dialog.showOpenDialog(openFileDialogOptions)
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
		data = {...data,
			attachment: log_file_path,
			website: navigation_url,
			badhosts: badRequests.requests.map(r => {
				return r.hosts.values[0] + " (" + r.hosts.source + ")"
			}).filter((val, idx, arr) => arr.indexOf(val) === idx), // remove duplicates
			signature: filePaths['signature'],
			idcard: filePaths['idcard']
		}
		const timestamp = (new Date()).toISOString().replace(/\..*/g, '').replace(/[-:TZ]/g, '');
		const docpath = config.claimPrefix + "_" + timestamp + ".pdf"
		// save document by allowing different filename
		dialog.showSaveDialog({
			properties: ['showOverwriteConfirmation', 'createDirectory'],
			title: "Salva il reclamo",
			defaultPath: docpath,
			buttonLabel: "Salva",
			filters: [ { name: "PDF files", extensions: ["pdf"] } ]
		}).then((response) => {
			if(response.canceled){
				// do nothing
			} else {
				try {
					document.createDocument(response.filePath, data);
					localView.webContents.send("claim-output", {docpath: response.filePath, error: false});
				} catch(err){
					console.log(`Could not generate claim: ${err}.`);
					localView.webContents.send("claim-output", {docpath: response.filePath, error: true}); // signal error
				}
			}
		})
	},
};

const attachDebugger = (view) => {
	collector.attach(view);
};

const detachDebugger = (view) => {
	try {
		collector.detach(view);
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
		resizeViews(mainWindow, config.bounds.localView.small, config.bounds.webView.full);
		localView.webContents.send('change-url', URL);
	});
	// whenever the webView location changes, update the URL in the urlBox
	webView.webContents.on('did-navigate-in-page', (event, URL, httpResponseCode, httpStatusText) => {
		localView.webContents.send('change-url', URL);
	});
	webView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validateURL, isMainFrame, frameProcessId, frameRoutingId) => {
		resizeViews(mainWindow, config.bounds.localView.full, config.bounds.webView.hidden);
		localView.webContents.send('navigation-fail', errorCode, errorDescription);
	});
};

const createApplicationMenu = (mainWindow, localView, webView) => {
	const { shell } = require('electron');
	const template = [
		{ role: 'fileMenu' },
		{ role: 'editMenu' },
		{
			label: 'View',
			submenu: [
				{ label: 'Ricarica',
				  accelerator: "CmdOrCtrl+R",
				  click: () => {
					 webView.webContents.reloadIgnoringCache();
				}},
				{ role: 'togglefullscreen' }
			]
		},
		{
			role: 'help',
			submenu: [{
				label: 'Contatti',
				click: async () => {
					await shell.openExternal('https://monitora-pa.it/contatti.html');
				}
			}, {
				label: 'Sorgenti (GitHub)',
				click: async () => {
					await shell.openExternal('https://github.com/MonitoraPA/Minos');
				}
			}, {
				label: 'Segnalazioni (GitHub)',
				click: async () => {
					await shell.openExternal('https://github.com/MonitoraPA/Minos/issues');
				}
			}, {
				label: 'Licenza',
				click: async () => {
					await shell.openExternal('https://monitora-pa.it/LICENSE.txt');
				}
			}]
		}];
	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

const createWindow = () => {
	mainWindow = new BrowserWindow({
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
	localView = new BrowserView({
		webPreferences: {
				preload: path.join(__dirname, 'preload.js')
			}
		}
	);
	webView = new BrowserView();
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
	createApplicationMenu(mainWindow, localView, webView)
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
