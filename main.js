//OGZ Raw Editor by Salatiel

window.onload = function(){
    jsontextarea = document.getElementById("jsondata");
    jsontextarea.value = '{\n"mapsize": 1024,\n"mapvars": {\n\t"skybox": "skyboxes/white",\n\t"maptitle": "Untitled Map by OGZ Editor"\n},\n"entities": {\n\t"particles": {\n\t\t"position": "512 512 512",\n\t\t"attributes": "0 0 0 0xFF00 0"\n\t},\n\t"mapmodel": {\n\t\t"position": "532 532 512",\n\t\t"attributes": "110 50 0 0 0"\n\t}\n}\n}';
    downloadbtn = document.getElementById("downloadbtn");
}

function setCaretPosition(ctrl, pos) {if (ctrl.setSelectionRange) {ctrl.focus(); ctrl.setSelectionRange(pos, pos);} else if (ctrl.createTextRange) {var range = ctrl.createTextRange(); range.collapse(true);range.moveEnd('character', pos); range.moveStart('character', pos); range.select();}}

function pusherrorlbl(state, pos){
    errorlbl = document.getElementById("errorlbl");
    if (state == 0){
        errorlog.style.display = errorlbl.style.display = "none";
    } else {
        errorlog.style.display = errorlbl.style.display = "unset";
    };
    errorlbl.innerHTML = "<span style='background-color: #04ff0057; color: #00000029'>" + jsontextarea.value.slice(0, pos) + '</span><span style="background-color: red; color: black">' + jsontextarea.value.slice(pos, pos + 1) + "</span><span style='background-color: #ff000057; color: #00000029'>" + jsontextarea.value.slice(pos + 1) + "</span>";
    errorlbl.scrollTop = jsontextarea.scrollTop;
}

function formattext(str){
    return "<span style='color: lightblue;background-color: black;padding-right: 5px;padding-left: 5px;'>" + str + "</span>";
}

function pusherrorlog(er){
    er = er.toString().replace("SyntaxError:", formattext("<strong>Syntax Error</strong>:"));
    er = er.replace("token", "<span style='color: red;'><strong>token</strong></span>");
    er = er.replace("string", "<span style='color: red;'><strong>string</strong></span>");

    errorlog = document.getElementById("errorlog");
    errorlog.innerHTML = "<p>OGZ Editor report:<br>" + er + "</p>";

    epos = parseInt(er.substr(er.lastIndexOf("position "), er.length).split(" ")[1]);
    if (jsontextarea.value[epos - 1] == '"'){errorlog.innerHTML += "<p>Did you mean " + formattext("\",") + " instead of " + formattext("\"" + jsontextarea.value[epos]) + "?</p>";};
    if (jsontextarea.value[epos - 1].match(/[^a-zA-Z ]+/)){errorlog.innerHTML += "<p>Maybe you need to remove " + formattext(jsontextarea.value[epos]) + " from there...</p>";};
    jsontextarea.focus();
    setCaretPosition(jsontextarea, epos);
    pusherrorlbl(1, epos);
}
function readJSON(){
    try {
        JSON.parse(jsontextarea.value);
    } catch (e) {
        pusherrorlog(e);
        return false;
    };
    jsondata = JSON.parse(jsontextarea.value);

    mapdata = "";

    //Header
    mapdata += formathead(jsondata.mapsize, Object.keys(jsondata.entities).length, 0, 0, 0, Object.keys(jsondata.mapvars).length);
    
    //Mapvars
    for (var key of Object.keys(jsondata.mapvars)) {
        //val = jsondata.mapvars[key];
        //if (typeof val == "number"){if (Number.isInteger(val)){type = 0} else {type = 1};} else {type = 2};
        mapdata += formatvar(2, key, jsondata.mapvars[key])
    };

    //Gameident
    mapdata += "0366707300"; 

    //Extras(?) & texture mru
    mapdata += "00000000" + "050002000400030005000700";

    //Entities
    for (var key of Object.keys(jsondata.entities)) {
        mapdata += formatent(jsondata.entities[key].position, jsondata.entities[key].attributes, key)
    };

    //Octree
    mapdata += formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0);
    mapdata += formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0);

    rawtextarea = document.getElementById("mapdata");
    rawtextarea.value = hexBtify(mapdata);

    //still need a way to properly convert all content to type "data" instead of "Ascii Text", this should make the pako work correctly, thus allowing the direct download of the ogz file.
    //compressRaw(rawtextarea.value);
    if (rawtextarea.value.length > 0){downloadbtn.style.display = "unset";}
    download(rawtextarea.value);
}

function download(data){
    fileName = "mynewmap.oct";
    var blob = new Blob([ data ], {
        type : "octet/stream",
    });

    if (window.navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, fileName);
    } else {
        var csvUrl = URL.createObjectURL(blob);
        $('#downloadbtn').attr({
            'download': fileName,
            'href': csvUrl
        });
    };
}