const ogzeditor_presets = [
	{
		"name": "OGZ Editor Default",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_default.js"
	},
	{
		"name": "MRI Gif Extractor",
		"author": "SalatielSauer",
		"url": "https://github.com/SalatielSauer/",
		"file": "scripts/examples/ogzeditor_mri.js"
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
		params: ['frames', 'originalFrames', 'quality'],
		type: 1
	},

	'ogzeditor.asset.frames': {
		comment: 'Stores data of images/gifs.',
		params: ['rgba', 'width', 'height'],
		type: 2
	},

	'ogzeditor.assetQuality': {
		comment: 'Sets the quality for image assets, 5 = lowest quality, 100 = highest quality (slower)',
		params: ['quality']
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
		comment: 'Adds a text to the map.',
		params: ['text', 'startX', 'startY', 'startZ', 'texture', 'gridpower', 'rotate']
	},
	'ogzeditor.loopmap': {
		comment: 'Loops over every position with a given gridpower, returns x y z values as callback',
		params: ['worldSize', 'gridpower', 'callback']
	},
	'ogzeditor.image': {
		comment: 'Adds one or more flat images with optional heightmap support, also allows changing orientation.<br>Use the Upload button to add assets.',
		params: ['assetID', 'quality', 'startX', 'startY', 'startZ', 'gridpower', 'yaw', 'layout', 'direction', 'heightmap'],
		details: {
			0: 'Either an integer or an array containing the [start, end] of a range (for multiple frames)',
			1: 'An integer between 10 and 100',
			7: '0 = horizontal (XY plane), 1 = vertical (XZ plane), 2 = vertical (YZ plane)',
			8: '0 = extend along X, 1 = extend along Y, 2 = extend along Z (up)',
			9: 'The maximum height to be applied from the pixel brightness (multiplied by 16), 0 to disable.'
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
