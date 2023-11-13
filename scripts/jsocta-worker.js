importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js', './jsocta.js', './mini-jsocta.js');

function getJSOCTAVersion(object) {
	switch(object.version || 2) {
		case 1: return OctaMap;
		case 2: return QuickOGZ;
	};
}

function isAlreadyObject(content) {
    return typeof content === 'object' && content !== null && !Array.isArray(content);
}

const fileImport = {};
self.onmessage = async (event) => {
	let message = event.data;
	let skipInitialization = false;

	switch(message.type) {
		case 1:
			// prevents RangeError when trying to add cubes outside the map boundaries
			fileImport.JSOCTA.mapsize *= 2;
			skipInitialization = true;
		case 0:
			try {
				if (!skipInitialization) {
					postMessage({'type': 0, 'body': 'Reading JSON data..'});
					if (!isAlreadyObject(message.body.content)) {
						fileImport.JSON = JSON.parse(message.body.content.replace(/,\s*([\]}])/g, '$1'));
					} else {
						fileImport.JSON = message.body.content;
					}

					let JSOCTA = getJSOCTAVersion(fileImport.JSON);

					postMessage({'type': 0, 'body': 'Writing OGZ data..'});
					fileImport.JSOCTA = new JSOCTA(fileImport.JSON.map || fileImport.JSON);
				}
				//console.time("WrittingOGZ");
				let OCT = fileImport.JSOCTA.getByteArray();
				//console.timeEnd("WrittingOGZ");
				postMessage({'type': 0, 'body': 'Compressing OGZ data..'});
				fileImport.GZIP = pako.gzip(OCT);
				
			  	postMessage({'type': 1, 'body': {'fileImport': fileImport}});
			} catch (error) {
				postMessage({'type': -1, 'body': error});
			}
		  	break;
	}
};