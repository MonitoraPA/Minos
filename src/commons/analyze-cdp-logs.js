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
const parseSetCookieLine = require("./parse-set-cookie");

function analyzeCDPLogs(collectedEvents, initialURL){
	const issues = {};
	const badRequests = [];
	const httpCookiesNames = [];
	const webViewSetCookies = [];
	for (const {method, params} of collectedEvents){
		switch(method){
		case 'Network.requestWillBeSent':
			const {url} = params.request;
			let timestamp = 0;
			try{
				timestamp = new Date(params.wallTime * 1000).toISOString();
			} catch (err){
				console.error('timestamp', timestamp, err);
				console.log(params);
			}
			const match = findLongestMatch(url, timestamp);
			if (match !== undefined){
				badRequests.push(match);
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
	if(badRequests.length > 0){
		issues.connections = badRequests;
	}

	for(const cookie in webViewSetCookies){
		if(!httpCookiesNames.includes(cookie.name)){
			cookie.javascript = true;
		}
	}

	const thirdPartyCookies = webViewSetCookies.filter(e => e.thirdParty)

	// TODO: include first party cookie like _ga
	if(thirdPartyCookies.length > 0){
		issues.cookies = thirdPartyCookies;
	}

	return issues;
}

function mergeCookies(httpCookies, webViewSetCookies){

}

function findLongestMatch(urlString, timestamp){
	const url = new URL(urlString);
	let match = undefined;
	for(const [group, hostnames] of Object.entries(hosts)){
		for(const hostname of hostnames){
			if(matches(url.hostname, hostname)){
				if(match === undefined) {
					match = {
						requestCount: 1,
						url: urlString,
						timestamp: timestamp,
						host: {
							name: hostname,
							group: group
						}};
				} else {
					if(hostname.length > match.host.name){ // take only the longest matching host
						match.host.name = hostname;
						match.host.group = group;
					}
					match.requestCount++;
				}
			}
		}
		if(match){
			/* no need to look for other groups */
			break;
		}
	}
	return match;
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