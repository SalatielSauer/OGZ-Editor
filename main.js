//OGZ Raw Editor by Salatiel

jsontextarea = document.getElementById("jsondata");
jsontextarea.value = '{\n"mapsize": 1024,\n"mapvars": {\n\t"skybox": "skyboxes/white",\n\t"maptitle": "Untitled Map by OGZ Editor"\n},\n"entities": {\n\t"particles": {\n\t\t"position": "512 512 512",\n\t\t"attributes": "0 0 0 0xFF00 0"\n\t},\n\t"mapmodel": {\n\t\t"position": "532 532 512",\n\t\t"attributes": "110 50 0 0 0"\n\t}\n}\n}';
downloadbtn = document.getElementById("downloadbtn");

function setCaretPosition(ctrl, pos) {if (ctrl.setSelectionRange) {ctrl.focus(); ctrl.setSelectionRange(pos, pos);} else if (ctrl.createTextRange) {var range = ctrl.createTextRange(); range.collapse(true);range.moveEnd('character', pos); range.moveStart('character', pos); range.select();}}

function pusherrorlbl(state, pos){
    errorlbl = document.getElementById("errorlbl");
    if (state == 0){
        errorlog.style.display = errorlbl.style.display = "none";
    } else {
        errorlog.style.display = errorlbl.style.display = "unset";
    };
    errorlbl.innerHTML = formattext(jsontextarea.value.slice(0, pos), "#04ff0057", "#00000029") + formattext(jsontextarea.value.slice(pos, pos + 1), "red", "black") + formattext(jsontextarea.value.slice(pos + 1), "#ff000057", "#00000029");
    errorlbl.scrollTop = jsontextarea.scrollTop;
}

function formattext(str, bcolor, tcolor){
    return bcolor ? "<span style='background-color: " + bcolor + "; color: " + tcolor + "'>" + str + "</span>" : "<span style='color: lightblue;background-color: black;padding-right: 5px;padding-left: 5px;'>" + str + "</span>";
}

function pusherrorlog(er){
	if (jsontextarea.value[0] != "{") {jsontextarea.value = "{" + jsontextarea.value; readJSON(); return};
	if (jsontextarea.value[jsontextarea.value.length - 1] != "}") {jsontextarea.value += "}"; readJSON(); return};

    er = er.toString().replace("SyntaxError:", formattext("<strong>Syntax Error</strong>:"));
    er = er.replace("token", "<span style='color: red;'><strong>token</strong></span>");
    er = er.replace("string", "<span style='color: red;'><strong>string</strong></span>");

    errorlog = document.getElementById("errorlog");
    errorlog.innerHTML = "<p>OGZ Editor report:<br>" + er + "</p>";
    epos = parseInt(er.substr(er.lastIndexOf("position "), er.length).split(" ")[1]) || 0;
    setCaretPosition(jsontextarea, epos);
    pusherrorlbl(1, epos);
    jsontext = jsontextarea.value;
	if (jsontext[epos - (epos != 0)] == '"'){errorlog.innerHTML += "<p>Did you mean " + formattext("\",") + " instead of " + formattext("\"" + jsontext[epos]) + "?</p>";};
	if (jsontext[epos - (epos != 0)].match(/[^a-zA-Z ]+/)){
		if (jsontext[epos] == ("" || "\n")) {
			errorlog.innerHTML += "<p>You may need to add a " + formattext("\"") + " somewhere...</p>"
			errorlbl.innerHTML = formattext(errorlbl.innerText.slice(0, epos), "#04ff0057", "#00000029") + "<span style='color: grey; background-color: #1f252aa6'>  << did you mean " + formattext("\"" + jsontext.substring(jsontext.lastIndexOf("\"", epos) + 1, epos).replace(/[a-zA-Z]|[0-9]+/g, "").replace(/\s/g, "")) + "?</span>\n" + formattext(errorlbl.innerText.slice(epos + 1), "#ff000057", "#00000029");
		} else if (epos != 0) {
			errorlog.innerHTML += "<p>Maybe you need to remove " + formattext(jsontext[epos]) + " from there...</p>";
		}
	}

	if (! epos) {
		if (er.includes("Unexpected end of JSON")) {errorlog.innerHTML += "<p>Maybe you forgot to add a bracket there...</p>"}
		if (errorlbl.innerText[errorlbl.innerText.length - 1] != ("" || "\n")) {errorlbl.innerText += "\n"}
		errorlbl.innerHTML += "<span style='color: grey'>} << missing bracket(s)?</span>";
	}
    
    jsontextarea.focus();
    
}

function readJSON(){
    try {
        JSON.parse(jsontextarea.value);
    } catch (e) {
        pusherrorlog(e);
        return
    }
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

    if (rawtextarea.value.length > 0){downloadbtn.style.display = "unset";}
    //removes spaces to convert correctly later
    compressRaw(rawtextarea.value.replace(/\s/g, ""));
    //download(rawtextarea.value.replace(/\s/g, ""));
}

function download(data){
    fileName = "mynewmap.ogz";
    var blob = new Blob([ data ], {
        type : "application/octet-stream",
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