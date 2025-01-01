/*
If you intend to export objects from Blender (blender.org) to .ogz, you can use Sauer-Vertex
( https://gist.github.com/SalatielSauer/ba1d96e664b7accbeaae3a504acecdc0 ),
Sauer-Vertex is an addon for blender 2.79 and 2.80+ that exports the vertices and textures of a
selected object to a .json that you can upload in the OGZ Editor and save as .ogz.
Example: https://raw.githubusercontent.com/SalatielSauer/misc/master/sauervertex_9.png
*/

mapvars({
	'maptitle': 'Untitled Map by OGZ Editor',
    'mapsize': 1024
});

entities([

]);

geometry(()=>{
	let map = [];
	// tip: if you have multiple meshes and need to export their .json individually, upload the .json files and reference their indexes in additional map.push
	map.push(ogzeditor.asset.json[ogzeditor.asset.json.length-1].geometry); // get the last uploaded json file
	return map;
});
