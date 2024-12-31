/*
	Minified JSOCTA - Write Cube 2 Sauerbraten maps using JSON.
	by @SalatielSauer, licensed under ZLIB (https://www.zlib.net/zlib_license.html)
*/

class OctaMap {
	constructor(object) {
		this.mapvars = object.mapvars || { skybox: 'skyboxes/remus/sky01' };
		this.mapvars['mapsize'] = this.mapvars.mapsize || 1024;
		this.entities = object.entities || [];
		this.textures = object.vslots || [];
		this.octree = object.geometry || [];
		this.numvslots = object.numvslots || 1704;

		this.dataTypes = {
			mapvar: ['integer', 'float', 'string'],
			entity: [
				'none?', 'light', 'mapmodel', 'playerstart', 'envmap', 'particles', 'sound', 'spotlight',
				'shells', 'bullets', 'rockets', 'riflerounds', 'grenades', 'cartridges',
				'health', 'healthboost', 'greenarmour', 'yellowarmour', 'quaddamage',
				'teleport', 'teledest',
				'monster', 'carrot', 'jumppad',
				'base', 'respawnpoint',
				'box', 'barrel',
				'platform', 'elevator',
				'flag'
			],
			vslot: ['vshaderparam', 'vscale', 'vrotate', 'voffset', 'vscroll', 'vlayer', 'valpha', 'vcolor']
		};

		this.hexUtils = new OctaMapHexUtils();
	}

	get_string() {
		const geometry = [... this.format_geometry()];
		const sections = [
			'4f4354412100000028000000',
			this.hexUtils.IH(this.mapvars.mapsize, 4),
			this.hexUtils.IH(this.entities.length, 4),
			'000000000000000000000000',
			this.hexUtils.IH(Object.keys(this.mapvars).length, 4),
			this.hexUtils.IH(this.numvslots + Object.keys(this.textures).length, 4),
			this.format_mapvars(),
			'036670730000000000050002000400030005000700',
			this.format_entities(),
			this.hexUtils.OIH(this.numvslots),
			... this.format_vslots(),
			geometry
		];

		return sections.flat(Infinity).join('');
	}
	
	get_byte_array() {
		return this.hexUtils.HTB(this.get_string());
	}

	format_mapvars() {
		function get_mapvar_type(val) {return ((typeof val) == 'number') ? (val == 0 || val%1 == 0) ? 'integer' : 'float' : 'string';}
		return Object.keys(this.mapvars).map((key, index) => {
			let mapvar = {name: key, value: Object.values(this.mapvars)[index]};
			// treats array values as RGB and converts it to decimal
			if (typeof mapvar.value == 'object') {
				mapvar.value = this.hexUtils.CTI(mapvar.value);
			};
			mapvar.type = get_mapvar_type(mapvar.value);
			// int/float: type + name length + name + value
			//   string: type + name length + name + value length + value
			return (
				this.hexUtils.IH(this.dataTypes.mapvar.indexOf(mapvar.type), 1) +
				this.hexUtils.IH(mapvar.name.length, 2) +
				this.hexUtils.STH(mapvar.name) +
				(mapvar.type == 'integer'
					? this.hexUtils.IH(mapvar.value, 4)
					: mapvar.type == 'float'
					? this.hexUtils.FTH(mapvar.value)
					: this.hexUtils.IH(mapvar.value.length, 2) + this.hexUtils.STH(mapvar.value))
			);
		});
	}

	/*format_entities() {
		return this.entities.map((entity) => `${this.hexUtils.FTH(entity.x||0)}${this.hexUtils.FTH(entity.y||0)}${this.hexUtils.FTH(entity.z||0)}${this.hexUtils.IH(entity.at0||0, 2)}${this.hexUtils.IH(entity.at1||0, 2)}${this.hexUtils.IH(entity.at2||0, 2)}${this.hexUtils.IH(entity.at3||0, 2)}${this.hexUtils.IH(entity.at4||0, 2)}${this.hexUtils.IH(entity.t||0, 2)}`);
	}*/
	format_entities() {
		return this.entities.map((entity) => {
			const coordsHex = [entity.x || 0, entity.y || 0, entity.z || 0]
				.map((coordinate) => this.hexUtils.FTH(coordinate))
				.join('');

			const attributesHex = [entity.at0, entity.at1, entity.at2, entity.at3, entity.at4]
				.map((attribute) => {
					// if attribute is an object, assume it's a color like [r, g, b]
					return this.hexUtils.IH((typeof attribute === 'object') ? this.hexUtils.CTSH(attribute) : this.hexUtils.IH(attribute || 0, 2), 2);
				})
				.join('');
		
			const typeHex = this.hexUtils.IH(entity.t || 0, 2);
			return coordsHex + attributesHex + typeHex;
		});
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
			data[dataIndex++] = this.hexUtils.IH(layer.index || 1, 4);
			
			for (let type = 0; type < dataTypes.length; type++) {
				const slot = dataTypes[type];
				if (!layer[slot]) continue;
				
				const rawArgs = layer[slot];
				const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
		
				flag |= (1 << type);
	
				switch (type) {
					case 0: // VSLOT_SHPARAM
						data[dataIndex++] = `0100${this.hexUtils.IH(args[0].length, 2)}${this.hexUtils.STH(args[0])}${this.hexUtils.FTH(args[1] || 0)}${this.hexUtils.FTH(args[2] || 0)}${this.hexUtils.FTH(args[3] || 0)}${this.hexUtils.FTH(args[4] || 0)}`;
						continue;
					case 1: // VSLOT_SCALE
						data[dataIndex++] = this.hexUtils.FTH(args || 0);
						continue;
					case 2: // VSLOT_ROTATION
					case 5: // VSLOT_LAYER
						data[dataIndex++] = this.hexUtils.IH(args || 0, 4);
						continue;
					case 3: // VSLOT_OFFSET
						data[dataIndex++] = `${this.hexUtils.IH(args[0] || 0, 4)}${this.hexUtils.IH(args[1] || 0, 4)}`;
						continue;
					case 4: // VSLOT_SCROLL
					case 6: // VSLOT_ALPHA
						data[dataIndex++] = `${this.hexUtils.FTH(args[0] || 0)}${this.hexUtils.FTH(args[1] || 0)}`;
						continue;
					case 7: // VSLOT_COLOR
						data[dataIndex++] = `${this.hexUtils.FTH(args[0] || 0)}${this.hexUtils.FTH(args[1] || 0)}${this.hexUtils.FTH(args[2] || 0)}`;
						continue;
				}
				
			}

			result[i] = `${this.hexUtils.IH(flag, 4)}${data.slice(0, dataIndex).join('')}`;
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
		let textures = this.vslots || [];
		let numvslots = this.numvslots;
		
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

		const subdivide = (item, root = 0) => {
			if (Array.isArray(item)) {
				while (item.length < 8) {
					item.push({ t: 1 }); // fills undefined children with empty cubes
				}
				if (!root) {
					item.splice(0, 0, { t: 0 }); // inserts children indicator
				}
				return item.map((item) => subdivide(item)); // reads children recursively
			}

			const cube = item || {t: 1};

			if (cube.t == 0) return '00';
			if (cube.t == 1) return '01010001000100010001000100';

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
				
					// retrieve our tracking arrays and maps
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
			return `03${8-cube.bk3||8}${cube.ft2||0}${8-cube.bk2||8}${cube.ft3||0}${8-cube.bk1||8}${cube.ft0||0}${8-cube.bk0||8}${cube.ft1||0}${8-cube.rt2||8}${cube.lf3||0}${8-cube.rt0||8}${cube.lf1||0}${8-cube.rt3||8}${cube.lf2||0}${8-cube.rt1||8}${cube.lf0||0}${8-cube.tp2||8}${cube.dn0||0}${8-cube.tp0||8}${cube.dn2||0}${8-cube.tp3||8}${cube.dn1||0}${8-cube.tp1||8}${cube.dn3||0}${this.hexUtils.IH(cube.lf||texture_allfaces_bind||1, 2)}${this.hexUtils.IH(cube.rt||texture_allfaces_bind||1, 2)}${this.hexUtils.IH(cube.bk||texture_allfaces_bind||1, 2)}${this.hexUtils.IH(cube.ft||texture_allfaces_bind||1, 2)}${this.hexUtils.IH(cube.dn||texture_allfaces_bind||1, 2)}${this.hexUtils.IH(cube.tp||texture_allfaces_bind||1, 2)}`;
		}

		const base_gridpower = (Math.log2(this.mapvars.mapsize) | 0) - 1;
		const insert = (type, x=0, y=0, z=0, gridpower) => {
			let level_difference = base_gridpower - gridpower;

			function insert_cube(tree, idx, level) {
				if (level === 0) {
					tree[idx] = type;
					return;
				}
				const powValue = Math.pow(2, 3 * level);
				let child_idx = Math.floor(idx / powValue);
				if (Array.isArray(tree[child_idx])) {
					// handles the situation where a cube is added into an existing subdivision that does not have all children defined yet
					while (tree[child_idx].length < 8) {
						tree[child_idx].push({ t: 1 });
					}
				} else {
					// handles existing neighboring cubes by copying their parent's original properties when subdividing,
					// has visible effect when trying to edit over a modified edge using a different gridpower
					let parent = tree[child_idx] || { t: 1 };
					tree[child_idx] = [];
					for (let i = 0; i < 8; i++) {
						tree[child_idx].push(parent);
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
}

class OctaMapHexUtils {
	constructor () {
		this._OPTM_HEX_LOOKUP = new Array(256).fill('').map((_, i) => i.toString(16).padStart(2, '0'));
		this._OPTM_BYTE_MASKS = [0xFF, 0xFFFF, 0xFFFFFF, 0xFFFFFFFF];
		this._OPTM_BYTE_SHIFTS = [8, 16, 24];
	}

	FTH(val) {
		const getHex = i => `00${i.toString(16)}`.slice(-2);
		const view = new DataView(new ArrayBuffer(4));
		view.setFloat32(0, val);
		return Array.apply(null, {length: 4}).map((_, i) => getHex(view.getUint8(i))).reverse().join('');
	}

	// currently the largest byteLength we need is 4, so we optimize for that
	IH(val, byteLength) {
		if (byteLength < 1 || byteLength > 4) throw new Error(`Invalid byte length for INT to HEX (${val}, ${byteLength})`);
		const num = typeof val === 'bigint' ? Number(val & BigInt(this._OPTM_BYTE_MASKS[byteLength - 1])) : val >>> 0;
		if (byteLength === 1) return this._OPTM_HEX_LOOKUP[num & 0xFF];
		if (byteLength === 2) return this._OPTM_HEX_LOOKUP[num & 0xFF] + this._OPTM_HEX_LOOKUP[(num >>> 8) & 0xFF];
		let result = this._OPTM_HEX_LOOKUP[num & 0xFF];
		for (let i = 0; i < byteLength - 1; i++) {
			result += this._OPTM_HEX_LOOKUP[(num >>> this._OPTM_BYTE_SHIFTS[i]) & 0xFF];
		}
		return result;
	}

	OIH(val) {
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

	HTB(val) {
		const length = val.length >>> 1; // Faster division by 2 using bit shift
		const result = new Uint8Array(length);
		for (let i = 0, j = 0; i < length; i++, j += 2) {
			const high = val.charCodeAt(j);
			const low = val.charCodeAt(j + 1);
			result[i] = ((high <= 57 ? high - 48 : high - 87) << 4) | (low <= 57 ? low - 48 : low - 87);
		}
		return result;
	}

	STH(val) {
		let hex = '';
		for (const c of val) {
			hex += c.charCodeAt(0).toString(16).padStart(2, '0');
		}
		return hex;
	}

	CTI(array) {return array[0] * (256*256) + array[1] * 256 + array[2];}
	
	CTH(array) {return ((1 << 24) + (array[0] << 16) + (array[1] << 8) + array[2]).toString(16).slice(1);}
	
	CTSH(array) {return "0x" + this.CTH([Math.round(array[0]/17), Math.round(array[1]/17), Math.round(array[2]/17)]).slice(1).replace(/(.{1})./g, "$1").toUpperCase();}
}