/**
 * This file is part of Minos
 *
 * Copyright (C) 2023 Giacomo Tesio <giacomo@tesio.it>
 *
 * Minos is a hack. You can use it according to the terms and
 * conditions of the Hacking License (see licenses/HACK.txt)
 */

const convertCDPtoHAR = (builderInfo, recordedEvents) => {
	const har = {
		log: {
			version: '1.2',
			creator: {
				name: builderInfo.productName ?? builderInfo.name,
				version: builderInfo.version
			},
			pages: [],
			entries: []
		}
	};

	const pages = groupEventsByPages(recordedEvents);
	har.log.pages = buildPages(pages);
	const pageIds = pageIdsByUrl(har.log.pages);
	for (const [documentURL, requests] of pages){
		const pageId = pageIds[documentURL];

		for(const request of requests){
			const requestId = request.requestId;
			const networkEvents = request.network;
			const fetchEvents = request.fetchEvents;
			const entry = buildEntry(requestId, networkEvents, pageId, fetchEvents);
			if(entry){
				har.log.entries.push(entry);
			}
		}
		har.log.entries.sort(byStartedDateTime);
	}
	/* *
	har.debug = {
		recordedEventsLength: recordedEvents.length,
		recordedEvents: recordedEvents,
		byPage: Object.fromEntries(pages)
	} ;
	/* */
	return har;
}

function byStartedDateTime(a, b){
	if(a.startedDateTime === b.startedDateTime){
		return 0;
	}
	if(a.startedDateTime > b.startedDateTime){
		return 1;
	}
	return -1
}

function buildEntry(requestId, networkEvents, pageId, fetchEvents){
	const requestWillBeSent = findEventParams('Network.requestWillBeSent', networkEvents);
	if(requestWillBeSent.request.url.indexOf('data:') === 0){
		/* ignore data: requests */
		return null;
	}
	const requestWillBeSentExtraInfo = findEventParams('Network.requestWillBeSentExtraInfo', networkEvents);
	const getRequestPostData = findEventParams('Network.getRequestPostData', networkEvents);
	const responseReceived = findEventParams('Network.responseReceived', networkEvents);
	const responseReceivedExtraInfo = findEventParams('Network.responseReceivedExtraInfo', networkEvents);
	const loadingFinished = findEventParams('Network.loadingFinished', networkEvents);
	const loadingFailed = findEventParams('Network.loadingFailed', networkEvents);

	const getResponseBody = findResponseBody(networkEvents, fetchEvents);
	const resourceChangedPriority = findEventParams('Network.resourceChangedPriority', networkEvents);

	const status = responseReceived.response?.status ?? responseReceivedExtraInfo.statusCode ?? 0; /* no response */
	const statusText = responseReceived.response?.statusText ?? httpStatusMap[status] ?? "";


	const wallTime = requestWillBeSent.wallTime * 1000;
	const finish = responseReceived.timestamp
				?? loadingFailed.timestamp
				?? requestWillBeSentExtraInfo.connectTiming?.requestTime /* on 30x redirect */
				?? requestWillBeSent.timestamp /* fallback to get a number anyway */;

	const httpVersion = computeHttpVersion(responseReceived.response?.protocol);

	const requestHeaders = mergeHeaders(requestWillBeSent.request.headers, requestWillBeSentExtraInfo.headers);
	const rawRequestLength = computeRawRequestLength(requestWillBeSent.request.method, requestWillBeSent.request.url, "HTTP/1.0", requestHeaders);

	const responseHeaders = mergeHeaders(responseReceived.response?.headers, responseReceivedExtraInfo.headers);
	const redirectURL = responseHeaders['location'] ?? ""; // required in schema

	const responseDataLength = computeResponseDataLength(networkEvents);

	const encoding = getResponseBody.base64Encoded ? 'base64' : undefined;
	const timings = buildEntryTimings(responseReceived.response?.timing, finish, requestWillBeSent.timestamp);
	const postData = buildPostData(requestWillBeSent, getRequestPostData);

	return {
		pageref: pageId,
		_requestId: requestId,
		_resourceType: requestWillBeSent.type,
		_initiator: requestWillBeSent.initiator,
		startedDateTime: new Date(wallTime).toISOString(),
		time: (finish - requestWillBeSent.timestamp) * 1000,
		request: {
			method: requestWillBeSent.request.method,
			url: requestWillBeSent.request.url,
			httpVersion,
			cookies: buildCookies(requestWillBeSentExtraInfo.associatedCookies),
			headers: buildHeaders(requestHeaders),
			queryString: buildQueryString(requestWillBeSent.request.url),
			headersSize: rawRequestLength,
			bodySize: 0,
			postData
		},
		response: {
			status,
			statusText,
			httpVersion,
			cookies: parseSetCookies(responseHeaders['set-cookie']),
			headers: buildHeaders(responseHeaders),
			redirectURL,
			headersSize: -1,
			bodySize: -1,
			content: {
				size: responseDataLength,
				mimeType: responseReceived.response?.mimeType ?? "text/html",
				text: getResponseBody.body,
				encoding
			}
		},
		cache: {},
		_fromDiskCache: false,
		timings,
		serverIPAddress: responseReceived.response?.remoteIPAddress,
		connection: `${responseReceived.response?.connectionId}`,
		_initiator: requestWillBeSent.initiator,
		_priority: resourceChangedPriority.newPriority ?? requestWillBeSent.request.initialPriority,
		_resourceType: requestWillBeSent.type
	};
}

function getPostData(requestWillBeSent, getRequestPostData){
	if(requestWillBeSent.request?.postData){
		return requestWillBeSent.request?.postData;
	}
	return getRequestPostData.postData;
}

function buildPostData(requestWillBeSent, getRequestPostData){
	const postData = getPostData(requestWillBeSent, getRequestPostData);
	if(postData){
		const requestHeaders = requestWillBeSent.request?.headers ?? {};
		const hdrMimeType = requestHeaders['content-type'] ?? requestHeaders['Content-Type'] ?? "application/x-www-form-urlencoded";
		const mimeType = hdrMimeType.indexOf(';') > -1 ? hdrMimeType.substring(0, hdrMimeType.indexOf(';')) : hdrMimeType;
		return {
			mimeType: mimeType,
			text: postData
		}
	}
	return undefined;
}

function buildQueryString(url){
	if(!url || url.indexOf('?') === -1 || url.indexOf('?') === url.length - 1){
		return [];
	}

	const result = [];
	const elements = url.substring(url.indexOf('?') + 1).split('&').map(x => x.split('='));
	for(const kvp of elements){
		result.push({
			name: kvp.shift(),
			value: kvp.length > 0 ? kvp[0] : ""
		});
	}
	return result;
}

function buildCookies(cookieList){
	const result = [];

	if(cookieList){
		for(const candidate of cookieList){
			if(candidate.blockedReasons.length === 0){
				const sameSite = candidate.cookie.sameSite;
				result.push({
					name: candidate.cookie.name,
					value: candidate.cookie.value,
					path: candidate.cookie.path,
					domain: candidate.cookie.domain,
					expires: new Date(candidate.cookie.expires * 1000).toISOString(),
					httpOnly: candidate.cookie.httpOnly,
					secure: candidate.cookie.secure,
					sameSite,

					/* Preserve debugging info in cookie */
					_sameParty: candidate.cookie.sameParty,
					_session: candidate.cookie.session,
					_size: candidate.cookie.size,
					_sourcePort: candidate.cookie.sourcePort,
					_sourceScheme: candidate.cookie.sourceScheme
				})
			}
		}
	}

	return result;
}

function parseSetCookies(setCookieHeaderValue){
	if(!setCookieHeaderValue){
		return [];
	}
	const result = [];

	const lines = setCookieHeaderValue.split('\n');
	for(const line of lines){
		result.push(parseSetCookieLine(line));
	}

	return result;
}

function parseSetCookieLine(line){
	const elements = line.split(';').map(x => x.trim())
	const nameAndValue = elements.shift().split('=');
	const name = nameAndValue.shift();
	const value = "" + nameAndValue.join('=');

	const result = {};
	for(const kvp of elements.map(x => x.split('='))){
		key = kvp.shift();
		switch(key){
			case "httponly":
				key = "httpOnly";
				break;
			case "samesite":
				key = "sameSite";
				break;
		}
		result[key] = kvp.length > 0 ? kvp.join('=') : true;
	}
	result["name"] = name;
	result["value"] = value;
	if(result["expires"]){
		result["expires"] = new Date(result["expires"]).toISOString()
	}
	if(!result["httpOnly"]){
		result["httpOnly"] = false;
	}

	return result;
}

function buildEntryTimings(timing, finish, requestTimeStamp){
	const result = {
		"blocked": -1,
		"dns": -1,
		"ssl": -1,
		"connect": -1,
		"send": -1,
		"wait": -1,
		"receive": -1
	}
	if(timing){
		let blocked = (timing.requestTime - requestTimeStamp) * 1000;
		if(timing.dnsStart > -1){
			blocked += timing.dnsStart;
		} else if(timing.connectStart > -1){
			blocked += timing.connectStart;
		} else if(timing.sendStart > -1){
			blocked += timing.sendStart;
		}
		if(blocked >= 0){
			result.blocked = blocked;
		}
		if(timing.dnsStart > -1 && timing.dnsEnd > -1){
			result.dns = timing.dnsEnd - timing.dnsStart;
		}
		if(timing.sslStart > -1 && timing.sslEnd > -1){
			result.ssl = timing.sslEnd - timing.sslStart;
		}
		if(timing.connectStart > -1 && timing.connectEnd > -1){
			result.connect = timing.connectEnd - timing.connectStart;
		}
		result.send = timing.sendEnd - timing.sendStart;
		result.wait = timing.receiveHeadersEnd - timing.sendEnd;
		result.receive = (finish - timing.requestTime) * 1000
	}
	return result;
}

function computeResponseDataLength(networkEvents){
	let length = 0;
	for(const event of networkEvents){
		if(event.method === 'Network.dataReceived'){
			length += event.params.dataLength;
		}
	}
	return length;
}

function computeHttpVersion(version){
	if(!version){
		version = "";
	}
	switch(version.toLowerCase()){
		case "h1":
		case "http/1.0":
			return "http/1.0";
		case "h11":
		case "http/1.1":
			return "http/1.1";
		case "h12":
		case "http/1.2":
			return "http/1.2";
		case "h2":
		case "http/2":
		case "http/2.0":
			return "http/2.0";
		case "h3":
		case "http/3":
		case "http/3.0":
			return "http/3.0";
		default:
			return "http/2.0"; // sane default for location redirects
	}
}

function computeRawRequestLength(method, url, protocol, headers) {
	const lines = [`${method} ${url} ${protocol}`];
	for (const name in headers) {
		lines.push(`${name}: ${headers[name]}`);
	}
	lines.push('', '');
	return lines.join('\r\n').length;
}


function mergeHeaders(fromRequest,fromExtraInfo){
	const headers = new Map();
	if(!fromRequest){
		fromRequest = {};
	}
	if(!fromExtraInfo){
		fromExtraInfo = {};
	}
	for(const name in fromRequest){
		headers.set(name.toLowerCase(), fromRequest[name]);
	}
	for(const name in fromExtraInfo){
		headers.set(name.toLowerCase(), fromExtraInfo[name]);
	}
	return Object.fromEntries(headers);
}

function buildHeaders(headers){
	const result = [];
	for(const name in headers){
		if(name === "set-cookie" && headers[name].indexOf('\n') > -1){
			const values = headers[name].split('\n');
			for(const v of values){
				result.push({
					"name": name,
					"value": v
				});
			}
		} else {
			result.push({
				"name": name,
				"value": headers[name]
			});
		}
	}
	return result;
}

function pageIdsByUrl(pages){
	const result = {};
	for(const page of pages){
		result[page.title] = page.id;
	}
	return result;
}

function groupEventsByPages(recordedEvents){
	const requestsMap = new Map();
	const pageEventMap = new Map();
	const fetchMap = new Map();
	const redirects = [];
	let recordingIndex = 0;
	for(const req of recordedEvents){

		/* used to locate nearby events */
		req.params.recordingIndex = recordingIndex++;

		if(req.method.indexOf('Page.') === 0){
			const documentURL = req.params.documentURL;
			if(!pageEventMap.has(documentURL)){
				pageEventMap.set(documentURL, []);
			}
			const pageEvents = pageEventMap.get(documentURL);
			pageEvents.push(req);
		} else if(req.method.indexOf('Network.') === 0) {
			const requestId = req.params.requestId;
			if(!requestsMap.has(requestId)){
				requestsMap.set(requestId, []);
			}
			if(req.params.headers?.location){
				if(!redirects.includes(requestId)){
					redirects.push(requestId);
				}
			}
			const requests = requestsMap.get(requestId);
			requests.push(req);
		} else if(req.method.indexOf('Fetch.') === 0) {
			const requestId = req.params.requestId;
			if(!fetchMap.has(requestId)){
				fetchMap.set(requestId, []);
			}
			const fetchEvents = fetchMap.get(requestId);
			fetchEvents.push(req);
		}
	}

	/* Chromium mixes redirects with actual request: try to distinguish them */
	for(const requestId of redirects){
		const requests = requestsMap.get(requestId);
		const actualRequest = [];
		for(let i = requests.length - 1; i >= 0; --i){
			const event = requests[i];
			if(event.params.headers?.location){
				break;
			}
			actualRequest.unshift(event);
		}
		requests.splice(-actualRequest.length);

		let redirect = [];
		let redirectIndex = 0;
		for(const ev of requests){
			if(ev.method === 'Network.requestWillBeSent'){
				if(redirect.length > 0){
					requestsMap.set(redirect[0].params.requestId, redirect);
				}
				redirect = [];
				redirectIndex++;
			}
			ev.params.requestId += "_redirect_" + redirectIndex;
			redirect.push(ev);
		}
		if(redirect.length > 0){
			requestsMap.set(redirect[0].params.requestId, redirect);
		}
		requestsMap.set(actualRequest[0].params.requestId, actualRequest);
	}

	/* The Fetch domain uses a different "requestId" from Network domain.
	 * The Network domain's "requestId" is only available in Fetch.requestPaused
	 * event, so we need to remap each group of Fetch's event with the Network's id
	 */
	const fetchEventsByNetworkRequestId = new Map();
	for(const [fetchReqID, events] of fetchMap){
		const requestPaused = events.find(f => f.method === 'Fetch.requestPaused');
		let networkRequestId = requestPaused.params.networkId;
		if(!networkRequestId){
			/* suspiciously, Chrome omits some Network.requestWillBeSent AND
			 * omits networkId from the corresponding Fetch.requestPaused
			 * VERY annoying bug that the Chromium team (aka Google) WONT FIX
			 * https://bugs.chromium.org/p/chromium/issues/detail?id=750469
			 */
			const correspondingResponse = lookupNearBy(requestPaused, recordedEvents,
				x => x.params.response?.url === requestPaused.params.request.url
				  && x.method === "Network.responseReceived"
				  && x.params.frameId === requestPaused.params.frameId);
			if(correspondingResponse){
				networkRequestId = correspondingResponse.requestId;
				for(const ev of events){
					ev.params.networkId = correspondingResponse.requestId;
				}

				const simulatedRequestWillBeSent = simulateRequestWillBeSent(requestPaused, correspondingResponse, recordedEvents);
				if(!pageEventMap.has(simulatedRequestWillBeSent.params.documentURL)){
					/* worst case: we can't find the documentURL but we need a Page */
					pageEventMap.set(simulatedRequestWillBeSent.params.documentURL, [
						{
							method: "Page.neverHappened", /* to mark this syntetic event */
							params: {
								documentURL: simulatedRequestWillBeSent.params.documentURL,
								timestamp: simulatedRequestWillBeSent.params.timestamp,
								frameId: simulatedRequestWillBeSent.params.frameId,
								loaderId: simulatedRequestWillBeSent.params.loaderId
							}
						}
					]);
				}

				const destination = requestsMap.get(simulatedRequestWillBeSent.params.requestId);
				destination.unshift(simulatedRequestWillBeSent);
			}
		}

		fetchEventsByNetworkRequestId.set(networkRequestId, events);
	}

	const pages = new Map();
	for(const [reqID, req] of requestsMap){
		//console.log(">>> ", reqID, req.length);
		for(const event of req){
			//console.log(event);
			const documentURL = event.params.documentURL
			if(documentURL){
				if(!pages.has(documentURL)){
					pages.set(documentURL, []);
				}
				const page = pages.get(documentURL);
				page.push({
					requestId: reqID,
					network: req,
					pageEvents: pageEventMap.get(documentURL) ?? [],
					fetchEvents: fetchEventsByNetworkRequestId.get(reqID) ?? []
				});
				break;
			}
		}
	}
	return pages;
}

function lookupBefore(event, recordedEvents, condition, extraction){
	const beforeEvent = recordedEvents.slice(0, event.recordingIndex);
	const found = beforeEvent.findLast(condition);
	if(found){
		return extraction(found);
	}

	return undefined;
}

function lookupAfter(event, recordedEvents, condition, extraction){
	const afterEvent = recordedEvents.slice(event.recordingIndex);
	const found = afterEvent.find(condition);
	if(found){
		return extraction(found);
	}
	return undefined;
}

function lookupNearBy(event, recordedEvents, condition, extraction){
	/* we start looking after event because... looks like it's usually what we need
	 */
	if(!extraction){
		extraction = x => x;
	}
	const after = lookupAfter(event, recordedEvents, condition, extraction);
	if(after){
		return extraction(after);
	}
	const before = lookupBefore(event, recordedEvents, condition, extraction);
	if(before){
		return extraction(before);
	}
	return undefined;
}

function simulateRequestWillBeSent(requestPaused, correspondingResponse, recordedEvents){
	let documentURL;

	/* to locate the documentUrl we look in the recorded events following the response
	 * for a Page.frameStoppedLoading with the same frameId...
	 */
	const frameStoppedLoadingURL = lookupAfter(requestPaused, recordedEvents,
		x => x.method === "Page.frameStoppedLoading"
		  && x.params.frameId === requestPaused.params.frameId,
		x => x.params.documentURL);
	if (frameStoppedLoadingURL){
		documentURL = frameStoppedLoadingURL;
	} else {
		const requestWillBeSentURL = lookupBefore(requestPaused, recordedEvents,
			x => x.method === 'Network.requestWillBeSent'
			  && x.params.frameId === requestPaused.params.frameId
			  && x.params.loaderId === requestPaused.params.loaderId,
			x => x.params.documentURL);
		if (requestWillBeSentURL){
			documentURL = requestWillBeSentURL;
		} else {
			// last choice: we couldn't find anything better but we cannot miss the documentUrl
			documentURL = correspondingResponse.params.request.url
		}
	}

	return {
		method: "Network.requestWillBeSent",
		params: {
			documentURL: documentURL,
			frameId: requestPaused.params.frameId,
			loaderId: correspondingResponse.params.loaderId,
			hasUserGesture: false,
			redirectHasExtraInfo: false,
			request: requestPaused.params.request,
			requestId: correspondingResponse.params.requestId,
			type: requestPaused.params.resourceType,
			timestamp: correspondingResponse.params.response.timing.requestTime,
			wallTime: (correspondingResponse.params.response.responseTime / 1000) - (correspondingResponse.params.timestamp - correspondingResponse.params.response.timing.requestTime),

			_note: `This Network event had to be reconstructed from nearby events. Ask Google why they WONT-FIX this https://bugs.chromium.org/p/chromium/issues/detail?id=750469`
		}
	}
}

function buildPages(pages) {
	let i = 0;
	const result = [];

	for (const [documentURL, requests] of pages){
		result.push(analyzePage(documentURL, requests));
	}
	result.sort(byStartedDateTime);
	for (const pageId in result){
		result[pageId].id = "page_" + pageId;
	}

	return result;
}

function analyzePage(documentURL, requests){
	const requestWillBeSent = findEventParams('Network.requestWillBeSent', requests[0].network)
	const wallTime = requestWillBeSent.wallTime * 1000;

	const pageTimings = {
		onContentLoad: 0,
		onLoad: 0
	}
	const domContentEventFired = findEventParams('Page.domContentEventFired', requests[0].pageEvents);
	if(domContentEventFired.timestamp){
		pageTimings.onContentLoad = (domContentEventFired.timestamp - requestWillBeSent.timestamp) * 1000 ;
	} else {
		const firstResponseReceived = findEventParams('Network.responseReceived', requests[0].network);
		if(firstResponseReceived.timestamp){
			pageTimings.onContentLoad = (firstResponseReceived.timestamp - requestWillBeSent.timestamp) * 1000 ;
		}
	}

	const loadEventFired = findEventParams('Page.loadEventFired', requests[0].pageEvents);
	if(loadEventFired.timestamp){
		pageTimings.onLoad = (loadEventFired.timestamp - requestWillBeSent.timestamp) * 1000;
	} else {
		const loadingFinished = findEventParams('Network.loadingFinished', requests[0].network);
		if(loadingFinished.timestamp){
			pageTimings.onContentLoad = (loadingFinished.timestamp - requestWillBeSent.timestamp) * 1000 ;
		}
	}

	return {
		title: documentURL,
		startedDateTime: new Date(wallTime).toISOString(),
		pageTimings
	};
}

function findResponseBody(networkEventList, fetchEventList){
	if(networkEventList){
		for(let i = networkEventList.length - 1; i >= 0; --i){
			const event = networkEventList[i];
			if(event.method === 'Network.getResponseBody' && event.params.body){
				return event.params;
			}
		}
	}
	if(fetchEventList){
		for(let i = fetchEventList.length - 1; i >= 0; --i){
			const event = fetchEventList[i];
			if(event.method === 'Fetch.getResponseBody' && event.params.body){
				return event.params;
			}
		}
	}
	return {};
}

function findEventParams(eventName, eventList){
	if(eventList){
		for(const event of eventList){
			if(event.method === eventName){
				return event.params;
			}
		}
	}
	return {};
}

const httpStatusMap = {
	100: "Continue",
	101: "Switching Protocols",
	200: "OK",
	201: "Created",
	202: "Accepted",
	203: "Non-Authoritative Information",
	204: "No Content",
	205: "Reset Content",
	206: "Partial Content",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	303: "See Other",
	304: "Not Modified",
	305: "Use Proxy",
	306: "",
	307: "Temporary Redirect",
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	407: "Proxy Authentication Required",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	412: "Precondition Failed",
	413: "Payload Too Large",
	414: "URI Too Long",
	415: "Unsupported Media Type",
	416: "Range Not Satisfiable",
	417: "Expectation Failed",
	418: "I'm a teapot",
	426: "Upgrade Required",
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Time-out",
	505: "HTTP Version Not Supported",
	102: "Processing",
	207: "Multi-Status",
	226: "IM Used",
	308: "Permanent Redirect",
	422: "Unprocessable Entity",
	423: "Locked",
	424: "Failed Dependency",
	428: "Precondition Required",
	429: "Too Many Requests",
	431: "Request Header Fields Too Large",
	451: "Unavailable For Legal Reasons",
	506: "Variant Also Negotiates",
	507: "Insufficient Storage",
	511: "Network Authentication Required"
}

module.exports = convertCDPtoHAR;