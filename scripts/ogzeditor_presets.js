const ogzeditor_presets = [
	{
		"name": "OGZ Editor Default",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_default.js"
	},
	{
		"name": "Empty Map",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_emptymap.js"
	},
	{
		"name": "Text 3D Rotation",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_textrotation.js"
	},
	{
		"name": "Subtractive Geometry",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_subtractive_geometry.js"
	},
	{
		"name": "MRI GIF Extractor (no-helper)",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_mri.js"
	},
	{
		"name": "MRI GIF Extractor (helper)",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_mri_helper.js"
	},
	{
		"name": "Simple 2D Image (no-helper)",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_image.js"
	},
	{
		"name": "Heightmap Image (helper)",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_heightmap.js"
	},
	{
		"name": "Stop Motion Sequencer (simplified)",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_stopmotion_simplified.js"
	},
	{
		"name": "Stop Motion Sequencer (rooms)",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_stopmotion_rooms.js"
	},
	{
		"name": "MagicEye Stereogram",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_magiceye.js"
	}
]

const helpers_descriptions = {
	'ogzeditor.asset': {
		comment: 'Stores data of uploaded assets.',
		params: ['json', 'frames', 'originalFrames'],
		type: 1
	},
	'ogzeditor.asset.frames': {
		comment: 'Stores data of uploaded images/gifs assets.',
		params: ['rgba', 'width', 'height'],
		type: 2
	},
	'ogzeditor.asset.json': {
		comment: 'Stores data of uploaded JSON assets.',
		params: ['objects'],
		type: 2
	},
	'ogzeditor.assetQuality': {
		comment: 'Sets the quality for image assets, 5 = lowest quality, 100 = highest quality (slower)',
		params: ['quality']
	},
	'ogzeditor.assetReduceColors': {
		comment: 'Posterize method to weight pixel colors and reduce the number of unique pixels (2 = low, 16 = high)',
		params: ['level']
	},
	'ogzeditor.ground': {
		comment: 'Four cubes forming a ground plane.',
		params: ['texture']    
	},
	'ogzeditor.cube': {
		comment: 'Adds a cube to the map.',
		params: ['positionX', 'positionY', 'positionZ', 'texture', 'gridpower']
	},
	'ogzeditor.sphere': {
		comment: 'Adds a sphere to the map.',
		params: ['centerX', 'centerY', 'centerZ', 'gridpower', 'texture', 'radius', 'segments', 'rings']
	},
	'ogzeditor.text': {
		comment: 'Adds a text to the map, supports color markers (<strong>^fN</strong>) and 3D rotation (yaw, pitch, roll).',
		params: ['text', 'startX', 'startY', 'startZ', 'texture', 'gridpower', 'yaw', 'pitch', 'roll'],
		details: {
			0: `Predefined colors can be chosen with the ^fN marker, where N is a number from 0 to 8.\nExample: '^f2hello ^f8world'`
		}
	},
	'ogzeditor.loopmap': {
		comment: 'Loops over every position with a given gridpower, returns x y z i values as callback.<br>⚠️This will crash easily if you set the gridpower too low.',
		params: ['worldSize', 'gridpower', 'callback']
	},
	'ogzeditor.image': {
		comment: 'Adds one or more flat images with optional heightmap support, also allows changing 3D orientation.<br>Use the Upload button to add assets.',
		params: ['assetID', 'quality', 'startX', 'startY', 'startZ', 'gridpower', 'yaw', 'pitch', 'roll', 'heightmap', 'direction', 'localPivot', 'layerOffset', 'callback'],
		details: {
			0: 'Either an integer or an array containing the [start, end] of a range (for multiple frames)',
			1: 'Either an integer resolution between 5 and 100, or an array containing [resolution, posterization]\nPosterization reduces the number of unique colors in the image (2 = low, 16 = high), useful for not exceeding maxvslots.',
			9: 'The maximum height to be applied from the pixel brightness (multiplied by 16), 0 to disable.',
			10: 'Direction to place next frames: 0 = right, 1 = left, 2 = up, 3 = down, 4 = front, 5 = back',
			11: 'Use local position for rotation (1) or start position (0).',
			12: 'Defines the distance between subsequent frames.',
			13: 'The callback is executed at each pixel of each frame, contains parameters ({r, g, b, a, brightness, heightValue, width, height, x, y, z, pixelIndex}),\nYou can skip a pixel by returning false in the callback.\nYou can return an array [r, g, b, a] to replace the pixel color in the callback.'
		}
	},
	'ogzeditor.cubeRoom': {
		comment: 'Adds a hollow room.',
		params: ['center', 'size', 'gridpower', 'texture', 'vcolor']
	}
};

ogzeditor_presets.push({
	ommitWarnings: true,
	name: 'OGZ Editor Commands Reference',
	author: 'OGZ Editor',
	body: Object.keys(helpers_descriptions).map(helper => {
		const desc = helpers_descriptions[helper];
		let typeLabel;
		switch (desc.type) {
			case 1:
				typeLabel = 'Properties';
				break;
			case 2:
				typeLabel = 'Items';
				break;
			case 0:
			case undefined:
			default:
				typeLabel = 'Parameters';
				break;
		}
		let params = desc.params.map(p => p).join(', ');
		let doc = `// ${helper}\n`;
		desc.comment.split('\n').forEach(line => {
			doc += `// ${line}\n`;
		});
		doc += `//\n// ${typeLabel}:\n`;
		params.split(', ').forEach((param, index) => {
			const paramDescription = desc.details && desc.details[index] ? `: ${desc.details[index]}` : '';
			doc += `//   - ${param}${paramDescription}\n`;
		});
		if (desc.type === 0 || desc.type === undefined) {
			doc += `//\n// Usage:\n`;
			doc += `${helper}(${params});\n\n`;
		} else if (desc.type === 1) {
			doc += `//\n// Example Object:\n`;
			doc += `const ${helper} = {\n`;
			desc.params.forEach(param => {
				doc += `  ${param}: /* value */, \n`;
			});
			doc += `};\n\n`;
		} else if (desc.type === 2) {
			doc += `//\n// Example Array:\n`;
			doc += `const ${helper} = [\n  /* items */\n];\n\n`;
		}
		return doc;
	}).join('')
});
