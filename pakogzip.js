//encodes plain text as hexadecimal and converts to .ogz using gzip

var pako = window.pako;
function compressRaw(rawogz){
	var byteArray = new Uint8Array(rawogz.match(/.{2}/g).map(e => parseInt(e, 16)));
	gzipdata = pako.gzip(byteArray);
	download(gzipdata);
}