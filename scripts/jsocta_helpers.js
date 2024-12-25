function _addGround(af) {
	return [{x: 0, y: 0, z: 0, g: 9, af}, {x: 512, y: 0, z: 0, g: 9, af}, {x: 512, y: 512, z: 0, g: 9, af}, {x: 0, y: 512, z: 0, g: 9, af}]
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

function _addText(text, startX, startY, startZ, textureIndex = 2, gridPower = 0, rotate = 0) {
	const charWidth = 5; // assuming each character is 5 cubes wide
	const charHeight = 7; // assuming each character is 7 cubes tall
	const spacing = 1; // space between characters
	const verticalSpacing = 2; // vertical space between lines
	const tabSize = 2; // equivalent to 4 characters wide
	const cubeSize = Math.pow(2, gridPower);
	const initialX = startX; // to reset startX on newline
	const map = [];
	let mirror = false;

	for (let i = 0; i < text.length; i++) {
		//let c = mirror ? ((text.length-1) - i) : i; // tofix: last letter gets lost

		const character = mirror ? text.split('').reverse()[i] : text[i];

		if (character === ' ') {
			startX += (charWidth + spacing) * cubeSize; // move start position for space
			continue;
		} else if (character === '\n') {
			startX = initialX; // reset to beginning of line
			startZ -= (charHeight + verticalSpacing) * cubeSize; // move down a line
			continue;
		} else if (character === '\t') {
			startX += (charWidth * tabSize + spacing) * cubeSize; // move start position for tab
			continue;
		}

		const matrix = _jsocta_text_get_matrix(character);
		for (let y = 0; y < matrix.length; y++) {
			for (let x = 0; x < matrix[y].length; x++) {
				let matrix_block = mirror ? matrix[y][matrix[y].length - 1 - x] : matrix[y][x];
				if (matrix_block === 1) {
					let cube = {
						x: startX + x * cubeSize,
						y: startY,
						z: startZ + (charHeight - y) * cubeSize,
						g: gridPower,
						af: textureIndex
					}
					switch(rotate) {
						case 1: case 3:
							let temp = cube.x;
							cube.x = cube.y;
							cube.y = temp;
							if (rotate == 3) {
								mirror = true;
							}
							break;
						case 2:
							mirror = true;
							break;
						default: 
							break;
					}
					map.push(cube);
				}
			}
		}
		startX += (charWidth + spacing) * cubeSize; // move start position to next character

	}

	return map;
}

function _jsocta_text_get_matrix(char) {
	return _jsocta_char_matrices[char.toUpperCase()] || _jsocta_char_matrices[' '];
}

const _jsocta_char_matrices = {
	" ":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],A:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],B:[[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[1,1,1,0,0]],C:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],D:[[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0]],E:[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],F:[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],G:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],H:[[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],I:[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],J:[[0,0,0,1,1],[0,0,0,1,1],[0,0,0,1,1],[0,0,0,1,1],[1,0,0,1,1],[1,0,0,1,1],[0,1,1,0,0]],K:[[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],L:[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],M:[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],N:[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],O:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],P:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],Q:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,1,0],[0,1,1,1,1]],R:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],S:[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],T:[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],U:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],V:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],W:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1],[1,0,0,0,1]],X:[[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[0,1,0,1,0],[1,0,0,0,1]],Y:[[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],Z:[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],0:[[0,1,1,1,0],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[0,1,1,1,0]],1:[[0,0,1,0,0],[0,1,1,0,0],[1,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],2:[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],3:[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],4:[[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],5:[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],6:[[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],7:[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],8:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],9:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[1,1,1,0,0]],"/": [[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0]],"[": [[0,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,1,0]],"]": [[0,1,1,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,1,1,1,0]],")": [[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],"(": [[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],"}": [[1,1,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,0,0,0]],"{": [[0,0,0,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,1]],"=": [[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0]],">": [[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],"<": [[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],",": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],":": [[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0]],"\"": [[0,1,0,1,0],[0,1,0,1,0],[0,1,0,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],";": [[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,0]],"*": [[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],".": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0]],"$": [[0,0,0,1,0],[1,1,1,1,1],[1,0,1,0,0],[1,1,1,1,1],[0,0,1,0,1],[1,1,1,1,1],[0,1,0,0,0]],"_": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1]],"\`": [[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],"@": [[0,1,1,1,0],[1,0,0,0,1],[1,0,1,1,1],[1,0,1,1,0],[1,0,0,0,0],[1,1,0,0,1],[0,1,1,1,0]],"+": [[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0]],
};

function rotateCoordinates(x, y, orientation) {
	// Rotate coordinates based on orientation (0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°)
	let angle = (orientation * Math.PI) / 2;
	return {
		x: x * Math.cos(angle) - y * Math.sin(angle),
		y: x * Math.sin(angle) + y * Math.cos(angle)
	};
}

function _addImage(index = 0, quality = 50, oX = 0, oY = 0, oZ = 0, gridpower = 1, yaw = 0, layout = 1, direction = 0, heightmap = false) {
	// layout: 0 = horizontal (XY plane), 1 = vertical (XZ plane), 2 = vertical (YZ plane)
	// direction: 0 = extend along X, 1 = extend along Y, 2 = extend along Z (up)
	// heightmap: if true, creates a heightmap based on pixel brightness
	
	assetHandler.setQuality(quality);
	let asset = assetHandler.asset;
	let frames = (typeof index == 'object') ? asset.frames.slice(...Object.values(index)) : [asset.frames[index]];

	let cubeSize = 1 << gridpower;
	let cubes = [];
	let frameOffset = 0;

	frames.forEach((image, frameIndex) => {
		let pixels = image.rgba;
		let width = image.width;
		let height = image.height;

		if (frameIndex !== 0) {
			let prevWidth = frames[frameIndex - 1].width;
			frameOffset += prevWidth;
		}

		let frameCubes = pixels.reduce((acc, _, i) => {
			if (i % 4 === 0) {
				let x = (i / 4) % width;
				let y = Math.floor((i / 4) / width);

				// Invert Y coordinate for vertical layouts
				if (layout === 1 || layout === 2) {
					y = height - 1 - y;
				}

				let r = pixels[i] / 255;
				let g = pixels[i + 1] / 255;
				let b = pixels[i + 2] / 255;
				let a = pixels[i + 3] / 255;

				// Calculate brightness for heightmap
				let brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				let heightValue = Math.floor(brightness * ((16 * heightmap) * cubeSize));

				// Base coordinates before transformations
				let baseX, baseY, baseZ;

				// Apply layout
				switch (layout) {
					case 0: // horizontal (XY plane)
						baseX = x * cubeSize;
						baseY = y * cubeSize;
						baseZ = 0;
						break;
					case 1: // vertical (XZ plane)
						baseX = x * cubeSize;
						baseY = 0;
						baseZ = y * cubeSize;
						break;
					case 2: // vertical (YZ plane)
						baseX = 0;
						baseY = x * cubeSize;
						baseZ = y * cubeSize;
						break;
				}

				// Apply frame direction offset
				switch (direction) {
					case 0: // extend along X
						baseX += frameOffset * cubeSize;
						break;
					case 1: // extend along Y
						baseY += frameOffset * cubeSize;
						break;
					case 2: // extend along Z (up)
						baseZ += frameOffset * cubeSize;
						break;
				}

				// Apply yaw rotation (around Z axis)
				let yawRad = (yaw * Math.PI) / 180;
				let rotatedX = baseX * Math.cos(yawRad) - baseY * Math.sin(yawRad);
				let rotatedY = baseX * Math.sin(yawRad) + baseY * Math.cos(yawRad);

				// Generate heightmap cubes or single cube
				let cubesToAdd = [];
				if (heightmap && heightValue > 0) {
					// Determine heightmap direction based on layout
					switch (layout) {
						case 0: // horizontal (XY plane) - extend up in Z
							for (let z = 0; z <= heightValue; z += cubeSize) {
								cubesToAdd.push({
									x: rotatedX + oX,
									y: rotatedY + oY,
									z: baseZ + z + oZ,
									g: gridpower,
									vcolor: [r, g, b],
									valpha: a,
									af: 1462
								});
							}
							break;
						case 1: // vertical (XZ plane) - extend forward in Y
							for (let y = 0; y <= heightValue; y += cubeSize) {
								cubesToAdd.push({
									x: rotatedX + oX,
									y: y + oY,
									z: baseZ + oZ,
									g: gridpower,
									vcolor: [r, g, b],
									valpha: a,
									af: 1462
								});
							}
							break;
						case 2: // vertical (YZ plane) - extend forward in X
							for (let x = 0; x <= heightValue; x += cubeSize) {
								cubesToAdd.push({
									x: x + oX,
									y: rotatedY + oY,
									z: baseZ + oZ,
									g: gridpower,
									vcolor: [r, g, b],
									valpha: a,
									af: 1462
								});
							}
							break;
					}
				} else {
					cubesToAdd.push({
						x: rotatedX + oX,
						y: rotatedY + oY,
						z: baseZ + oZ,
						g: gridpower,
						vcolor: [r, g, b],
						valpha: a,
						af: 1462
					});
				}

				acc.push(...cubesToAdd);
			}
			return acc;
		}, []);

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

const jsocta_helpers = {
	ground: _addGround,
	cube: _addCube,
	sphere: _addSphere,
	loopmap: _loopMap,
	text: _addText,
	image: _addImage,
	cubeRoom: _addRoom
}
