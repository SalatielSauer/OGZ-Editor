
/*
You can run this script using the "Save .OGZ" button. OGZ Editor will generate the .OGZ file from the output of each function and provide it for you to download.
Maps can be loaded in your client by performing the following steps:
	1. Place the .OGZ files in the packages/base folder of your Sauerbraten or in the media/map of your Tesseract.
	2. Use the /coop command or the /map command followed by the name of the .OGZ file in the game console to load the map.
*/
// Modify the functions below to change the aspects of the .OGZ file:
const TODAY_DATE = new Date().toLocaleDateString();
mapvars({
	"maptitle": `\f8Untitled Map by OGZ Editor \f2(${TODAY_DATE})\n\f5salatielsauer.github.io/OGZ-Editor/`,
	"skyboxcolour": [0, 0, 0]
});

entities([
	{"x": 516, "y": 516, "z": 560, "t": 2, "at1": 116}, // floorgrate3 (116) mapmodel (t: 2)
	{"x": 516, "y": 516, "z": 560, "t": 3, "at0": 180}  // playerstart (t: 3)
]);

/*
You can use helper functions to generate arrays and objects:
ogzeditor.ground(texture) // returns an [array] containing four 512x512 cubes with given texture.
ogzeditor.cube(x, y, z, texture, gridpower) // returns an {object} containing a single cube with given properties.
ogzeditor.text(text, x, y, z, texture, gridpower, yaw, pitch, roll) // returns an [array] containing cubes that form a given text.
*/
const RANDOM_TEXTURE = () => Math.round(Math.random()*1704);
geometry(()=>{
	let cubes = ogzeditor.ground(6);
	let gridpower = 3;
	for (let i = 0; i <= 5; i += 1) {
		cubes.push(ogzeditor.cube(512, 512, 512 + (1 << gridpower)*i, RANDOM_TEXTURE(), gridpower)); // tower of cubes
		cubes.push(ogzeditor.sphere(350, 390, 630, 0, RANDOM_TEXTURE(), 32-(1 << gridpower)*i));	 // spheres within spheres
	}
	cubes.push(ogzeditor.text(`^f0>^f1OGZ Editor\n^f0>^f3${TODAY_DATE}`, 400, 390, 630, 1460, 2));
	cubes.push(ogzeditor.text(`^f7this is an ^f0editable ^f~text\n^f~with ^f0>^f1c^f2o^f3l^f4o^f5r^f6s^f8< ^f~support! ^f8:)`, 400, 390, 560, 1462, 0));
	cubes.push(_addKleinBottle(512, 600, 800, 1, 1711, 32, 64, 128));
	cubes.push(ogzeditor.text(`^f7Klein Bottle`, 650, 512, 920, 1462, 2, 180, -30));
	return cubes;
});