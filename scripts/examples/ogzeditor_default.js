
/*
You can run this script using the "Save .OGZ" button. OGZ Editor will generate the .OGZ file from the output of each function and provide it for you to download.
Maps can be loaded in your client by performing the following steps:
	1. Place the .OGZ files in the packages/base folder of your Sauerbraten or in the media/map of your Tesseract.
	2. Use the /coop command or the /map command followed by the name of the .OGZ file in the game console to load the map.
*/

// Modify the functions below to change the aspects of the .OGZ file:

mapvars({
	"maptitle": "Untitled Map by OGZ Editor",
	"skyboxcolour": [0, 0, 0]
});

entities([
	{"x": 516, "y": 516, "z": 560, "t": 2, "at1": 23}, // carrot mapmodel (t: 2)
	{"x": 516, "y": 516, "z": 560, "t": 3, "at0": 90}  // playerstart (t: 3)
]);

/*
You can use helper functions to generate arrays and objects:
ogzeditor.ground(texture) // returns an [array] containing four 512x512 cubes with given texture.
ogzeditor.cube(x, y, z, texture, gridpower) // returns an {object} containing a single cube with given properties.
ogzeditor.text(text, x, y, z, texture, gridpower, rotate) // returns an [array] containing cubes that form a given text.
*/
geometry(()=>{
	let cubes = ogzeditor.ground(6);
	let texture = 5;
	let gridpower = 3;

	for (let i = 0; i <= 5; i += 1) {
		cubes.push(ogzeditor.cube(512, 512, 512 + (1 << gridpower)*i, texture, gridpower));
	}
	cubes.push(ogzeditor.sphere(512, 512, 700));
	cubes.push(ogzeditor.text("OGZ Editor", 490, 512, 600, 2));
	return cubes;
});
