/* JS object to .OGZ translator by @SalatielSauer. */

/*
Converters
These functions handle the conversion of text to hexadecimal, and also
from hexadecimal to an array of bytes, later compressed with gzip.
*/
function floatHex(val){
	const getHex = i => ('00' + i.toString(16)).slice(-2);
	var view = new DataView(new ArrayBuffer(4));
	view.setFloat32(0, val);
	return Array.apply(null, { length: 4 }).map((_, i) => getHex(view.getUint8(i))).reverse().join('');
}

function intHex(val, byte){
	val = parseInt(val);
	return val.toString(16).padStart(byte, '0').match(/.{2}/g).reverse().join('')
}

function strHex(val){
	return val.split("").reduce((hex,c)=>hex+=c.charCodeAt(0).toString(16).padStart(2,"0"),"")
}

function hextoByte(val){
	return new Uint8Array(val.match(/.{2}/g).map(e => parseInt(e, 16)));
}

/*
Formatters
Uses the converters to format the arguments in hexadecimal before concatenating them
*/
function formathead(worldsize, numents, numpvs, lightmaps, blendmap, numvars){
	rawheaddata = "4f4354411d00000024000000"
	try {
		for (i = 0; i < arguments.length; i++){rawheaddata += intHex(arguments[i], 8)}
	} finally {return rawheaddata;}
}

// gameident: 03666707300 // not implemented

function formatvar(type, id, val) {
	return intHex(type, 2) + intHex(id.length, 4) + strHex(id) + intHex(val.length, 4) + strHex(val);
}

// extras: 00000000 // not implemented
// texture mru: 050002000400030005000700 // not implemented

entitiesarray = ["empty", "light", "mapmodel", "playerstart", "envmap", "particles", "sound", "spotlight", "gamespecific"]
function formatent(xyz, attrs, type) {
	type = entitiesarray.filter(c=> {if (type.match(c)) {return c}})[0]
	xyz = xyz.split(" ")
	attrs = attrs.split(" ")
	if (entitiesarray.indexOf(type) == -1){type = "empty";}
	return floatHex(xyz[0]) + floatHex(xyz[1]) + floatHex(xyz[2]) + intHex(attrs[0], 4) + intHex(attrs[1], 4) + intHex(attrs[2], 4) + intHex(attrs[3], 4) + intHex(attrs[4], 4) + intHex(entitiesarray.indexOf(type), 2) + "00";
}

function formatoctree(type, textures, mask){
	textures = textures.split(" ");
	textureraw = "";
	try {
		for (t = 0; t < textures.length; t++){textureraw += intHex(textures[t], 2) + "00"};
	} finally {
		return intHex(type, 2) + textureraw + intHex(mask, 2)
	}
}

/* examples
formathead(1024, 1, 0, 0, 0, 1);
formatvar(2, "skybox", "ik2k/env/iklake")
formatent("972 972 516", "336 0 0 0 0", 3)
formatoctree(2, "2 3 4 5 6 7", 0)
*/

function getobjkeys(obj) {return obj ? Object.keys(obj) : []}

function getOGZ(inputdata, outputformat, error) {
	if (typeof inputdata == "string") {
		for (var e = 0; e < entitiesarray.length; e++) {
			enttype = new RegExp(entitiesarray[e], "g")
			inputdata = inputdata.replace(enttype, et=>{return et + e++})
		}
		try {
			inputdata = JSON.parse(inputdata)
		} catch (e) {if (error) error(e); return}
	}

	mapdata = ""

	// header
	mapdata += formathead(inputdata.mapsize||1024, getobjkeys(inputdata.entities).length, 0, 0, 0, getobjkeys(inputdata.mapvars).length)

	// mapvars
	for (var key of getobjkeys(inputdata.mapvars)) {
		mapdata += formatvar(2, key, inputdata.mapvars[key])
	}

	// gameident
	mapdata += "0366707300"

	// extras(?) & texture mru
	mapdata += "00000000" + "050002000400030005000700"

	// entities
	for (var key of getobjkeys(inputdata.entities)) {
		mapdata += formatent(inputdata.entities[key].position, inputdata.entities[key].attributes, key)
	}

	// octree
	mapdata += formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0)
	mapdata += formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0)

	switch(outputformat) {
		case 0: default: return mapdata; break; 
		case 1: return hextoByte(mapdata); break;
		case 2: 
			if (pako) return pako.gzip(hextoByte(mapdata));
			console.log("%c pako not found, you need it to get the data in .ogz format: https://github.com/nodeca/pako", "color: red")
		break;
	}
}
