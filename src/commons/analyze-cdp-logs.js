/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 ebmaj7 <ebmaj7@proton.me>
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */
const hosts = require('../../hosts.json');
const trackingCookies = [
	'_ga'
]
const parseSetCookieLine = require("./parse-set-cookie");

function analyzeCDPLogs(collectedEvents, initialURL){
	const issues = {};
	const requestedURLs = [];
	const badRequests = {};
	const httpCookiesNames = [];
	const webViewSetCookies = [];
	for (const {method, params} of collectedEvents){
		switch(method){
		case 'Network.requestWillBeSent':
		case 'Fetch.requestPaused':
			const {url} = params.request;
			if(!requestedURLs.includes(url)){
				requestedURLs.push(url)
			}
			break;
		case 'Network.responseReceivedExtraInfo':
			const setCookies = params.headers['set-cookie'];
			if(setCookies){
				for(const line of setCookies.split('\n')){
					const cookie = parseSetCookieLine(line);
					httpCookiesNames.push(cookie.name);
				}
			}
			break;
		case 'WebView.setCookie':
			if(!params.removed && params.cause === 'explicit'){
				const cookie = {...params.cookie};
				if(cookie.expirationDate){
					cookie.expires = new Date(cookie.expirationDate * 1000).toISOString();
				}
				const hostname = params.documentURL ? new URL(params.documentURL).hostname : new URL(initialURL).hostname;
				cookie.thirdParty = !!cookie.domain
									&& (hostname.endsWith(cookie.domain) || cookie.domain.endsWith(hostname));
				webViewSetCookies.push(cookie);
			}
			break;
		}
	};

	if(requestedURLs.length > 0){
		for(const idx in requestedURLs){
			requestedURLs[idx] = new URL(requestedURLs[idx]);
		}
		for(const [group, hostnames] of Object.entries(hosts)){
			for(const hostname of hostnames){
				for(const url of requestedURLs){
					if(matches(url.hostname, hostname)){
						if(!badRequests[group]){
							badRequests[group] = [];
						}
						badRequests[group].push(url.toString());
					}
				}
			}
		}
	}

	if(Object.keys(badRequests).length > 0){
		issues.connections = badRequests;
	}

	for(const cookie of webViewSetCookies){
		if(!httpCookiesNames.includes(cookie.name)){
			cookie.javascript = true;
		}
	}

	const thirdPartyCookies = webViewSetCookies.filter(e => e.thirdParty || trackingCookies.includes(e.name))

	// TODO: include first party cookie like _ga
	if(thirdPartyCookies.length > 0){
		issues.cookies = thirdPartyCookies;
	}

	return issues;
}

function mergeCookies(httpCookies, webViewSetCookies){

}

function findMatch(urlString, timestamp){
	const url = new URL(urlString);
	const match = {
		host: null,
		requests: []
	};
	for(const [group, hostnames] of Object.entries(hosts)){
		for(const hostname of hostnames){
			if(matches(url.hostname, hostname)){
				if(!match.host){
					match.host = {
						name: hostname,
						group: group
					};
				}
				match.requests.push({
					url: urlString,
					timestamp: timestamp
				});
			}
		}
		if(match.host){
			/* no need to look for other groups */
			return match;
		}
	}
	return undefined;
}

function matches(urlHostname, hostname){
	if(urlHostname.indexOf(hostname) >= 0){
		return true;
	}
	if(hostname[0] === "."){
		hostname = hostname.slice(1);
		return urlHostname === hostname;
	}
	return false;
}

module.exports = analyzeCDPLogs