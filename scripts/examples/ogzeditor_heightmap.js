
// Instead of handling the colors manually, we can use the ogzeditor.image function which already does all the work behind the scenes.

mapvars({
	'skyboxcolour': [0, 0, 0],
	'sunlight': [200, 200, 200],
	'skylight': [100, 100, 100],
	'ambient': [0, 0, 0],
	'sunlightpitch': 70,
	'sunlightyaw': 320,
	'maptitle': 'OGZ Editor Heightmap Helper example'
});

entities([]);

// draws image with index A, quality B, at position CxDxE with gridpower F.
// G (yaw), H (pitch) and I (roll) are related to the image orientation, J is the heightmap max height.
geometry(() => ogzeditor.image(0, [16, 10], 512, 512, 512, 1, 0, 90, 0, 3, 0, false));