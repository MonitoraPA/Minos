function Page(url){
	this._responseBodyCounter = 0;
	this.url = url;
	this.firstRequestId = undefined;
	this.firstRequestMs = undefined;
	this.domContentEventFiredMs = undefined;
	this.loadEventFiredMs = undefined;
	this.entries = new Map();
}
