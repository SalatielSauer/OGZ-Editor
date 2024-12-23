
// This is an example of how to manually process color data without using predefined functions.

ogzeditor.assetQuality(50); // 100 means high quality (slow)
let ASSET = ogzeditor.asset;
let IMAGE = ASSET.frames[0];
let PIXELS = IMAGE.rgba;
let WIDTH = IMAGE.width;
let HEIGHT = IMAGE.height;

let GRIDPOWER = 1;
let CUBESIZE = 1 << GRIDPOWER;

let map = [];

let START_POS = [0, 0, 512];

map.push(PIXELS.reduce((cubes, _, i) => {
	if (i % 4 === 0) {
		let x = (i / 4) % WIDTH;
		let y = Math.floor((i / 4) / WIDTH);

		// extract RGBA values
		let r = PIXELS[i] / 255;
		let g = PIXELS[i + 1] / 255;
		let b = PIXELS[i + 2] / 255;
		let a = PIXELS[i + 3] / 255;

		cubes.push({
			x: START_POS[0] + (x * CUBESIZE),
			y: START_POS[1] + (y * CUBESIZE), 
			z: START_POS[2],
			g: GRIDPOWER,
			vcolor: [r, g, b],
			af: 1462
		});
	}
	return cubes;
}, []));

mapvars({
	"maptitle": "Simple pixel art example by OGZ Editor (github.com/SalatielSauer/OGZ-Editor)",
	"skyboxcolour": [0, 0, 0]
});

entities([]);

geometry(() => map);