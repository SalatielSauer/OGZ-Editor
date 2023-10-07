class StatusFeedback {
	constructor(element) {
		this.element = document.querySelector(element);
	}

	update(state, icon, text, buttons = []) {
		// reset animations
		this.elementBuff = this.element;
		this.element.parentNode.replaceChild(this.element, this.elementBuff);
		this.icon = icon || "";
		this.text = text || "";
		this.state = state || 0;
		this.element.innerHTML = `<i class="${this.icon}"></i> ${this.text}${buttons.length ? "<br>" : ""}`;
		buttons.forEach(button => {
			let element_button = document.createElement(button.element || "button");
			if (button.id) {
				element_button.id = button.id;
			}
			element_button.textContent = button.text;
			element_button.addEventListener("click", (e) => button.onclick(e));
			this.element.appendChild(element_button);
		})
		this.element.classList.remove("element-fadein", "element-fadeout", "element-stayin");
		this.element.classList.add(this.state ? (buttons.length ? "element-stayin" : "element-fadein") : "element-fadeout");
	}
}

function addButton(selector, onclick) {
	let element = document.querySelector(selector);
	element.onclick = (event) => {
		onclick();
	};
}

const TextEditor = new Editor("#editor", "#highlight-content");
const FS = new FileSystem();
const FS_fileName = document.querySelector("#filesystem-file");
const FS_fileStatus = new StatusFeedback("#filesystem-status");
const Time = new Date();

// sample map
TextEditor.updateText(
	`{
	"version": 1,
	"map": {
		"mapsize": 1024,
		"mapvars": {
			"skybox": "skyboxes/white",
			"maptitle": "Untitled Map by OGZ Editor (${Time.getDate().toString().padStart(2, "0")}/${(Time.getMonth()+1).toString().padStart(2, "0")}/${Time.getFullYear()})",
			"atmo": 1,
			"sunlight": [255, 255, 255]
		},
		"entities": [
			{"position": [512, 512, 530], "attributes": ["particles", 0, 0, 0, "0xFFF", 0]},
			{"position": [512, 512, 512], "attributes": ["mapmodel", 0, 172, 0, 0, 0]},
			{"position": [512, 512, 528], "attributes": ["mapmodel", 270, 177, 0, 0, 0]},
			{"position": [240, 16, 512], "attributes": ["mapmodel", 0, 13, 0, 0, 0]},
			{"position": [240, 16, 512], "attributes": ["jumppad", 16, 0, 0, 0, 0]},
			{"position": [208, 16, 544], "attributes": ["mapmodel", 0, 161, 0, 0, 0]},
			{"position": [208, 16, 544], "attributes": ["jumppad", 16, 0, 0, 0, 0]},
			{"position": [160, 32, 576], "attributes": ["mapmodel", 0, 160, 0, 0, 0]},
			{"position": [160, 32, 576], "attributes": ["jumppad", 32, 0, 0, 0, 0]},
			{"position": [64, 64, 640], "attributes": ["teleport", 2, 0, 0, 0, 0]},
			{"position": [512, 448, 512], "attributes": ["teledest", 0, 2, 0, 0, 0]}
		],
		"geometry": [
			{"solid": {"textures": [1]}},
			"solid",
			"solid",
			"solid",
			[
				[ 
					{"solid": {"textures": [9]}},
					[
						{"solid": {"textures": [1, 2, 3, 4, 5, 6], "edges": {"back": [2, 2, 2, 2], "left": [2, 0, 2], "right": [0, 2, 0, 2]}}},
						[ {"solid": {"textures": [842]}} ]
					]
				 ]
			]
		]
	}
}`
);

function getJSOCTAVersion(object) {
	switch(object.version || 2) {
		case 1: return OctaMap;
		case 2: return QuickOGZ;
	};
}

function jsonToOGZ(json) {
	let JSOCTA = getJSOCTAVersion(json);
	return window.pako.gzip(new JSOCTA(json.map || json).getByteArray());
}

function getOGZFromEditor(callback = ()=>{}) {
	TextEditor.parse((string, json) => {
		callback(jsonToOGZ(json));
	});
}


function FS_updateFeedback(selectedFile) {
	if (!FS.fileHandle || !selectedFile) {
		FS_fileStatus.update(0, "fas fa-times", "Could not save file.");
		return;
	}
	FS_fileStatus.update(0, "fas fa-check-circle", "File saved successfully.");
	FS_fileName.textContent = selectedFile.name;
}

function FS_saveFile(file, callback = () => {}) {
	if (!FS.hasAccess) {
		FS_fileStatus.update(0, "fas fa-times", "OGZ Editor is not allowed to edit your files, try downloading instead.");
		return;
	};

	if (! file) {
		getOGZFromEditor((ogz) => {
			FS_fileStatus.update(1, "", `${FS.fileHandle ? "Saving" : "Selecting"} file...`);
			FS.save(ogz, (selectedFile) => {
				FS_updateFeedback(selectedFile);
			});
		});
	} else {
		FS.save(file, (selectedFile) => {
			if (!selectedFile) {
				callback();
				return;	
			}
			callback(`${selectedFile.name} saved successfully.`);
		});
	}
}

function FS_saveFileAs() {
	if (!FS.hasAccess) {
		FS_fileStatus.update(0, "fas fa-times", "OGZ Editor does not have access to the file picker.");
		return;
	}
	getOGZFromEditor((ogz) => {
		FS_fileStatus.update(1, "", "Selecting file...");
		FS.saveAs(ogz, (selectedFile) => {
			FS_updateFeedback(selectedFile);
		});
	});
}

function downloadFile(element, content, selectedFile) {
	var blob = new Blob([content], { type: "application/gzip" });
	var element = document.querySelector(`${element} a`);

	if (window.navigator.msSaveBlob) {
		navigator.msSaveBlob(blob, selectedFile);
	} else {
		element.setAttribute("download", selectedFile);
		element.setAttribute("href", URL.createObjectURL(blob));
	}
}

addButton("#button-save", () => {
	FS_saveFile();
});

addButton("#button-saveas", () => {
	FS_saveFileAs();
});

addButton("#button-download", () => {
	getOGZFromEditor((ogz) => {
		downloadFile(
			"#button-download",
			ogz,
			FS.fileHandle ? FS.fileHandle.name : "mynewmap.ogz"
		);
	});
});

addButton("#button-formatjson", () => {
	TextEditor.format();
});

addButton("#button-validatejson", () => {
	TextEditor.parse((object) => {
		FS_fileStatus.update(0, "fas fa-check-circle", "Good to go!");
	});
});

const pageKeylog = []
document.body.addEventListener("keydown", (event) => {
	if (!pageKeylog.includes(event.key)) {pageKeylog.push(event.key)}
	if (event.key == "s" && (pageKeylog.includes("Control") || TextEditor.keylog.includes("Control"))) {
		event.preventDefault();
		FS_saveFile();
	}
});

document.body.addEventListener("keyup", (event) => {
	pageKeylog.splice(pageKeylog.indexOf(event.key), 1)
})