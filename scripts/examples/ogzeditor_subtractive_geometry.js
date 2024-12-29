
// This preset starts with full geometry and selectively removes chunks to create structured patterns.

mapvars({
	"maptitle": `\f8*thirdevermap*`,
	"skyboxcolour": [0, 0, 0],
	"ambient": [1, 1, 1],
	"mapsize": 2048
});

const ents = [{x: 1120, y: 1120, z: 900, t: 3, at0: 135}];

geometry(()=>{
    let cubes = [];
    ogzeditor.loopmap(1024, 9, (x, y, z) => cubes.push({x, y, z, g: 9, tp: 2, ft: 3, rt: 4, lf: 5, bk: 6, dn: 7}));

    ogzeditor.loopmap(1024, 7, (x, y, z, i) => {
        if (i%2) {
            cubes.push({x, y, z, g: 7, t: 1});
            ents.push({x, y, z: z+5, t: 1, at0: 200, at1: z/(i/90), at2: y/(i/90), at3: x/10});
        }
    });
    
    ogzeditor.loopmap(1024, 6, (x, y, z, i) => {
        if (i%2) cubes.push({x, y, z, g: 6, t: 1});
    });
    
    ogzeditor.loopmap(1024, 6, (x, y, z, i) => {
        if ((x+y+z)/3 % 2 ) cubes.push({x, y, z, g: 6, t: 1});
    });
    
    ogzeditor.loopmap(1024, 5, (x, y, z, i) => {
        if ((x+y+z)/3 % 2 && i%2 ) {
            cubes.push({x, y, z, g: 5, t: 1});
        }
    });
	return cubes;
});

entities(ents);