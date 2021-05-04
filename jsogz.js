/* JS object to .OGZ translator by @SalatielSauer. */

/*
Converters
These functions handle the conversion of text to hexadecimal, and also
from hexadecimal to an array of bytes, later compressed with gzip.
*/
function floatHex(val) {
	const getHex = i => ("00" + i.toString(16)).slice(-2)
	var view = new DataView(new ArrayBuffer(4))
	view.setFloat32(0, val)
	return Array.apply(null, {length: 4}).map((_, i) => getHex(view.getUint8(i))).reverse().join("")
}

function intHex(val, byte) {
	val = parseInt(val)
	return val.toString(16).padStart(byte, "0").match(/.{2}/g).reverse().join("")
}

function strHex(val) {
	return val.split("").reduce((hex,c)=>hex+=c.charCodeAt(0).toString(16).padStart(2,"0"),"")
}

function hextoByte(val) {
	return new Uint8Array(val.match(/.{2}/g).map(e=> parseInt(e, 16)))
}

function getCubeIndex(x, y, z, gridpower) {
	let index = 0
	index += parseInt((x / (1<<gridpower)).toString(2), 8)
	index += parseInt((y / (1<<gridpower)).toString(2), 8) * 2
	index += parseInt((z / (1<<gridpower)).toString(2), 8) * 4
	return index
}

function getCubePos(index, gridpower) {
	let octal = index.toString(8)
	let position = [0, 0, 0]
	for (var i = 0; i < octal.length; i++) {
		let digit = parseInt(octal[octal.length - i - 1], 8)
		position[0] += (Math.floor(digit / 1) % 2) * (2 ** i) * (1<<gridpower)
		position[1] += (Math.floor(digit / 2) % 2) * (2 ** i) * (1<<gridpower)
		position[2] += (Math.floor(digit / 4) % 2) * (2 ** i) * (1<<gridpower)
	}
	return position
}

/*
Formatters
Uses the converters to format the arguments in hexadecimal before concatenating them
*/
function formathead(worldsize, numents, numpvs, lightmaps, blendmap, numvars) {
	var rawheaddata = "4f4354411d00000024000000"
	for (var i = 0; i < arguments.length; i++) {
		rawheaddata += intHex(arguments[i], 8)
	}
	return rawheaddata
}

// gameident: 03666707300 // not implemented

function formatvar(type, id, val) {
	return intHex(type, 2) + intHex(id.length, 4) + strHex(id) + intHex(val.length, 4) + strHex(val)
}

// extras: 00000000 // not implemented
// texture mru: 050002000400030005000700 // not implemented

var entitiesarray = ["entempty", "light", "mapmodel", "playerstart", "envmap", "particles", "sound", "spotlight", "gamespecific"]
function formatent(xyz, attrs, type) {
	var type = entitiesarray.filter(c=> {if (type.match(c)) {return c}})[0]
	var xyz = xyz.split(" ")
	var attrs = attrs.split(" ")
	if (entitiesarray.indexOf(type) == -1){type = "entempty"}
	return floatHex(xyz[0]) + floatHex(xyz[1]) + floatHex(xyz[2]) + intHex(attrs[0], 4) + intHex(attrs[1], 4) + intHex(attrs[2], 4) + intHex(attrs[3], 4) + intHex(attrs[4], 4) + intHex(entitiesarray.indexOf(type), 2) + "00"
}

var geometryarray = ["children", "empty", "solid", "normal", "lodcube"]
//var materialsarray = ["air", "water", "lava", "glass", "noclip", "clip", "gameclip", "death", "alpha"]
var lastTextures = [1, 1, 1, 1, 1, 1]
function formatoctree(cube) {
	var cubetype = cube
	if (typeof cube == "object") {
		cubetype = Object.keys(cube)[0]
		cube = cube[Object.keys(cube)[0]]
	}

	var texturesraw = ""
	switch(cubetype) {
		case "children": return "00"; break;
		case "empty":
		case "solid":
		case "normal":
		case "lodcube":
			var textures = lastTextures
			var allfaces = 0
			if (cube.textures) {
				lastTextures = textures = cube.textures.split(" ").map(i=>{return parseInt(i)})
			}
			if (cube.allfaces) {
				lastTextures = textures = Array(6).fill(textures[0])
			}
			textures.forEach(tex=> {
				texturesraw += intHex(tex, 4)
			})

			// default value for "mask" because I still have no idea how it works
			var mask = 0

			return intHex(geometryarray.indexOf(cubetype), 2) + texturesraw + intHex(mask, 2)
		break
	}	
}

function readOctree(octree, callback) {
	var data = ""
	var index = 0
	function readChildren(child) {
		child = child.concat(Array(8-child.length).fill("empty"))
		child.forEach(cube=>{
			if (Array.isArray(cube)) {
				data += formatoctree("children")
				readChildren(cube)
			} else {
				data += formatoctree(cube)
			}
			index+=1
		})
	}
	readChildren(octree)
	callback(data)
}

/* examples
formathead(1024, 1, 0, 0, 0, 1)
formatvar(2, "skybox", "ik2k/env/iklake")
formatent("972 972 516", "336 0 0 0 0", 3)
formatoctree({"solid": {"textures": "1 2 3 4 5 6"}})
*/

function getobjkeys(obj) {return obj ? Object.keys(obj) : []}

function JSOGZ(inputdata, outputformat, error) {
	if (typeof inputdata == "string") {
		for (var e = 0; e < entitiesarray.length; e++) {
			enttype = new RegExp(entitiesarray[e], "g")
			inputdata = inputdata.replace(enttype, et=>{return et+e++})
		}
		try {
			inputdata = JSON.parse(inputdata)
		} catch (e) {if (error) error(e); return}
	}

	var mapdata = ""

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
	var geometry = inputdata.geometry ? inputdata.geometry : []
	readOctree(geometry, octree=>{
		mapdata += octree
	})

	switch(outputformat) {
		case 0: default: return mapdata; break; 
		case 1: return hextoByte(mapdata); break;
		case 2: 
			if (window.pako) return window.pako.gzip(hextoByte(mapdata))
			console.log("%c pako not found, you need it to get the data in .ogz format: https://github.com/nodeca/pako", "color: red")
		break;
	}
}
