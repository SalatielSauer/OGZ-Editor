//OGZ Raw Editor by Salatiel

//Converters
function floatHex(val){
    const getHex = i => ('00' + i.toString(16)).slice(-2);
    var view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, val);
    return Array.apply(null, { length: 4 }).map((_, i) => getHex(view.getUint8(i))).reverse().join('');
}

function hexInt(val){
    const bytes = new Uint8Array(val.toString().split(""));
    const uint = new Uint32Array(bytes.buffer)[0];
    return uint;
}

function intHex(val, byte) {
    val = parseInt(val);
    return val.toString(16).padStart(byte, '0').match(/.{2}/g).reverse().join('')
}

function strHex(val){
    return val.split("").reduce((hex,c)=>hex+=c.charCodeAt(0).toString(16).padStart(2,"0"),"")
}

function hexBtify(val){
     val = val.replace(/(.{32})/g,"$1\n").replace(/(.{4})/g,"$1 ");
     return val.replace(/\s\n/g, "\n");
}
//console.log(intHex(1024, 8), strHex("skybox"))


//Formatters
function formathead(worldsize, numents, numpvs, lightmaps, blendmap, numvars){
    rawheaddata = "4f4354411d00000024000000"
    try {
        for (i = 0; i < arguments.length; i++){rawheaddata += intHex(arguments[i], 8)}
    } finally {return rawheaddata;}
}
//formathead(1024, 1, 0, 0, 0, 1);

//gameident: 03666707300

function formatvar(type, id, val) {
   return intHex(type, 2) + intHex(id.length, 4) + strHex(id) + intHex(val.length, 4) + strHex(val)
}
//formatvar(2, "skybox", "ik2k/env/iklake")

//extras: 00000000

//texture mru: 050002000400030005000700

entitiesarray = ["empty", "light", "mapmodel", "playerstart", "envmap", "particles", "sound", "spotlight", "gamespecific"]
function formatent(xyz, attrs, type) {
    xyz = xyz.split(" ");
    attrs = attrs.split(" ");
    if (entitiesarray.indexOf(type) == -1){type = "empty";};
    return floatHex(xyz[0]) + floatHex(xyz[1]) + floatHex(xyz[2]) + intHex(attrs[0], 4) + intHex(attrs[1], 4) + intHex(attrs[2], 4) + intHex(attrs[3], 4) + intHex(attrs[4], 4) + intHex(entitiesarray.indexOf(type), 2) + "00";
}

//formatent("972 972 516", "336 0 0 0 0", 3)

function formatoctree(type, textures, mask){
    textures = textures.split(" ");
    textureraw = "";
    try {
        for (t = 0; t < textures.length; t++){textureraw += intHex(textures[t], 2) + "00"};
    } finally {
        return intHex(type, 2) + textureraw + intHex(mask, 2)
    }
}

//formatoctree(2, "2 3 4 5 6 7", 0)