/** 
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */ 

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	start: (URL) => ipcRenderer.send('start', URL),
	analyze: () => ipcRenderer.send('analyze'),
	loadIDCard: () => ipcRenderer.send('loadIDCard'),
	loadSignature: () => ipcRenderer.send('loadSignature'),
	submitForm: (data) => ipcRenderer.send('submit-form', data),
	onChangeURL: (callback) => ipcRenderer.on('change-url', callback),
	onBadRequests: (callback) => ipcRenderer.on('bad-requests', callback),
	onIDCardUpload: (callback) => ipcRenderer.on('idcard-upload', callback),
	onSignatureUpload: (callback) => ipcRenderer.on('signature-upload', callback)
});
