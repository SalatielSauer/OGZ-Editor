class StatusFeedback {
	constructor(element) {
		this.element = document.querySelector(element);
	}

	update(state, icon, text) {
		// reset animations
		this.elementBuff = this.element;
		this.element.parentNode.replaceChild(this.element, this.elementBuff);
		this.icon = icon || "";
		this.text = text || "";
		this.state = state || 0;
		this.element.innerHTML = `<i class="${this.icon}"></i> ${this.text}`;
		this.element.className = this.state ? "element-fadein" : "element-fadeout";
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
	"mapsize": 1024,
	"mapvars": {
		"skybox": "skyboxes/white",
		"maptitle": "Untitled Map by OGZ Editor (${Time.getDate().toString().padStart(2, "0")}/${(Time.getMonth()+1).toString().padStart(2, "0")}/${Time.getFullYear()})",
		"atmo": 1,
		"sunlight": [255, 255, 255]
	},
	"entities": [
		{"position": [512, 512, 530], "attributes": ["particles", 0, 0, 0, "0xFFF", 0]},
		{"position": [512, 512, 512], "attributes": ["mapmodel", 180, 172, 0, 0, 0]},
		{"position": [512, 512, 528], "attributes": ["mapmodel", 90, 177, 0, 0, 0]},
		{"position": [240, 16, 512], "attributes": ["mapmodel", 0, 13, 0, 0, 0]},
		{"position": [240, 16, 512], "attributes": ["jumppad", 16, 0, 0, 0, 0]},
		{"position": [208, 16, 544], "attributes": ["mapmodel", 0, 161, 0, 0, 0]},
		{"position": [208, 16, 544], "attributes": ["jumppad", 16, 0, 0, 0, 0]},
		{"position": [160, 32, 576], "attributes": ["mapmodel", 0, 160, 0, 0, 0]},
		{"position": [160, 32, 576], "attributes": ["jumppad", 32, 0, 0, 0, 0]},
		{"position": [64, 64, 640], "attributes": ["teleport", 2, 0, 0, 0, 0]},
		{"position": [512, 448, 512], "attributes": ["teledest", 180, 2, 0, 0, 0]}
	],
	"geometry": [
		{"solid": {"textures": [1]}},
		"solid",
		"solid",
		"solid",
		[
			[ {"solid": {"textures": [9]}}, [ {"solid": {"textures": [1, 2, 3, 4, 5, 6]}}, [ {"solid": {"textures": [842]}} ] ] ]
		]
	]
}`
);

function writeOGZ(callback) {
	TextEditor.parse((object) => {
		callback(window.pako.gzip(new OctaMap(object).getByteArray()))
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

function FS_saveFile() {
	if (!FS.hasAccess) {
		FS_fileStatus.update(0, "fas fa-times", "OGZ Editor is not allowed to edit your files, try downloading instead.");
		return;
	}
	writeOGZ((ogz) => {
		FS_fileStatus.update(1, "", `${FS.fileHandle ? "Saving" : "Selecting"} file...`);
		FS.save(ogz, (selectedFile) => {
			FS_updateFeedback(selectedFile);
		});
	});
}

function FS_saveFileAs() {
	if (!FS.hasAccess) {
		FS_fileStatus.update(0, "fas fa-times", "OGZ Editor does not have access to the file picker.");
		return;
	}
	writeOGZ((ogz) => {
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
	writeOGZ((ogz) => {
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
