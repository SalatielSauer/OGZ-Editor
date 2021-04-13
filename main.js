/*	interface for jsogz.js with a simple error catcher.
	by @SalatielSauer	*/

var today = new Date()
var pako = window.pako
var downloadbtn = document.querySelector("#downloadbtn")
var inputarea = document.querySelector("#inputarea")

inputarea.value = `{
	"mapsize": 1024,
	"mapvars": {
		"skybox": "skyboxes/white",
		"maptitle": "Untitled Map by OGZ Editor (${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()})"
	},
	"entities": {
		"particles": {
			"position": "512 512 530",
			"attributes": "0 0 0 0xFFFF 0"
		},
		"mapmodel": {
			"position": "512 512 512",
			"attributes": "180 172 0 0 0"
		},
		"mapmodel": {
			"position": "512 512 528",
			"attributes": "90 177 0 0 0"
		}
	}
}`

document.querySelector("#writedata").onclick = (e=>{translateinput()})

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
	errorlbl.innerHTML = formattext(inputarea.value.slice(0, pos), "#04ff0057", "#00000029") + formattext(inputarea.value.slice(pos, pos + 1), "red", "black") + formattext(inputarea.value.slice(pos + 1), "#ff000057", "#00000029")
	errorlbl.scrollTop = inputarea.scrollTop
}

function formattext(str, bcolor, tcolor){
	return bcolor ? `<span style='background-color: ${bcolor}; color: ${tcolor}'>${str}</span>` : `<span style='color: lightblue; background-color: black; padding-right: 5px; padding-left: 5px;'>${str}</span>`;
}

function pusherrorlog(er){
	if (inputarea.value[0] != "{") {inputarea.value = "{" + inputarea.value; translateinput(); return}
	if (inputarea.value[inputarea.value.length - 1] != "}") {inputarea.value += "}"; translateinput(); return}

	er = er.toString().replace("SyntaxError:", formattext("<strong>Syntax Error</strong>:"))
	er = er.replace("token", "<span style='color: red;'><strong>token</strong></span>")
	er = er.replace("string", "<span style='color: red;'><strong>string</strong></span>")

	errorlog = document.getElementById("errorlog")
	errorlog.innerHTML = `<p>OGZ Editor report:<br>${er}</p>`
	epos = parseInt(er.substr(er.lastIndexOf("position "), er.length).split(" ")[1]) || 0
	setCaretPosition(inputarea, epos)
	pusherrorlbl(1, epos)
	jsontext = inputarea.value
	if (jsontext[epos - (epos != 0)] == '"'){errorlog.innerHTML += `<p>Did you mean ${formattext("\",")} instead of ${formattext(jsontext[epos])}?</p>`}
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

	inputarea.focus()
}

function hexBeautify(val){
	if (val) {
		val = val.replace(/(.{32})/g,"$1\n").replace(/(.{4})/g,"$1 ");
		return val.replace(/\s\n/g, "\n");
	}
}

function translateinput() {
	rawtextarea = document.getElementById("mapdata")
	var hexcolumns = hexBeautify(getOGZ(inputarea.value, 0, (e)=>{pusherrorlog(e)}))	// adds spaces in the preview
	if (hexcolumns) {
		rawtextarea.value = hexcolumns
		downloadbtn.style.display = "unset"
		preparedownload(getOGZ(inputarea.value, 2, (e)=>{pusherrorlog(e)}));	// using JSOGZ with pako to compress the byte array as gzip (.ogz)
	}
}

function preparedownload(data){
	fileName = "mynewmap.ogz"
	var blob = new Blob([data], {
		type : "application/octet-stream",
	})

	if (window.navigator.msSaveBlob) {
		navigator.msSaveBlob(blob, fileName)
	} else {
		downloadbtn.setAttribute("download", fileName)
		downloadbtn.setAttribute("href", URL.createObjectURL(blob))
	}
}