/*
	Minified JSOCTA - Write Cube 2 Sauerbraten maps using JSON.
	by @SalatielSauer, licensed under ZLIB (https://www.zlib.net/zlib_license.html)
*/

class OctaMap {
	constructor(object) {
		this.mapvars = object.mapvars || { skybox: "skyboxes/remus/sky01" };
		this.mapsize = object.mapvars.mapsize || object.mapsize || 1024;
		this.entities = object.entities || [];
		this.textures = object.vslots || [];
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
			],
			vslot: ["vshaderparam", "vscale", "vrotate", "voffset", "vscroll", "vlayer", "valpha", "vcolor"]
		};
		this.numvslots = object.numvslots || 1704;
	}

	indexOfEntity(name) {return this.dataTypes.entity.indexOf(name);}

	getString() {
		let geometry = this.format_geometry();
		let vslots = this.format_vslots();
		//let most_recent_textures = this.textures.slice(this.textures.length-6);
		//console.log('MRU', most_recent_textures)
		return `
		4f4354412100000028000000
		${this._IH(this.mapsize, 4)}
		${this._IH(this.entities.length, 4)}
		000000000000000000000000
		${this._IH(Object.keys(this.mapvars).length, 4)}
		${this._IH(this.numvslots+Object.keys(this.textures).length, 4)}
		${this.format_mapvars()}
		036670730000000000050002000400030005000700
		${this.format_entities()}
		${this._OIH(this.numvslots)}
		${vslots.join('')}
		${geometry}`.replace(/,/g, "").replace(/\n|\r|\t/g, "");
	}

	getByteArray() {
		return this._HTB(this.getString());
		//console.log(this.getString());
		//return '';
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

	format_vslots() {
		const result = new Array(this.textures.length);
		const dataTypes = this.dataTypes.vslot;
		const textureEntries = Object.entries(this.textures);

		//console.log('TEXTURES::', this.textures);
		// faster than .forEach
		for (let i = 0; i < textureEntries.length; i++) {
			const [slotIndex, layer] = textureEntries[i];
			
			const data = new Array(dataTypes.length + 1);
			let dataIndex = 0;
			let flag = 0;
			//console.log("vslot tex:", slotIndex, layer)
			data[dataIndex++] = this._IH(layer.index || 1, 4);
			
			for (let type = 0; type < dataTypes.length; type++) {
				const slot = dataTypes[type];
				if (layer[slot]) {
					const args = layer[slot];
			
					flag |= (1 << type);
		
					switch (type) {
						case 0: // VSLOT_SHPARAM
							data[dataIndex++] = `0100${this._IH(args[0].length, 2)}${this._STH(args[0])}${this._FTH(args[1] || 0)}${this._FTH(args[2] || 0)}${this._FTH(args[3] || 0)}${this._FTH(args[4] || 0)}`;
							continue;
						case 1: // VSLOT_SCALE
							data[dataIndex++] = this._FTH(args[0] || 0);
							continue;
						case 2: // VSLOT_ROTATION
						case 5: // VSLOT_LAYER
							data[dataIndex++] = this._IH(args[0] || 0, 4);
							continue;
						case 3: // VSLOT_OFFSET
							data[dataIndex++] = `${this._IH(args[0] || 0, 4)}${this._IH(args[1] || 0, 4)}`;
							continue;
						case 4: // VSLOT_SCROLL
						case 6: // VSLOT_ALPHA
							data[dataIndex++] = `${this._FTH(args[0] || 0)}${this._FTH(args[1] || 0)}`;
							continue;
						case 7: // VSLOT_COLOR
							data[dataIndex++] = `${this._FTH(args[0] || 0)}${this._FTH(args[1] || 0)}${this._FTH(args[2] || 0)}`;
							continue;
					}
				}
			}

			result[i] = `${this._IH(flag, 4)}${data.slice(0, dataIndex).join('')}`;
		}
		
		return result;
	}

	format_geometry() {
		const MAX_VSLOTS = 65535;
		const DATA_TYPES = this.dataTypes;
		const SLOT_CACHE = new Map();

		SLOT_CACHE.set('optimized', []);
		SLOT_CACHE.set('reserved', []);
		SLOT_CACHE.set('visited', []);

		let octree = new Array(8).fill({t: 1});
		let cubes = this.octree;
		let mapsize = this.mapsize;
		let textures = this.vslots || [];
		let numvslots = this.numvslots;
		let _IH = this._IH;
		this.textures = textures;

		let SLOT_COUNTER = numvslots;

		function stringify_slot(vslot) {
			const sortedKeys = Object.keys(vslot).sort();
			const normalized = {};
			sortedKeys.forEach((key) => {
				normalized[key] = vslot[key];
			});
			return JSON.stringify(normalized); // ugly, but we have a limited number of vslot types, so it shouldn't be a problem
		}

		function subdivide(item, root = 0) {
			if (Array.isArray(item)) {
				item = item.concat(Array(8 - item.length).fill({t: 1})); // fills undefined children with empty cubes
				if (!root) {
					item.splice(0, 0, {t: 0}); // inserts children indicator
				}
				return item.map((item) => subdivide(item)); // reads children recursively
			}

			let cube = item || {t: 1};

			let texture_input = Number(cube.af || cube.ft || cube.bk || cube.lf || cube.rt || cube.tp || cube.dn || 0);
			let texture_allfaces_bind = texture_input;

			if (cube.af) {
				let uses_vslot = false;
				let user_slot = {
					index: texture_input
				}
				
				DATA_TYPES.vslot.forEach((slotType) => {
					if (cube[slotType]) {
						uses_vslot = true;
						user_slot[slotType] = cube[slotType];
					}
				});

				texture_allfaces_bind = texture_input;

				if (uses_vslot && textures.length <= MAX_VSLOTS-numvslots) {
					const slot_string = stringify_slot({ ...user_slot });
					const existing_copy = SLOT_CACHE.get(slot_string);
				
					// Retrieve our tracking arrays and maps
					const OPTIMIZED_INDEXES = SLOT_CACHE.get('optimized');
					const VISITED_INDEXES = SLOT_CACHE.get('visited');
				
					// a map of user_slot.index => array of reserved indices just for that index
					let RESERVED_MAP = SLOT_CACHE.get('reserved_map');
					if (!RESERVED_MAP) {
						RESERVED_MAP = new Map();
						SLOT_CACHE.set('reserved_map', RESERVED_MAP);
					}
				
					const isFirstOccurrence = !VISITED_INDEXES.some(entry => entry.index === user_slot.index);
				
					if (existing_copy) {
						texture_allfaces_bind = existing_copy.index+1;
						//console.log(`%cslot exists, reusing cube face: ${cube.af}`, 'font-size: 12px; color:grey', existing_copy, textures.length);
					} else {
						//console.log('new vslot', texture_input, SLOT_COUNTER, textures.length, slot_string)
						// new slot string not found in the cache yet.
						texture_allfaces_bind = SLOT_COUNTER;
						
						if (isFirstOccurrence) {
							// first occurrence of this index:
							// 1. add the raw user_slot.index to OPTIMIZED_INDEXES
							// 2. reserve the current SLOT_COUNTER for future occurrences of this index
							OPTIMIZED_INDEXES.push(user_slot.index);
							textures.push(user_slot);
							RESERVED_MAP.set(user_slot.index, [SLOT_COUNTER]);
						} else {
							// subsequent occurrence of this index:
							// retrieve the reserved list for this index
							let reservedList = RESERVED_MAP.get(user_slot.index);
							if (!reservedList) {
								// if somehow not present, initialize it
								reservedList = [];
								RESERVED_MAP.set(user_slot.index, reservedList);
							}
				
							// 1. use the previously reserved index for this occurrence
							//    remove it from the front of the array and add to OPTIMIZED_INDEXES
							const reserved = reservedList.shift();
							if (typeof reserved !== 'undefined') {
								let optimized_user_slot = {...user_slot};
								OPTIMIZED_INDEXES.push(reserved);
								optimized_user_slot.index = reserved;
								textures.push(optimized_user_slot);

								let user_slot_copy = {... user_slot};
								user_slot_copy.index = reserved;
								SLOT_CACHE.set(slot_string, user_slot_copy);
							}
				
							// 2. reserve a new slot (the current SLOT_COUNTER) for future occurrences
							reservedList.push(SLOT_COUNTER);
						}
				
						VISITED_INDEXES.push({ index: user_slot.index });
				
						//console.log(`%cnew slot added`, 'color:lightgreen', user_slot);
						//console.log('current slot caches', OPTIMIZED_INDEXES, RESERVED_MAP, VISITED_INDEXES);
						SLOT_COUNTER++;
					}
				}
				
			}

			return `0${cube.t==0 ? "0" : `${cube.t==1 ? "1" : `3${8-cube.bk3||8}${cube.ft2||0}${8-cube.bk2||8}${cube.ft3||0}${8-cube.bk1||8}${cube.ft0||0}${8-cube.bk0||8}${cube.ft1||0}${8-cube.rt2||8}${cube.lf3||0}${8-cube.rt0||8}${cube.lf1||0}${8-cube.rt3||8}${cube.lf2||0}${8-cube.rt1||8}${cube.lf0||0}${8-cube.tp2||8}${cube.dn0||0}${8-cube.tp0||8}${cube.dn2||0}${8-cube.tp3||8}${cube.dn1||0}${8-cube.tp1||8}${cube.dn3||0}`}${_IH(cube.lf||texture_allfaces_bind||1, 2)}${_IH(cube.rt||texture_allfaces_bind||1, 2)}${_IH(cube.bk||texture_allfaces_bind||1, 2)}${_IH(cube.ft||texture_allfaces_bind||1, 2)}${_IH(cube.dn||texture_allfaces_bind||1, 2)}${_IH(cube.tp||texture_allfaces_bind||1, 2)}`}`;
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
		let num = BigInt(val);
		const totalBits = BigInt(byte * 8);
		if (num < 0n) {
			num = (1n << totalBits) + num;
		}
		let hex = num.toString(16).toLowerCase().padStart(byte * 2, '0');
		let result = '';
		for (let i = 0; i < byte * 2; i += 2) {
			result = hex.substr(i, 2) + result;
		}
		return result;
	}
	
	_OIH(val) {
		const baseVal = Math.pow(2, 32);
		const adjustedVal = baseVal - val;
		let hexVal = adjustedVal.toString(16);
		hexVal = hexVal.padStart(8, '0');
		let littleEndianHex = '';
		for (let i = 0; i < hexVal.length; i += 2) {
			littleEndianHex = hexVal.substring(i, i + 2) + littleEndianHex;
		}
		return littleEndianHex;
	}

	_HTB(val) {
		const length = val.length / 2;
		const result = new Uint8Array(length);
		for (let i = 0, j = 0; i < length; i++, j += 2) {
			result[i] = (val.charCodeAt(j) - 48 < 10 ? val.charCodeAt(j) - 48 : val.charCodeAt(j) - 87) * 16
				+ (val.charCodeAt(j + 1) - 48 < 10 ? val.charCodeAt(j + 1) - 48 : val.charCodeAt(j + 1) - 87);
		}
		return result;
	}
	
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
