function _addGround(af, g = 9) {
	const chunk = (1 << g);
	return [{x: 0, y: 0, z: 0, g, af}, {x: chunk, y: 0, z: 0, g, af}, {x: chunk, y: chunk, z: 0, g, af}, {x: 0, y: chunk, z: 0, g, af}]
}

function _addCube(x, y, z, af, g = 2, vcolor = null) {
	let cube = {x, y, z, 'g': g, af};
	if (vcolor) {
		cube['vcolor'] = vcolor;
	}
	return cube;
}

function _addSphere(centerX=512, centerY=512, centerZ=512, g=1, t=1, radius=32, segments=64, rings=64) {
	const result = [];
	for (let i = 0; i <= rings; i++) {
		const phi = (i / rings) * Math.PI;
		for (let j = 0; j <= segments; j++) {
			const theta = (j / segments) * Math.PI * 2;

			const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
			const y = centerY + radius * Math.sin(phi) * Math.sin(theta);
			const z = centerZ + radius * Math.cos(phi);

			result.push(_addCube(
				Math.round(x),
				Math.round(y),
				Math.round(z),
				t, g
			));
		}
	}
	return result;
}

function _addTorus(centerX=512, centerY=512, centerZ=512, g=1, t=1, majorRadius=64, minorRadius=16, segments=64, rings=64) {
	const result = [];
	for (let i = 0; i <= rings; i++) {
		const phi = (i / rings) * Math.PI * 2;
		for (let j = 0; j <= segments; j++) {
			const theta = (j / segments) * Math.PI * 2;

			const x = centerX + (majorRadius + minorRadius * Math.cos(theta)) * Math.cos(phi);
			const y = centerY + (majorRadius + minorRadius * Math.cos(theta)) * Math.sin(phi);
			const z = centerZ + minorRadius * Math.sin(theta);

			result.push(_addCube(
				Math.round(x),
				Math.round(y),
				Math.round(z),
				t, g
			));
		}
	}
	return result;
}

function _addHelix(centerX=512, centerY=512, centerZ=512, g=1, t=1, radius=32, height=128, turns=3, segments=128) {
	const result = [];
	for (let i = 0; i <= segments; i++) {
		const angle = (i / segments) * Math.PI * 2 * turns;
		const heightStep = (i / segments) * height;

		const x = centerX + radius * Math.cos(angle);
		const y = centerY + radius * Math.sin(angle);
		const z = centerZ + heightStep;

		result.push(_addCube(
			Math.round(x),
			Math.round(y),
			Math.round(z),
			t, g
		));
	}
	return result;
}

function _addKleinBottle(centerX=512, centerY=512, centerZ=512, g=1, t=1, scale=16, segments=64, rings=64) {
	const result = [];
	for (let i = 0; i <= rings; i++) {
		const v = (i / rings) * Math.PI * 2;
		for (let j = 0; j <= segments; j++) {
			const u = (j / segments) * Math.PI * 2;
			
			let x, y, z;
			if (u < Math.PI) {
				x = centerX + scale * (3 * Math.cos(u) * (1 + Math.sin(u)) + 
					(2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v));
				y = centerY + scale * (4 * Math.sin(u) + 
					(2 * (1 - Math.cos(u) / 2)) * Math.sin(u) * Math.cos(v));
				z = centerZ + scale * ((2 * (1 - Math.cos(u) / 2)) * Math.sin(v));
			} else {
				x = centerX + scale * (3 * Math.cos(u) * (1 + Math.sin(u)) + 
					(2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI));
				y = centerY + scale * (4 * Math.sin(u));
				z = centerZ + scale * ((2 * (1 - Math.cos(u) / 2)) * Math.sin(v));
			}

			result.push(_addCube(
				Math.round(x),
				Math.round(y),
				Math.round(z),
				t, g
			));
		}
	}
	return result;
}

function _addMobiusStrip(centerX=512, centerY=512, centerZ=512, g=1, t=1, radius=64, width=16, segments=128, rings=16) {
	const result = [];
	for (let i = 0; i <= rings; i++) {
		const v = (i / rings - 0.5) * width;
		for (let j = 0; j <= segments; j++) {
			const u = (j / segments) * Math.PI * 2;
			
			const x = centerX + (radius + v * Math.cos(u/2)) * Math.cos(u);
			const y = centerY + (radius + v * Math.cos(u/2)) * Math.sin(u);
			const z = centerZ + v * Math.sin(u/2);

			result.push(_addCube(
				Math.round(x),
				Math.round(y),
				Math.round(z),
				t, g
			));
		}
	}
	return result;
}

function _loopMap(max = 512, gridpower = 5, callback = ()=>{}) {
	let integer = 0;
	let power = (1 << gridpower);
	for (let x = 0; x <= max; x+=power) {
		for (let y = 0; y <= max; y+=power) {
			for (let z = 0; z <= max; z+=power) {
				callback(x, y, z, integer);
				integer++;
			}
		}
	}
}

function _addText(
	text,
	startX,
	startY,
	startZ,
	textureIndex = 2,
	gridPower = 0,
	yawDeg = 0,
	pitchDeg = 0,
	rollDeg = 0
) {
	const charWidth = 5;   // each character is 5 cubes wide
	const charHeight = 7;  // each character is 7 cubes tall
	const spacing = 1;     // horizontal space between characters
	const verticalSpacing = 2; // vertical space between lines
	const tabSize = 2;     // equivalent to 4 characters wide
	const cubeSize = Math.pow(2, gridPower);

	// we'll treat (startX, startY, startZ) as the pivot around which to rotate
	const pivotX = startX;
	const pivotY = startY;
	const pivotZ = startZ;

	// precompute radians
	const pitchRad = (pitchDeg * Math.PI) / 180;
	const rollRad = (rollDeg * Math.PI) / 180; 
	const yawRad = (yawDeg * Math.PI) / 180;  

	// color palette (from sauer src/engine/rendertext.cpp)
	const texColors = [
		[0.25098, 1.0, 0.501961],
		[0.376471, 0.627451, 1.0],
		[1.0, 0.752941, 0.25098],
		[1.0, 0.25098, 0.25098],
		[0.501961, 0.501961, 0.501961],
		[0.752941, 0.25098, 0.752941],
		[1.0, 0.501961, 0.0],
		[1.0, 1.0, 1.0],
		[0.376471, 0.941176, 1.0]
	];

	// — step 1: parse out text color markers (^fN) —
	let currentVColor = null;
	let cleanText = '';
	const colorMap = [];

	for (let i = 0; i < text.length; i++) {
		if (text[i] === '^' && text[i + 1] === 'f') {
			const marker = text[i + 2];
			if (marker === '~') {
				// ^f~ = reset color
				currentVColor = null;
			} else {
				// ^fN = set color N
				const colorIndex = parseInt(marker, 10);
				if (!isNaN(colorIndex) && texColors[colorIndex]) {
					currentVColor = texColors[colorIndex];
				}
			}
			i += 2; // skip ^fN
		} else {
			cleanText += text[i];
			colorMap.push(currentVColor);
		}
	}

	const map = [];

	// — step 2: plot each character —
	for (let i = 0; i < cleanText.length; i++) {
		const character = cleanText[i];
		const charColor = colorMap[i];

		if (character === ' ') {
			// just move cursor right
			startX += (charWidth + spacing) * cubeSize;
			continue;
		} else if (character === '\n') {
			// move to new line
			startX = pivotX;
			startZ -= (charHeight + verticalSpacing) * cubeSize;
			continue;
		} else if (character === '\t') {
			// tab
			startX += (charWidth * tabSize + spacing) * cubeSize;
			continue;
		}

		// get “bitmap” for the char
		const matrix = _jsocta_text_get_matrix(character);

		for (let y = 0; y < matrix.length; y++) {
			for (let x = 0; x < matrix[y].length; x++) {
				if (matrix[y][x] === 1) {
					// create a cube at local (x, y) in text
					let cubeX = startX + x * cubeSize;
					let cubeY = pivotY;  // text is flat on Y
					let cubeZ = startZ + (charHeight - y) * cubeSize;

					// apply pitch + roll + yaw rotation around pivot
					const [rX, rY, rZ] = _rotate3D(
						cubeX, cubeY, cubeZ,
						pivotX, pivotY, pivotZ,
						pitchRad, rollRad, yawRad
					);

					// build our final cube
					const cube = {
						x: rX,
						y: rY,
						z: rZ,
						g: gridPower,
						af: textureIndex
					};

					if (charColor) {
						cube.vcolor = charColor;
					}

					map.push(cube);
				}
			}
		}

		// advance cursor for the next character
		startX += (charWidth + spacing) * cubeSize;
	}

	return map;
}

function _rotate3D(px, py, pz, pivotX, pivotY, pivotZ, pitchRad, rollRad, yawRad) {
	// 1) translate relative to pivot
	const dx = px - pivotX;
	const dy = py - pivotY;
	const dz = pz - pivotZ;

	// 2) pitch (around X)
	const cosP = Math.cos(pitchRad);
	const sinP = Math.sin(pitchRad);

	let rx = dx;
	let ry = dy * cosP - dz * sinP;
	let rz = dy * sinP + dz * cosP;

	// 3) roll (around Y)
	const cosY = Math.cos(rollRad);
	const sinY = Math.sin(rollRad);

	const rrx = rx * cosY - rz * sinY;
	const rrz = rx * sinY + rz * cosY;
	const rry = ry;

	// 4) translate back
	let [tx, ty, tz] = [rrx, rry, rrz];

	// now do yaw
	const cosR = Math.cos(yawRad);
	const sinR = Math.sin(yawRad);

	const frx = tx * cosR - ty * sinR;
	const fry = tx * sinR + ty * cosR;
	const frz = tz;

	return [frx + pivotX, fry + pivotY, frz + pivotZ];
}

function _addImage(
	index = 0,
	quality = 50,
	oX = 0,
	oY = 0,
	oZ = 0,
	gridpower = 1,
	yaw = 0,
	pitch = 0,
	roll = 0,
	heightmap = false,
	direction = 0,  // 0=right,1=left,2=up,3=down,4=front,5=back
	localPivot = true,
	layerOffset = null,
	callback = () => { return true }
) {
	assetHandler.setQuality(quality);
	const asset = assetHandler.asset;
	if (!asset.frames.length) {
		throw new Error('⚠️ This script requires at least one asset, make sure to upload it and try again.');
	}

	const frames = Array.isArray(index)
		? asset.frames.slice(...index)
		: typeof index === 'object'
			? asset.frames.slice(...Object.values(index))
			: [asset.frames[index]];

	const cubeSize = 1 << gridpower;
	const cubes = [];

	let frameOffsetW = 0;
	let frameOffsetH = 0;
	let frameOffset = 0;

	const pitchRad = (pitch * Math.PI) / 180;
	const rollRad = (roll * Math.PI) / 180;
	const yawRad = (yaw * Math.PI) / 180;

	frames.forEach((image, frameIndex) => {
		const { rgba: pixels, width, height } = image;

		// if this isn’t the first frame, accumulate offset
		if (frameIndex > 0) {
			const prevWidth = frames[frameIndex - 1].width;
			const prevHeight = frames[frameIndex - 1].height;
			frameOffsetW += (layerOffset ? layerOffset : prevWidth) * cubeSize;
			frameOffsetH += (layerOffset ? layerOffset : prevHeight) * cubeSize;
			frameOffset  += (layerOffset ? layerOffset : 0) * cubeSize;
		}

		// decide how frames move in space
		let offsetX = 0, offsetY = 0, offsetZ = 0;
		switch (direction) {
			case 0: offsetX = frameOffsetW; break;   // right
			case 1: offsetX = -frameOffsetW; break;  // left
			case 2: offsetZ = frameOffsetH; break;   // up
			case 3: offsetZ = -frameOffsetH; break;  // down
			case 4: offsetY = frameOffset; break;    // front
			case 5: offsetY = -frameOffset; break;   // back
		}

		// if localPivot=true, pivot around the top-left of this frame
		// (the corner at xIndex=0,yIndex=0 => z=(height-1)*cubeSize).
		const pivotX = localPivot ? (oX + offsetX) : oX;
		const pivotY = localPivot ? (oY + offsetY) : oY;
		const pivotZ = localPivot ? (oZ + offsetZ + (height - 1) * cubeSize) : oZ;

		// we'll create a local function that rotates around pivotX/pivotY/pivotZ
		function createCube(localX, localY, localZ, r, g, b, a) {
			const [rx, ry, rz] = _rotate3D(
				localX,
				localY,
				localZ,
				pivotX,
				pivotY,
				pivotZ,
				pitchRad,
				rollRad,
				yawRad
			);
			return {
				x: rx,
				y: ry,
				z: rz,
				g: gridpower,
				vcolor: [r, g, b],
				valpha: a,
				af: 1462
			};
		}

		const frameCubes = [];
		for (let i = 0; i < pixels.length; i += 4) {
			const xIndex = (i / 4) % width;
			const yIndex = Math.floor((i / 4) / width);

			let r = pixels[i]     / 255;
			let g = pixels[i + 1] / 255;
			let b = pixels[i + 2] / 255;
			let a = pixels[i + 3] / 255;

			const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			const heightValue = Math.floor(brightness * (16 * heightmap * cubeSize));

			// if localPivot=false, we still do the same 'top-left is bigger z' layout
			// X increases to the right, Z decreases going downward:
			const localX = oX + offsetX + xIndex * cubeSize;
			const localY = oY + offsetY;
			const localZ = oZ + offsetZ + (height - 1 - yIndex) * cubeSize;

			let callbackResult = callback(
				{
					r, g, b, a, brightness, heightValue, width, height,
					x: localX, y: localY, z: localZ, frameIndex
				}
			);
			
			// "false" -> skip, "true" -> keep existing RGBA
			// if an array is returned, always treat it as "true".
			let condition = false;
			if (Array.isArray(callbackResult)) {
				condition = true;
				[r, g, b, a] = callbackResult;
			} else {
				condition = callbackResult;
			}
	
			if (condition) {
				if (heightmap && heightValue > 0) {
					// extrude "upward" in +Y
					for (let yVal = 0; yVal <= heightValue; yVal += cubeSize) {
					frameCubes.push(createCube(localX, localY + yVal, localZ, r, g, b, a));
					}
				} else {
					frameCubes.push(createCube(localX, localY, localZ, r, g, b, a));
				}
			}
		}
		cubes.push(frameCubes);
	});

	return cubes.flat();
}

function _addRoom(center, size, gridPower = 1, texture = 1462, vcolor = [1, 1, 1]) {
	let cubes = [];

	const cubeSize = 1 << gridPower;

	const halfSize = size / 2;

	const minX = center.x - halfSize;
	const maxX = center.x + halfSize;
	const minY = center.y - halfSize;
	const maxY = center.y + halfSize;
	const minZ = center.z - halfSize;
	const maxZ = center.z + halfSize;

	for (let x = minX; x <= maxX; x += cubeSize) {
		for (let y = minY; y <= maxY; y += cubeSize) {
			for (let z = minZ; z <= maxZ; z += cubeSize) {
				const isSurface =
				x === minX || x === maxX ||
				y === minY || y === maxY ||
				z === minZ || z === maxZ;

				if (isSurface) {
					const cube = {
						x: x,
						y: y,
						z: z,
						g: gridPower,
						vcolor: vcolor,
						af: texture
					};
					cubes.push(cube);
				}
			}
		}
	}
	return cubes;
}

function _rotate3D(px, py, pz, pivotX, pivotY, pivotZ, pitchRad, rollRad, yawRad) {
	const dx = px - pivotX;
	const dy = py - pivotY;
	const dz = pz - pivotZ;

	const cosP = Math.cos(pitchRad);
	const sinP = Math.sin(pitchRad);
	let rx = dx;
	let ry = dy * cosP - dz * sinP;
	let rz = dy * sinP + dz * cosP;

	const cosY = Math.cos(rollRad);
	const sinY = Math.sin(rollRad);
	const rrx = rx * cosY - rz * sinY;
	const rrz = rx * sinY + rz * cosY;
	const rry = ry;

	let [tx, ty, tz] = [rrx, rry, rrz];

	const cosR = Math.cos(yawRad);
	const sinR = Math.sin(yawRad);
	const frx = tx * cosR - ty * sinR;
	const fry = tx * sinR + ty * cosR;
	const frz = tz;

	return [frx + pivotX, fry + pivotY, frz + pivotZ];
}

function _jsocta_text_get_matrix(char) {
	return _jsocta_char_matrices[char] || _jsocta_char_matrices[' '];
}

const _jsocta_char_matrices = {
" ":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],A:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],B:[[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[1,1,1,0,0]],C:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],D:[[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0]],E:[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],F:[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],G:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],H:[[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],I:[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],J:[[0,0,0,1,1],[0,0,0,1,1],[0,0,0,1,1],[0,0,0,1,1],[1,0,0,1,1],[1,0,0,1,1],[0,1,1,0,0]],K:[[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],L:[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],M:[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],N:[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],O:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],P:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],Q:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,1,0],[0,1,1,1,1]],R:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],S:[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],T:[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],U:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],V:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],W:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1],[1,0,0,0,1]],X:[[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[0,1,0,1,0],[1,0,0,0,1]],Y:[[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],Z:[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],a:[[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1]],b:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],c:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],d:[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,1],[0,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],e:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,0],[0,1,1,1,1]],f:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,1],[0,1,0,0,0],[1,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0]],g:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[0,1,0,1,0],[0,1,1,1,1],[0,0,0,0,1],[0,1,1,1,1]],h:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],i:[[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],j:[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,1,0],[0,0,0,0,0],[0,0,0,1,0],[0,1,0,1,0],[0,1,1,1,0]],k:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0]],l:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],m:[[0,0,0,0,0],[0,0,0,0,0],[0,1,0,1,0],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1]],n:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],o:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],p:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0]],q:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1]],r:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],s:[[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],t:[[0,0,0,0,0],[0,0,0,0,0],[0,1,0,0,0],[1,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,1,0]],u:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],v:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],w:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[0,1,0,1,0]],x:[[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],y:[[0,0,0,0,0],[0,0,0,0,0],[0,1,0,0,1],[0,1,0,0,1],[0,0,1,1,1],[0,0,0,0,1],[0,1,1,1,0]],z:[[0,0,0,0,0],[0,0,0,0,0],[1,1,1,0,0],[0,0,0,1,0],[0,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],0:[[0,1,1,1,0],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[0,1,1,1,0]],1:[[0,0,1,0,0],[0,1,1,0,0],[1,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],2:[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],3:[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],4:[[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],5:[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],6:[[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],7:[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],8:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],9:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[1,1,1,0,0]],"/":[[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0]],"[":[[0,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,1,0]],"]":[[0,1,1,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,1,1,1,0]],")":[[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],"(":[[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],"}":[[1,1,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,0,0,0]],"{":[[0,0,0,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,1]],"=":[[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0]],">":[[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],"<":[[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],"^":[[0,0,0,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],",":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],":":[[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0]],"\"":[[0,1,0,1,0],[0,1,0,1,0],[0,1,0,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],"\`":[[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],"\'":[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],";":[[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,0]],"*":[[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],".":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0]],"$":[[0,0,0,1,0],[1,1,1,1,1],[1,0,1,0,0],[1,1,1,1,1],[0,0,1,0,1],[1,1,1,1,1],[0,1,0,0,0]],"_":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1]],"@":[[0,1,1,1,0],[1,0,0,0,1],[1,0,1,1,1],[1,0,1,1,0],[1,0,0,0,0],[1,1,0,0,1],[0,1,1,1,0]],"+":[[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0]],"-":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],"|":[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],"#":[[0,0,0,0,0],[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[0,0,0,0,0]],"%":[[0,0,0,0,1],[0,1,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,1,0],[1,0,0,0,0]],"!":[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],"?":[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],"~":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,0,1],[1,0,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],"&":[[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0],[1,0,1,0,1],[1,0,0,1,0],[0,1,1,0,1]]
};

const _dummy_octamap = new OctaMap({});

function _getEntityType(name) {
	return _dummy_octamap.dataTypes.entity.indexOf(name);
}

const jsocta_helpers = {
	ground: _addGround,
	cube: _addCube,
	sphere: _addSphere,
	loopmap: _loopMap,
	text: _addText,
	image: _addImage,
	cubeRoom: _addRoom
}
