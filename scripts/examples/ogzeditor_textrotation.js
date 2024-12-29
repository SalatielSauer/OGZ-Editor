

mapvars({
	"maptitle": `\f8Simple Text Yaw/Pitch/Roll rotation.`,
	"skyboxcolour": [0, 0, 0]
});

entities([
	{x: 512, y: 650, z: 512, t: 3, at0: 180}
]);

geometry(()=>{
	let cubes = ogzeditor.ground(6);
	let color = 0;
	for (let i = 0; i < 19; i++) {
		// texts can be rotated on 3 axes: yaw, pitch and roll.
		cubes.push(ogzeditor.text(`^f${color}----^f~OGZ Editor----`, 512+(i*5), 512-(i*5), 600-i, 1462, 1, 0, i*10, i*10))
		color = color == 8 ? 0 : color+1;
	}

	return cubes;
});