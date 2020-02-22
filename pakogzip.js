//trying to generate a gzip-compressed file, useless for now

var pako = window.pako;
function compressRaw(rawogz){
	gzipdata = pako.gzip(rawogz, { level: 6 });
	download(gzipdata);
	/*try {
		gzipdata = pako.gzip(rawogz, { to: 'string' });
	} finally {
		ogzip = "";
		try {
			for (c = 0; c < gzipdata.length; c++){
				ogzip += gzipdata.charCodeAt(c).toString(16);
			}
		} finally {
			download(hexBtify(ogzip));
		}
	}*/
}