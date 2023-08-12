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
	octree: ["children", "empty", "solid", "normal", "lodcube"],
	faces: [
		{name: "front", edgepos: [2, 3, 0, 1], facepos: [1, 3, 5, 7]},
		{name: "back", edgepos: [3, 2, 1, 0], facepos: [0, 2, 4, 6]},
		{name: "right", edgepos: [2, 0, 3, 1], facepos: [8, 10, 12, 14]},
		{name: "left", edgepos: [3, 1, 2, 0], facepos: [9, 11, 13, 15]},
		{name: "top", edgepos: [2, 0, 3, 1], facepos: [16, 18, 20, 22]},
		{name: "bottom", edgepos: [0, 2, 1, 3], facepos: [17, 19, 21, 23]}
	]
};

class OctaMap {
	constructor(object) {
		this.mapvars = object.mapvars || { maptitle: "Untitled map by Unknown" };
		this.entities = object.entities || [];
		this.octree = object.geometry || [];
		this.header = {
			magic: "OCTA",
			version: 33,
			headersize: 36,
			worldsize: object.mapsize || 1024,
			numents: this.entities.length,
			numpvs: 0,
			lightmaps: 0,
			blendmap: 0,
			numvars: Object.keys(this.mapvars).length,
			numvslots: 0
		};

		Object.keys(this.header).forEach((key) => {
			this.header[key] =
				getTypeofVar(this.header[key]) == "string"
					? _strtoHex(this.header[key])
					: _inttoHex(this.header[key], 8);
		});

		// things that are unlikely to change
		// gameident ("fps"), extraentinfosize, MRU textures
		this.extra = "036670730000000000050002000400030005000700";

		this.mapvars = new OctaMapvars(this.mapvars).getString();
		this.entities = new OctaEntities(this.entities).getString();
		this.octree = new OctaGeometry(this.octree, object.mapsize || 1024).getString();
	}

	getStringArray() {
		// header + mapvars + extra + entities + octree
		return ([
			Object.values(this.header).join(""),
			this.mapvars,
			this.extra,
			this.entities,
			this.octree
		]);
	}

	getString() {
		return this.getStringArray().join("");
	}

	getByteArray() {
		return _hextoByte(this.getString());
	}
}

class OctaMapvars {
	constructor(object) {
		this.object = object;
	}

	format(mapvar) {
		// treats array values as RGB and converts it to decimal
		if (typeof mapvar.value == "object") {
			mapvar.value = _rgbtoInt(mapvar.value);
		}
		mapvar.type = getTypeofVar(mapvar.value);
		// int/float: type + name length + name + value
		//   string: type + name length + name + value length + value
		return (
			_inttoHex(dataTypes.mapvar.indexOf(mapvar.type), 2) +
			_inttoHex(mapvar.name.length, 4) +
			_strtoHex(mapvar.name) +
			(mapvar.type == "integer"
				? _inttoHex(mapvar.value, 8)
				: mapvar.type == "float"
				? _floattoHex(mapvar.value)
				: _inttoHex(mapvar.value.length, 4) + _strtoHex(mapvar.value))
		);
	}

	getStringArray() {
		return Object.keys(this.object).map((key, index) =>
			this.format({ name: key, value: Object.values(this.object)[index] })
		);
	}

	getString() {
		return this.getStringArray().join("");
	}

	getByteArray() {
		return _hextoByte(this.getString());
	}
}

class OctaEntities {
	constructor(array) {
		this.array = array;
	}

	format(entity) {
		entity.position = entity.position || [512, 512, 512];
		entity.attributes = entity.attributes || ["mapmodel", 0, 0, 0, 0, 0];
		entity.type = dataTypes.entity.includes(entity.attributes[0])
			? dataTypes.entity.indexOf(entity.attributes[0])
			: 0;

		// position + attributes + type
		return (
			entity.position.map((coordinate) => _floattoHex(coordinate)).join("") +
				entity.attributes.slice(1).map((attribute) =>
					_inttoHex(typeof attribute == "object" ? _rgbtoShortHex(attribute) : attribute, 4)
				).join("") +
				_inttoHex(entity.type, 4)
		);
	}

	getStringArray() {
		return this.array.map((item) => this.format(item));
	}

	getString() {
		return this.getStringArray().join("");
	}

	getByteArray() {
		return _hextoByte(this.getString());
	}
}

class OctaGeometry {
	constructor(array = [], mapsize = 1024) {
		this.array = array.concat(Array(8 - Math.min(8, array.length)).fill("empty"));
		this.mapsize = mapsize;
		this.lasttexture = 1;
	}

	format(cube, properties = {}) {
		if (typeof cube == "object") {
			return Object.keys(cube).map((key, index) =>
				this.format(key, Object.values(cube)[index])
			);
		}

		if (properties.edges) {
			cube = "normal";
		} else {
			// allows the addition of empty cubes at specific positions
			if (properties.position && cube == "empty") {
				cube = "normal";
				properties["edges"] = {"top": [8, 8, 8, 8]};
			}
		}

		if (!properties.textures) {
			properties.textures = [];
		}

		// inherits the last texture of the last cube if there is none
		this.lasttexture = properties.textures[properties.textures.length - 1] || this.lasttexture;
		properties.textures = properties.textures.concat(
			Array(6 - properties.textures.length).fill(this.lasttexture)
		);

		switch (cube) {
			case "children":
				return "00"; // subdivide child
			case "empty":
			case "solid":
			case "lodcube":
				// type + texture + mask
				return (
					_inttoHex(dataTypes["octree"].indexOf(cube), 2) +
					properties.textures.map((tex) => _inttoHex(tex, 4)).join("")
					//+ _inttoHex(properties.mask || 0, 2)
				);
			case "normal":
				let normal = {
					edges: {
						front: [0, 0, 0, 0], back: [0, 0, 0, 0],
						right: [0, 0, 0, 0], left: [0, 0, 0, 0],
						top: [0, 0, 0, 0], bottom: [0, 0, 0, 0]
					}
				};

				// known issue: cube disappears if the push level sum for corresponding corners of opposite faces exceeds 8
				let faces = new Array(24);
				dataTypes["faces"].forEach(face => {
					let edge = properties.edges[face.name] || normal.edges[face.name];
					edge = edge.concat(Array(4 - edge.length).fill(0)); // fill undefined edges with default value
					face.facepos.forEach((facepos, index) => {
						const pushLevel = Math.max(0, Math.min(8, edge[face.edgepos[index]]));
						faces[facepos] = facepos % 2 ? pushLevel : 8 - pushLevel;
					});
				});

				// type + edges + texture + mask
				return (
					_inttoHex(dataTypes["octree"].indexOf(cube), 2) +
					faces.join("") +
					properties.textures.map((tex) => _inttoHex(tex, 4)).join("")
					//+ _inttoHex(properties.mask || 0, 2)
				);
		}
	}

	getOctree() {
		// intercept the "prefab" object and remove it from the geometry array
		const prefabIndex = this.array.findIndex(item => typeof item === "object" && "prefab" in item);
		if (prefabIndex !== -1) {
			let prefab = this.array[prefabIndex]["prefab"];
			this.array.splice(prefabIndex, 1);
			prefab.forEach(cube => {
				let key = Object.keys(cube);
				this.array = this.insert(cube, cube[key]);
			});
		}
		return this.getChildren(this.array, 1);
	}

	getChildren(item, root = 0) {
		if (Array.isArray(item)) {
			item = item.slice(0, 8);
			item = item.concat(Array(8 - item.length).fill("empty")); // fills undefined children with empty cubes
			if (!root) {
				item.splice(0, 0, "children"); // inserts children indicator
			}
			return item.map((item) => this.getChildren(item)); // reads children recursively
		}
		return this.format(item);
	}

	getStringArray() {
		return this.getOctree();
	}

	getString() {
		return this.getStringArray().join("").replace(/,/g, "");
	}

	getByteArray() {
		return _hextoByte(this.getString());
	}

	insert(type = "solid", {position: [x, y, z], gridpower = 1}) {
		let base_gridpower = (Math.log2(this.mapsize) | 0) - 1;
		let level_difference = base_gridpower - gridpower;
		function insert_cube(tree, idx, level) {
			if (level === 0) {
				tree[idx] = type;
				return;
			}
			let child_idx = Math.floor(idx / Math.pow(2, 3 * level));
			if (tree[child_idx] == "empty") {
				tree[child_idx] = Array(8).fill("empty");
			} else {
				if (Array.isArray(tree[child_idx])) {
					// handles the situation where a cube is added into an existing subdivision that does not have all children defined yet
					tree[child_idx] = tree[child_idx].concat(Array(8 - tree[child_idx].length).fill("empty"));
				} else {
					// handles existing neighboring cubes by copying their parent's original properties when subdividing.
					// has visible effect when trying to edit over a modified edge using a different gridpower
					tree[child_idx] = Array(8).fill(tree[child_idx] || "empty");
				}
			}
			insert_cube(tree[child_idx], idx % Math.pow(2, 3 * level), level - 1);
		}
		let tree = this.array.slice(0);
		let index = getCubeIndex(x, y, z, gridpower);
		insert_cube(tree, index, level_difference);
		return tree;
	}
}

try {
	module.exports = {
		Map: OctaMap,
		Mapvars: OctaMapvars,
		Entities: OctaEntities,
		Geometry: OctaGeometry
	};
} catch (error) {}

function _floattoHex(val) {
	var getHex = i => ("00" + i.toString(16)).slice(-2);
	var view = new DataView(new ArrayBuffer(4));
	view.setFloat32(0, val);
	return Array.apply(null, {length: 4}).map((_, i) => getHex(view.getUint8(i))).reverse().join("");
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
// example: getCubeIndex(256, 256, 512, 8) // returns: 35
function getCubeIndex(x, y, z, gridpower) {
	let index = 0;
	let size = 1 << gridpower; // Adding 1 to the gridpower to adjust the size
	index += parseInt((x / size).toString(2), 8);
	index += parseInt((y / size).toString(2), 8) * 2;
	index += parseInt((z / size).toString(2), 8) * 4;
	return index;
}
// example: getCubePos(35, 8) // returns: [256, 256, 512]
function getCubePos(index, gridpower) {
	let octal = index.toString(8);
	let size = 1<<gridpower;
	let position = [0, 0, 0];
	for (i = 0; i < octal.length; i++) {
		let digit = parseInt(octal[octal.length - i - 1], 8);
		position[0] += (Math.floor(digit / 1) % 2) * (2 ** i) * size;
		position[1] += (Math.floor(digit / 2) % 2) * (2 ** i) * size;
		position[2] += (Math.floor(digit / 4) % 2) * (2 ** i) * size;
	}
	return position;
}
