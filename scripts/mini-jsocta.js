/*
	Minified JSOCTA - Write Cube 2 Sauerbraten maps using JSON.
	by @SalatielSauer, licensed under ZLIB (https://www.zlib.net/zlib_license.html)
*/

class QuickOGZ {
	constructor(object) {
		this.mapsize = object.mapsize || 1024;
		this.mapvars = object.mapvars || { maptitle: "Untitled map by Unknown" };
		this.entities = object.entities || [];
		this.octree = object.geometry || [];
		this.dataTypes = {
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
			]
		};
	}

	indexOfEntity(name) {return this.dataTypes.entity.indexOf(name);}

	getString() {
		return `4f4354412100000024000000${this._IH(this.mapsize, 4)}${this._IH(this.entities.length, 4)}000000000000000000000000${this._IH(Object.keys(this.mapvars).length, 4)}00000000${this.format_mapvars()}036670730000000000050002000400030005000700${this.format_entities()}${this.format_geometry()}`.replace(/,/g, "");
	}

	getByteArray() {
		return this._HTB(this.getString());
	}

	format_mapvars() {
		return Object.keys(this.mapvars).map((key, index) => {
			let mapvar = {name: key, value: Object.values(this.mapvars)[index]};
			// treats array values as RGB and converts it to decimal
			if (typeof mapvar.value == "object") {
				mapvar.value = this._CTI(mapvar.value);
			};
			mapvar.type = this.getTypeofVar(mapvar.value);
			// int/float: type + name length + name + value
			//   string: type + name length + name + value length + value
			return (
				this._IH(this.dataTypes.mapvar.indexOf(mapvar.type), 1) +
				this._IH(mapvar.name.length, 2) +
				this._STH(mapvar.name) +
				(mapvar.type == "integer"
					? this._IH(mapvar.value, 4)
					: mapvar.type == "float"
					? this._FTH(mapvar.value)
					: this._IH(mapvar.value.length, 2) + this._STH(mapvar.value))
			);
		});
	}

	format_entities() {
		return this.entities.map((entity) => `${this._FTH(entity.x||0)}${this._FTH(entity.y||0)}${this._FTH(entity.z||0)}${this._IH(entity.at0||0, 2)}${this._IH(entity.at1||0, 2)}${this._IH(entity.at2||0, 2)}${this._IH(entity.at3||0, 2)}${this._IH(entity.at4||0, 2)}${this._IH(entity.t||0, 2)}`);
	}

	format_geometry() {
		let octree = new Array(8).fill({t: 1});
		let cubes = this.octree;
		let mapsize = this.mapsize;
		let _IH = this._IH;
		function subdivide(item, root = 0) {
			if (Array.isArray(item)) {
				item = item.concat(Array(8 - item.length).fill({t: 1})); // fills undefined children with empty cubes
				if (!root) {
					item.splice(0, 0, {t: 0}); // inserts children indicator
				}
				return item.map((item) => subdivide(item)); // reads children recursively
			}
			let cube = item || {t: 1};
			return `0${cube.t==0 ? "0" : `${cube.t==1 ? "1" : `3${8-cube.bk3||8}${cube.ft2||0}${8-cube.bk2||8}${cube.ft3||0}${8-cube.bk1||8}${cube.ft0||0}${8-cube.bk0||8}${cube.ft1||0}${8-cube.rt2||8}${cube.lf3||0}${8-cube.rt0||8}${cube.lf1||0}${8-cube.rt3||8}${cube.lf2||0}${8-cube.rt1||8}${cube.lf0||0}${8-cube.tp2||8}${cube.dn0||0}${8-cube.tp0||8}${cube.dn2||0}${8-cube.tp3||8}${cube.dn1||0}${8-cube.tp1||8}${cube.dn3||0}`}${_IH(cube.lf||cube.af||1, 2)}${_IH(cube.rt||cube.af||1, 2)}${_IH(cube.bk||cube.af||1, 2)}${_IH(cube.ft||cube.af||1, 2)}${_IH(cube.dn||cube.af||1, 2)}${_IH(cube.tp||cube.af||1, 2)}`}`;
		}

		function insert(type, x=0, y=0, z=0, gridpower) {
			let base_gridpower = (Math.log2(mapsize) | 0) - 1;
			let level_difference = base_gridpower - gridpower;
			function insert_cube(tree, idx, level) {
				if (level === 0) {
					tree[idx] = type;
					return;
				}
				const powValue = Math.pow(2, 3 * level);
				let child_idx = Math.floor(idx / powValue);
				if (tree[child_idx] == {t: 1}) {
					tree[child_idx] = Array(8).fill({t: 1});
				} else {
					if (Array.isArray(tree[child_idx])) {
						// handles the situation where a cube is added into an existing subdivision that does not have all children defined yet
						tree[child_idx] = tree[child_idx].concat(Array(8 - tree[child_idx].length).fill({t: 1}));
					} else {
						// handles existing neighboring cubes by copying their parent's original properties when subdividing,
						// has visible effect when trying to edit over a modified edge using a different gridpower
						tree[child_idx] = Array(8).fill(tree[child_idx] || {t: 1});
					}
				}
				insert_cube(tree[child_idx], idx % powValue, level - 1);
			}
			let tree = octree.slice(0, 8);
			let index = `${parseInt((x / (1 << gridpower)).toString(2), 8)+parseInt((y / (1 << gridpower)).toString(2), 8) * 2+parseInt((z / (1 << gridpower)).toString(2), 8) * 4}`;
			insert_cube(tree, index, level_difference);
			return tree;
		}

		cubes.forEach(cube => {
			octree = insert(cube, cube.x||0, cube.y||0, cube.z||0, cube.g||0);
		});
		
		return subdivide(octree, 1);
	}

	_FTH(val) {
		const getHex = i => `00${i.toString(16)}`.slice(-2);
		const view = new DataView(new ArrayBuffer(4));
		view.setFloat32(0, val);
		return Array.apply(null, {length: 4}).map((_, i) => getHex(view.getUint8(i))).reverse().join("");
	}
	_IH(val, byte) {
	  val = parseInt(val).toString(16).padStart(byte * 2, '0');
	  let result = '';
	  for (let i = 0; i < byte * 2; i += 2) {
	    result = val.substr(i, 2) + result;
	  }
	  return result;
	}
	_HTB(val) {
	  const length = val.length / 2;
	  const result = new Uint8Array(length);
	  for (let i = 0; i < length; i++) {
	    result[i] = parseInt(val.substr(i * 2, 2), 16);
	  }
	  return result;
	}
	//_STH(val) {return val.split("").reduce((hex,c)=>hex+=c.charCodeAt(0).toString(16).padStart(2,"0"),"");}
	_STH(val) {
		let hex = '';
		for (const c of val) {
			hex += c.charCodeAt(0).toString(16).padStart(2, "0");
		}
		return hex;
	}
	_CTI(array) {return array[0] * (256*256) + array[1] * 256 + array[2];}
	_CTH(array) {return ((1 << 24) + (array[0] << 16) + (array[1] << 8) + array[2]).toString(16).slice(1);}
	_CTSH(array) {return "0x" + this._CTH([Math.round(array[0]/17), Math.round(array[1]/17), Math.round(array[2]/17)]).slice(1).replace(/(.{1})./g, "$1").toUpperCase();}
	getTypeofVar(val) {return ((typeof val) == "number") ? (val == 0 || val%1 == 0) ? "integer" : "float" : "string";}
}