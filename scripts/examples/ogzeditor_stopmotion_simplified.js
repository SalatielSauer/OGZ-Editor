
// This preset uses teleport & jumppad entities to create the illusion of movement in image sequences.

const TOTAL_FRAMES = 15; //ogzeditor.asset.frames.length;
const SPACING = 68; // spacing between frames

const GRIDWORLDSIZE = 1024;
const WIDTH = ogzeditor.asset.frames[0].width / 2;
const HEIGHT = ogzeditor.asset.frames[0].height / 2;

// calculate grid dimensions based on cube root
const GRIDPERAXIS = Math.ceil(Math.pow(TOTAL_FRAMES, 1/3));

// calculate the total grid size
const GRIDSIZE = (GRIDPERAXIS - 1) * SPACING;

// define the ORIGIN to center the grid within the world
const ORIGIN = {
	x: (GRIDWORLDSIZE - GRIDSIZE) / 2,
	y: (GRIDWORLDSIZE - GRIDSIZE) / 2,
	z: (GRIDWORLDSIZE - GRIDSIZE) / 2
};

const ENTS = [];
const CUBES = [];

let FRAMECOUNT = 0;

// iterate through the grid in 3 dimensions
for (let ix = 0; ix < GRIDPERAXIS; ix++) {
	for (let iy = 0; iy < GRIDPERAXIS; iy++) {
		for (let iz = 0; iz < GRIDPERAXIS; iz++) {
			if (FRAMECOUNT >= TOTAL_FRAMES) break;

			const framePosition = {
				x: ORIGIN.x + ix * SPACING,
				y: ORIGIN.y + iy * SPACING,
				z: ORIGIN.z + iz * SPACING
			};

			// add playerstart at frame 0
			if (FRAMECOUNT === 0) {
				ENTS.push({
					"x": framePosition.x,
					"y": framePosition.y,
					"z": framePosition.z - 16,
					"t": 3
				});
			}

			// add jumppad entity
			ENTS.push({
				"x": framePosition.x,
				"y": framePosition.y,
				"z": framePosition.z - 16,
				"t": 23,
				"at0": 10,
				"at3": -1
			});

			// add teleport entity
			ENTS.push({
				"x": framePosition.x,
				"y": framePosition.y,
				"z": framePosition.z - 8,
				"t": 19,
				"at0": FRAMECOUNT === TOTAL_FRAMES - 1 ? 0 : FRAMECOUNT + 1, // Teleport to next frame, last frame teleports to frame 0
				"at1": -1,
				"at3": -1
			});

			// add teledest entity
			ENTS.push({
				"x": framePosition.x,
				"y": framePosition.y,
				"z": framePosition.z - 8,
				"t": 20,
				"at0": 180,
				"at1": FRAMECOUNT
			});

			// add image to the area
			CUBES.push(ogzeditor.image(FRAMECOUNT, 10, framePosition.x - WIDTH, framePosition.y - 32, framePosition.z - HEIGHT, 0));

			FRAMECOUNT++;
		}
		if (FRAMECOUNT >= TOTAL_FRAMES) break;
	}
	if (FRAMECOUNT >= TOTAL_FRAMES) break;
}

mapvars({
	"maptitle": "Example of interaction with multiple frames, by OGZ Editor (github.com/SalatielSauer/OGZ-Editor)",
	"skyboxcolour": [0, 0, 0]
});

entities(ENTS);

geometry(CUBES);