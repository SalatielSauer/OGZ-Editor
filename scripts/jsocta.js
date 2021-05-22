/*
	JSOCTA - Write Cube 2 Sauerbraten maps using JSON.
	by @SalatielSauer, licensed under ZLIB (https://www.zlib.net/zlib_license.html)
*/

const dataTypes = {
	mapvar: ["integer", "float", "string"],
	entity: [
		"none?", "light", "mapmodel", "playerstart", "envmap", "particles", "sound", "spotlight",
		"shells", "bullets", "rockets", "riflerounds", "grenades", "cartridges",
		"health", "healthboost", "greenarmour", "yellowarmour", "quaddamage",
		"teleport", "teledest",
		"monster", "carrot", "jumppad",
		"base", "respawnpoint",
		"box", "barrel",
		"platform", "elevator",
		"flag"
	],
	octree: ["children", "empty", "solid", "normal", "lodcube"]
};

class OctaMap {
	constructor(object) {
		this.gzip = (typeof window != "undefined" && typeof window.pako != "undefined") ? window.pako.gzip : ""
		this.mapvars = object.mapvars || {"maptitle": "Untitled map by Unknown"}
		this.entities = object.entities || []
		this.octree = object.geometry || []
		this.header = {
			magic: "OCTA",
			version: 29,
			headersize: 36,
			worldsize: object.mapsize || 1024,
			numents: this.entities.length,
			numpvs: 0,
			lightmaps: 0,
			blendmap: 0,
			numvars: Object.keys(this.mapvars).length
		};
 
		Object.keys(this.header).forEach((key)=>{
			this.header[key] = (getTypeofVar(this.header[key]) == "string") ? _strtoHex(this.header[key]) : _inttoHex(this.header[key], 8)
		})

		// things that are unlikely to change
		// gameident ("fps"), extraentinfosize, MRU textures
		this.extra = "036670730000000000050002000400030005000700";

		new OctaMapvars(this.mapvars).read((data)=>{this.mapvars = data})
		new OctaEntities(this.entities).read((data)=>{this.entities = data})
		new OctaGeometry(this.octree).read((data)=>{this.octree = data})
	}

	getString(callback) {
		return callback(
			Object.values(this.header).join("") +
				this.mapvars +
				this.extra +
				this.entities +
				this.octree
		)
	}

	getByteArray(callback) {
		this.getString((string) => {
			return callback(
				_hextoByte(string)
			)
		})
	}

	getOGZ(callback) {		
		this.getByteArray((array) => {
			if (this.gzip) {
				return callback(this.gzip(array))
			}
			callback(array)
			throw "unable to compress octa, no gzip function available (https://github.com/nodeca/pako), returning ByteArray.";
		})
	}
}

class OctaMapvars {
	constructor(object) {
		this.object = object;
		this.data = "";
	}

	format(mapvar, callback) {
		// treats array values as RGB and converts it to decimal
		if (typeof mapvar.value == "object") {
			mapvar.value = _rgbtoInt(mapvar.value)
		}
		mapvar.type = getTypeofVar(mapvar.value)
		// int/float: type + name length + name + value
		//   string: type + name length + name + value length + value
		return callback(
			_inttoHex(dataTypes.mapvar.indexOf(mapvar.type), 2) +
			_inttoHex(mapvar.name.length, 4) +
			_strtoHex(mapvar.name) + (
				(mapvar.type == "integer") ? _inttoHex(mapvar.value, 8) :
				(mapvar.type == "float") ? _floattoHex(mapvar.value) :
				_inttoHex(mapvar.value.length, 4) + _strtoHex(mapvar.value)
			)
		)
	}

	get(callback) {
		for (let key of Object.keys(this.object)) {
			callback({name: key, value: this.object[key]})
		}
	}

	read(callback) {
		this.get((mapvar)=>{
			this.format(mapvar, (data)=>{
				this.data += data;
			})
		})
		callback(this.data)
	}
}

class OctaEntities {
	constructor(array) {
		this.array = array;
		this.data = "";
	}

	format(entity, callback) {
		entity.position = entity.position || [512, 512, 512]
		entity.attributes = entity.attributes || ["mapmodel", 0, 0, 0, 0, 0]
		entity.type = (dataTypes.entity.includes(entity.attributes[0])) ? dataTypes.entity.indexOf(entity.attributes[0]) : 0;

		return callback(
			// position + attributes + type
			entity.position
				.map((coordinate) => _floattoHex(coordinate)).join("") +
			entity.attributes.slice(1)
				.map((attribute) => _inttoHex((typeof attribute == "object") ? _rgbtoShortHex(attribute) : attribute, 4)).join("") +
			_inttoHex(entity.type, 4)
		);
	}

	get(callback) {
		for (let entity of this.array) {
			callback(entity);
		}
	}

	read(callback) {
		this.get((entity) => {
			this.format(entity, (data) => {
				this.data += data;
			});
		});
		callback(this.data);
	}
}

class OctaGeometry {
	constructor(array) {
		this.depth = 0;
		this.array = array;
		this.data = "";
		this.lasttexture = 1;
	}

	format(cube, callback, properties = {}) {
		if (typeof cube == "object") {
			for (let key in cube) {
				this.format(key, callback, cube[key]);
			}
			return;
		} else {
			if (!properties.textures) {
				properties.textures = [];
			}
			// inherits the last texture of the last cube if there is none
			this.lasttexture = properties.textures[properties.textures.length - 1] || this.lasttexture;
			properties.textures = properties.textures.concat(
				Array(6 - properties.textures.length).fill(this.lasttexture)
			);
		}

		switch (cube) {
			case "children":
				return callback("00"); // subdivide child
			case "empty":
			case "solid":
			case "normal":
			case "lodcube":
				return callback(
					// type + texture + mask
					_inttoHex(dataTypes["octree"].indexOf(cube), 2) +
					properties.textures.map((tex) => _inttoHex(tex, 4)).join("") +
					_inttoHex(properties.mask || 0, 2)
				);
				break;
		}
	}

	get(callback) {
		// fill undefined children with empty cubes
		this.array = this.array.concat(Array(8 - this.array.length).fill("empty"));
		for (let cube of this.array) {
			if (Array.isArray(cube)) {
				callback("children");
				this.array = cube;
				this.get(callback); // get children recursively
			} else {callback(cube)}
		};
	}

	read(callback) {
		this.get((cube) => {
			this.format(cube, (data) => {
				this.data += data;
			});
		});
		callback(this.data);
	}

	insert(child, start, end, maxdepth) {
		if (this.depth < maxdepth) {
			this.array = this.array[start] = [];
			this.depth += 1;
			return this.insert(child, 0, end, maxdepth);
		}
        this.array[end] = child;
	}
}

try {
	module.exports = {
		Map: OctaMap,
		Mapvars: OctaMapvars,
		Entities: OctaEntities,
		Geometry: OctaGeometry
	}
} catch (error) {}

function _floattoHex(val) {
	var getHex = i => ("00" + i.toString(16)).slice(-2)
	var view = new DataView(new ArrayBuffer(4))
	view.setFloat32(0, val)
	return Array.apply(null, {length: 4}).map((_, i) => getHex(view.getUint8(i))).reverse().join("")
}
function _inttoHex(val, byte) {
	return parseInt(val).toString(16).padStart(byte, "0").match(/.{2}/g).reverse().join("");
}
function _strtoHex(val) {
	return val.split("").reduce((hex,c)=>hex+=c.charCodeAt(0).toString(16).padStart(2,"0"),"");
}
function _hextoByte(val) {
	return new Uint8Array(val.match(/.{2}/g).map(e=> parseInt(e, 16)));
}
function _rgbtoInt(array) {
	return array[0] * (256*256) + array[1] * 256 + array[2];
}
function _rgbtoHex(array) {
	return ((1 << 24) + (array[0] << 16) + (array[1] << 8) + array[2]).toString(16).slice(1);
}
function _rgbtoShortHex(array) {
	return "0x" + _rgbtoHex([Math.round(array[0]/17), Math.round(array[1]/17), Math.round(array[2]/17)]).slice(1).replace(/(.{1})./g, "$1").toUpperCase();
}
function getTypeofVar(val) {
	return ((typeof val) == "number") ? (val == 0 || val%1 == 0) ? "integer" : "float" : "string";
}
