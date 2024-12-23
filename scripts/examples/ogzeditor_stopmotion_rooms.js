
// This preset uses teleport & jumppad entities to create the illusion of movement in image sequences.
// it also creates hollow rooms around the frames.

const TOTAL_ROOMS = 16;
const CUBESIZE = 66; // total size of the hollow cube
const SPACING = CUBESIZE + 2; // SPACING between rooms

// calculate grid dimensions dynamically
function calculateGridDimensions(totalRooms) {
	let nx = Math.ceil(Math.cbrt(totalRooms));
	let ny = Math.ceil(Math.cbrt(totalRooms / nx));
	let nz = Math.ceil(totalRooms / (nx * ny));

	while (nx * ny * nz < totalRooms) {
		if (nx <= ny && nx <= nz) {
			nx += 1;
		} else if (ny <= nx && ny <= nz) {
			ny += 1;
		} else {
			nz += 1;
		}
	}

	return { nx, ny, nz };
}

// calculate grid dimensions based on TOTAL_ROOMS
const { nx, ny, nz } = calculateGridDimensions(TOTAL_ROOMS);

// calculate the total grid size
const GRIDSIZEX = (nx - 1) * SPACING;
const GRIDSIZEY = (ny - 1) * SPACING;
const GRIDSIZEZ = (nz - 1) * SPACING;

// define the ORIGIN to center the grid within a 1024x1024x1024 world
const ORIGIN = {
	x: (1024 - GRIDSIZEX) / 2,
	y: (1024 - GRIDSIZEY) / 2,
	z: (1024 - GRIDSIZEZ) / 2
};

const ENTS = [];
const CUBES = [];

const WIDTH = ogzeditor.asset.frames[0].width / 2;
const HEIGHT = ogzeditor.asset.frames[0].height / 2;

// generate room positions in the grid
function generateRoomPositions(totalRooms, nx, ny, nz) {
	const positions = [];
	for (let i = 0; i < totalRooms; i++) {
		const ix = i % nx;
		const iy = Math.floor((i / nx) % ny);
		const iz = Math.floor(i / (nx * ny));

		const roomPosition = {
			x: ORIGIN.x + ix * SPACING,
			y: ORIGIN.y + iy * SPACING,
			z: ORIGIN.z + iz * SPACING
		};

		positions.push(roomPosition);
	}
	return positions;
}

const ROOMPOSITIONS = generateRoomPositions(TOTAL_ROOMS, nx, ny, nz);

// populate entities and geometry based on room positions
ROOMPOSITIONS.forEach((roomPosition, i) => {
	if (i == 0) {
		ENTS.push({"x": roomPosition.x, "y": roomPosition.y, "z": roomPosition.z-16, "t": 3});
	}
	// add room ID text
	const room_id = `${i}`;
	CUBES.push(ogzeditor.text(room_id, roomPosition.x - 14, roomPosition.y - 14, roomPosition.z + 20, 1462, 0, 0));

	// add hollow cube room
	CUBES.push(ogzeditor.cubeRoom(roomPosition, CUBESIZE, 1, 1629, [0.2, 0.2, 0.2]));

	// add jumppad entity
	ENTS.push({
		"x": roomPosition.x,
		"y": roomPosition.y,
		"z": roomPosition.z - 16,
		"t": 23,
		"at0": 10,
		"at3": -1
	});

	// add teleport entity
	ENTS.push({
		"x": roomPosition.x,
		"y": roomPosition.y,
		"z": roomPosition.z - 8,
		"t": 19,
		"at0": i === TOTAL_ROOMS - 1 ? 0 : i + 1, // teleport to next room, last room teleports to room 0
		"at1": -1,
		"at3": -1
	});

	// add teledest entity
	ENTS.push({
		"x": roomPosition.x,
		"y": roomPosition.y,
		"z": roomPosition.z - 8,
		"t": 20,
		"at0": 180,
		"at1": i
	});

	// add image to the room
	CUBES.push(ogzeditor.image(i, 10, roomPosition.x - WIDTH, roomPosition.y - 32, roomPosition.z - HEIGHT,0));
});

mapvars({
	"maptitle": "Example of interaction with multiple frames + rooms, by OGZ Editor (github.com/SalatielSauer/OGZ-Editor)",
	"skyboxcolour": [0, 0, 0]
});

entities(ENTS);

geometry(CUBES);