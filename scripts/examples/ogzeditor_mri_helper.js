
// This preset uses the image helper to draw a sequence of images on different layers.
// You can upload MRI (Magnetic Resonance Imaging) sequences to reconstruct the model in-game.
// example: https://i.imgur.com/UtRFtHB.gif

mapvars({
	'skyboxcolour': [0, 0, 0],
	'skylight': [255, 255, 255],
	'maptitle': 'OGZ Editor MRI Helper example',
	'mapsize': 1024
});

entities([]);

geometry(() => ogzeditor.image([0, ogzeditor.asset.frames.length], 35, 512, 512, 0, 0, 0, 90, 0, 1, 2, true, 3, (pixel) => {
    return (pixel.heightValue >= 5);
}));