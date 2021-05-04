/*	interface for jsogz.js with a simple error catcher.
	by @SalatielSauer	*/

var today = new Date()
var pako = window.pako
var downloadbtn = document.querySelector("#downloadbtn")
var inputarea = document.querySelector("#inputarea")

inputarea.value = `{
	"mapsize": 1024,
	"mapvars": {
		"skybox": "staffy/staffy",
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
	},
	"geometry": [
		{"solid": {"allfaces": 1, "textures": "9"}},
		"solid",
		"solid",
		"solid"
	]
}`

document.querySelector("#writedata").onclick = (e=>{translateinput()})

// JSON error catcher

function pusherrorlbl(state, pos) {
	errorlbl = document.getElementById("errorlbl")
	if (state == 0) {
		errorlog.style.display = errorlbl.style.display = "none"
		inputarea.classList.remove("error")
	} else {
		errorlog.style.display = errorlbl.style.display = "unset"
		inputarea.classList.add("error")
	}
	errorlbl.innerHTML = formattext(inputarea.value.slice(0, pos), "#04ff0057", "#00000029") + formattext(inputarea.value.slice(pos, pos + 1), "red", "black") + formattext(inputarea.value.slice(pos + 1), "#ff000057", "#00000029")
	errorlbl.scrollTop = inputarea.scrollTop
}

function formattext(str, bcolor, tcolor) {
	return bcolor ? `<span style='background-color: ${bcolor}; color: ${tcolor}'>${str}</span>` : `<span style='color: lightblue; background-color: black; padding-right: 5px; padding-left: 5px;'>${str}</span>`
}

function pusherrorlog(er) {
	if (inputarea.value[0] != "{") {inputarea.value = "{" + inputarea.value; translateinput(); return}
	if (inputarea.value[inputarea.value.length - 1] != "}") {inputarea.value += "}"; translateinput(); return}

	er = er.toString().replace("SyntaxError:", formattext("<strong>Syntax Error</strong>:"))
	er = er.replace("token", "<span style='color: red;'><strong>token</strong></span>")
	er = er.replace("string", "<span style='color: red;'><strong>string</strong></span>")

	errorlog = document.getElementById("errorlog")
	errorlog.innerHTML = `<p>OGZ Editor report:<br>${er}</p>`
	epos = parseInt(er.substr(er.lastIndexOf("position "), er.length).split(" ")[1]) || 0
	inputarea.selectionEnd = inputarea.selectionStart = epos
	pusherrorlbl(1, epos)
	jsontext = inputarea.value
	if (jsontext[epos - (epos != 0)] == '"') {errorlog.innerHTML += `<p>Did you mean ${formattext("\",")} instead of ${formattext(jsontext[epos])}?</p>`}
	if (jsontext[epos - (epos != 0)].match(/[^a-zA-Z ]+/)) {
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

inputarea.onscroll = (e)=>{errorlbl.scrollTop = inputarea.scrollTop}

var keylog = []
inputarea.onkeyup = (e)=>{
	var keyCode = e.keyCode || e.which
	keylog.splice(keylog.indexOf(keyCode), 1)
}

function insertValue(target, value) {
	target.value = target.value.substring(0, target.selectionStart) + value + target.value.substring(target.selectionEnd)
}

inputarea.onkeydown = (e)=>{
	pusherrorlbl(0)
	var keyCode = e.keyCode || e.which
	if (!keylog.includes(keyCode)) {keylog.push(keyCode)}

	// allow indentation with tabs
	var tabKey = keylog.includes(9)
	var shiftKey = keylog.includes(16)
	if (tabKey || shiftKey) {
		var editor = e.target
		var previousCaret = {start: editor.selectionStart, end: editor.selectionEnd}
		var selectedValue = editor.value.substring(editor.selectionStart, editor.selectionEnd)
		var modifiedValue = editor.value
		if (tabKey && shiftKey) {
			e.preventDefault()
			if (editor.selectionStart == editor.selectionEnd) {	
				editor.value = editor.value.substring(0, editor.selectionStart-1) + editor.value.substring(editor.selectionEnd)
				editor.selectionEnd = editor.selectionStart = previousCaret.start-1
			} else if (selectedValue.match(/(^.*?)(\t)/gm)) {
				insertValue(editor, selectedValue.replace(/(^.*?)(\t)/gm, ""))
				editor.selectionStart = previousCaret.start
				editor.selectionEnd = previousCaret.end - modifiedValue.split(/(^.*?)(\t)/).length
			}
		}
		if (tabKey && !shiftKey) {
			e.preventDefault()
			if (editor.selectionStart == editor.selectionEnd) {
				insertValue(editor, "\t")
				editor.selectionStart = editor.selectionEnd = previousCaret.start+1
			} else {
				insertValue(editor, selectedValue.replace(/^/gm, "\t"))
				editor.selectionStart = previousCaret.start
				editor.selectionEnd = previousCaret.end + modifiedValue.split(/\r\n|\r|\n/).length
			}
		}
	}
}

function hexBeautify(val) {
	if (val) {
		val = val.replace(/(.{32})/g,"$1\n").replace(/(.{4})/g,"$1 ")
		return val.replace(/\s\n/g, "\n")
	}
}

function translateinput() {
	var rawtextarea = document.getElementById("mapdata")
	var hexcolumns = hexBeautify(JSOGZ(inputarea.value, 0, (e)=>{pusherrorlog(e)})) // adds spaces in the preview
	if (hexcolumns) {
		rawtextarea.value = hexcolumns
		downloadbtn.style.display = "unset"
		inputarea.classList.add("update")
		preparedownload(JSOGZ(inputarea.value, 2, (e)=>{pusherrorlog(e)})) // using JSOGZ with pako to compress the byte array as gzip (.ogz)
	}
}

function preparedownload(data) {
	var filename = "mynewmap.ogz"
	var blob = new Blob([data], {
		type : "application/octet-stream",
	})

	if (window.navigator.msSaveBlob) {
		navigator.msSaveBlob(blob, fileName)
	} else {
		downloadbtn.setAttribute("download", filename)
		downloadbtn.setAttribute("href", URL.createObjectURL(blob))
		setTimeout(()=>{inputarea.classList.remove("update")}, 100)
	}
}