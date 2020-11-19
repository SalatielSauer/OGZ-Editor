// OGZ Editor by Salatiel

var today = new Date()
var jsontextarea = document.getElementById("jsondata")
jsontextarea.value = '{\n"mapsize": 1024,\n"mapvars": {\n\t"skybox": "skyboxes/white",\n\t"maptitle": "Untitled Map by OGZ Editor (' + today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear() +')"\n},\n"entities": {\n\t"particles": {\n\t\t"position": "512 512 530",\n\t\t"attributes": "0 0 0 0xFFFF 0"\n\t},\n\t"mapmodel": {\n\t\t"position": "512 512 512",\n\t\t"attributes": "180 172 0 0 0"\n\t},\n\t"mapmodel": {\n\t\t"position": "512 512 528",\n\t\t"attributes": "90 177 0 0 0"\n\t}\n}\n}'
var downloadbtn = document.getElementById("downloadbtn")
var pako = window.pako

// JSON error catcher
function setCaretPosition(ctrl, pos) {
	if (ctrl.setSelectionRange) {
		ctrl.focus(); ctrl.setSelectionRange(pos, pos)
	} else if (ctrl.createTextRange) {
		var range = ctrl.createTextRange()
		range.collapse(true)
		range.moveEnd('character', pos)
		range.moveStart("character", pos)
		range.select()
	}
}

function pusherrorlbl(state, pos){
	errorlbl = document.getElementById("errorlbl");
	if (state == 0){
		errorlog.style.display = errorlbl.style.display = "none"
	} else {
		errorlog.style.display = errorlbl.style.display = "unset"
	}
	errorlbl.innerHTML = formattext(jsontextarea.value.slice(0, pos), "#04ff0057", "#00000029") + formattext(jsontextarea.value.slice(pos, pos + 1), "red", "black") + formattext(jsontextarea.value.slice(pos + 1), "#ff000057", "#00000029")
	errorlbl.scrollTop = jsontextarea.scrollTop
}

function formattext(str, bcolor, tcolor){
	return bcolor ? `<span style='background-color: ${bcolor}; color: ${tcolor}'>${str}</span>` : `<span style='color: lightblue; background-color: black; padding-right: 5px; padding-left: 5px;'>${str}</span>`;
}

function pusherrorlog(er){
	if (jsontextarea.value[0] != "{") {jsontextarea.value = "{" + jsontextarea.value; readJSON(); return;}
	if (jsontextarea.value[jsontextarea.value.length - 1] != "}") {jsontextarea.value += "}"; readJSON(); return;}

	er = er.toString().replace("SyntaxError:", formattext("<strong>Syntax Error</strong>:"))
	er = er.replace("token", "<span style='color: red;'><strong>token</strong></span>")
	er = er.replace("string", "<span style='color: red;'><strong>string</strong></span>")

	errorlog = document.getElementById("errorlog")
	errorlog.innerHTML = `<p>OGZ Editor report:<br>${er}</p>`
	epos = parseInt(er.substr(er.lastIndexOf("position "), er.length).split(" ")[1]) || 0
	setCaretPosition(jsontextarea, epos)
	pusherrorlbl(1, epos)
	jsontext = jsontextarea.value
	if (jsontext[epos - (epos != 0)] == '"'){errorlog.innerHTML += `<p>Did you mean ${formattext("\",")} instead of ${formattext(jsontext[epos])}?</p>`;}
	if (jsontext[epos - (epos != 0)].match(/[^a-zA-Z ]+/)){
		if (jsontext[epos] == ("" || "\n")) {
			errorlog.innerHTML += `<p>You may need to add a ${formattext("\"")} somewhere...</p>`
			errorlbl.innerHTML = formattext(errorlbl.innerText.slice(0, epos), "#04ff0057", "#00000029") + "<span style='color: grey; background-color: #1f252aa6'>  << did you mean " + formattext("\"" + jsontext.substring(jsontext.lastIndexOf("\"", epos) + 1, epos).replace(/[a-zA-Z]|[0-9]+/g, "").replace(/\s/g, "")) + "?</span>\n" + formattext(errorlbl.innerText.slice(epos + 1), "#ff000057", "#00000029")
		} else if (epos != 0) {
			errorlog.innerHTML += `<p>Maybe you need to remove ${formattext(jsontext[epos])} from there...</p>`
		}
	}

	if (! epos) {
		if (er.includes("Unexpected end of JSON")) {errorlog.innerHTML += "<p>Maybe you forgot to add a bracket there...</p>"}
		if (errorlbl.innerText[errorlbl.innerText.length - 1] != ("" || "\n")) {errorlbl.innerText += "\n"}
		errorlbl.innerHTML += "<span style='color: grey'>} << missing bracket(s)?</span>"
	}

	jsontextarea.focus();

}

// Reads JSON, formats its values and concatenates everything as a raw version of a map file (.ogz)
function readJSON(){
	try {
		JSON.parse(jsontextarea.value)
	} catch (e) {
		pusherrorlog(e)
		return;
	}
	plainjson = jsontextarea.value;
	for (e = 0; e < entitiesarray.length; e++) {
		n = 0
		enttype = new RegExp(entitiesarray[e], "g")
		plainjson = plainjson.replace(enttype, et=>{return et + n++})
	}
	jsondata = JSON.parse(plainjson)

	mapdata = ""

	// Header
	mapdata += formathead(jsondata.mapsize, Object.keys(jsondata.entities).length, 0, 0, 0, Object.keys(jsondata.mapvars).length)

	// Mapvars
	for (var key of Object.keys(jsondata.mapvars)) {
		mapdata += formatvar(2, key, jsondata.mapvars[key])
	}

	// Gameident
	mapdata += "0366707300"

	// Extras(?) & texture mru
	mapdata += "00000000" + "050002000400030005000700"

	// Entities
	for (var key of Object.keys(jsondata.entities)) {
		mapdata += formatent(jsondata.entities[key].position, jsondata.entities[key].attributes, key)
	}

	// Octree
	mapdata += formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0) + formatoctree(2, "2 3 4 5 6 7", 0)
	mapdata += formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0) + formatoctree(1, "0 0 0 0 0 0", 0)

	rawtextarea = document.getElementById("mapdata")
	rawtextarea.value = hexBeautify(mapdata)	// adds spaces in the preview
	if (rawtextarea.value.length > 0) {downloadbtn.style.display = "unset";}

	preparedownload(pako.gzip(hextoByte(mapdata)));	// uses pako to compress the byte array as gzip (.ogz)
}

function preparedownload(data){
	fileName = "mynewmap.ogz"
	var blob = new Blob([ data ], {
		type : "application/octet-stream",
	});

	if (window.navigator.msSaveBlob) {
		navigator.msSaveBlob(blob, fileName)
	} else {
		var csvUrl = URL.createObjectURL(blob);
		$("#downloadbtn").attr({
			"download": fileName,
			"href": csvUrl
		})
	}
}