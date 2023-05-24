function Page(url, options){
	this._options = options;
	this._responseBodyCounter = 0;
	this.url = url;
	this.firstRequestId = undefined;
	this.firstRequestMs = undefined;
	this.domContentEventFiredMs = undefined;
	this.loadEventFiredMs = undefined;
	this.entries = new Map();
}
