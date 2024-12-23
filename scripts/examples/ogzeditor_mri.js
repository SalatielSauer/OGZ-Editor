
// This preset uses MRI (Magnetic Resonance Imaging) sequences to reconstruct the model in-game.
// example: https://i.imgur.com/UtRFtHB.gif
// drag and drop the gif into the editor to extract the frames, then press "Save .OGZ" to generate the map.

ogzeditor.assetQuality(30);

const ASSET = ogzeditor.asset;
const FRAMES = ASSET.frames;

const GRIDPOWER = 1;
const CUBESIZE = 1 << GRIDPOWER;
const CUBES = [];

// define a threshold to ignore close-to-black pixels
const BLACK_THRESHOLD = 0.30; // (adjust as needed)

// total height for the 3D model (adjust as needed)
const TOTAL_HEIGHT = 600;
const LAYERTHICKNESS = 4; // (adjust as needed)

const NUMBEROFFRAMES = FRAMES.length;
const LAYERSPACING = TOTAL_HEIGHT / NUMBEROFFRAMES;

FRAMES.forEach((image, frameIndex) => {
	const pixels = image.rgba;
	const width = image.width;
	const height = image.height;

	// base Z offset for the current frame
	const baseZOffset = frameIndex * LAYERSPACING;

	for (let i = 0; i < pixels.length; i += 4) {
		const r = pixels[i] / 255;
		const g = pixels[i + 1] / 255;
		const b = pixels[i + 2] / 255;

		// skip pixels that are close to black
		if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) {
			continue;
		}

		const pixelIndex = i / 4;
		const x = (pixelIndex % width) * CUBESIZE;
		const y = Math.floor(pixelIndex / width) * CUBESIZE;

		for (let layer = 0; layer < LAYERTHICKNESS; layer++) {
			const zOffset = baseZOffset + (layer * CUBESIZE); // Adjust spacing between layers

			const cube = {
				x: x + (width * CUBESIZE) / 2, // Centering the model
				y: y + (height * CUBESIZE) / 2, // Centering the model
				z: zOffset,
				g: GRIDPOWER,
				vcolor: [r, g, b],
				af: 1462
			};
			CUBES.push(cube);
		}
	}
});

mapvars({
	"maptitle": "MRI Extraction example by OGZ Editor (github.com/SalatielSauer/OGZ-Editor)",
	"skyboxcolour": [0, 0, 0]
});

entities([]);

geometry(() => CUBES);
