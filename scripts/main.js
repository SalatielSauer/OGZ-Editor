class StatusFeedback {
	constructor(element) {
		this.element = document.querySelector(element);
	}

	update(state, text, icon, buttons = []) {
		// reset animations
		this.elementBuff = this.element;
		this.element.parentNode.replaceChild(this.element, this.elementBuff);
		this.icon = icon || '';
		this.text = text || '';
		this.state = state || 0;
		this.element.innerHTML = `<i class='${this.icon}'></i> ${this.text}${buttons.length ? '<br>' : ''}`;
		buttons.forEach(button => {
			let element_button = document.createElement(button.element || 'button');
			if (button.id) {
				element_button.id = button.id;
			}
			element_button.innerHTML = button.text;
			element_button.addEventListener('click', (e) => button.onclick(e));
			this.element.appendChild(element_button);
		});
		this.element.classList.remove('element-fadein', 'element-fadeout', 'element-stayin');
		this.element.classList.add(this.state ? (buttons.length ? 'element-stayin' : 'element-fadein') : 'element-fadeout');
	}
}

function addButton(selector, onclick) {
	let element = document.querySelector(selector);
	element.onclick = (event) => {
		onclick(event);
	};
}

const TextEditor = new Editor('#editor', '#highlight-content');
const FS = new FileSystem();
const FS_fileName = document.querySelector('#filesystem-file');
const FS_fileStatus = new StatusFeedback('#filesystem-status');
const Time = new Date();
let fileImport = {};

const worker = new Worker('scripts/jsocta-worker.js');
worker.onmessage = function(event) {
	const message = event.data;

	switch(message.type) {
		case -1:
			if (message.body.toString().includes('RangeError')) {
				FS_fileStatus.update(1, `Trying to adjust mapsize to contain out-of-bounds cubes..`, 'fas fa-spinner fa-spin');
				worker.postMessage({'type': 1});
			} else {
				console.error('Could not parse JSON correctly.', message.body);
				FS_fileStatus.update(0, `Something went wrong.`, 'fas fa-times');
				alert(message.body);
				window['checkbox-useimportedjson'].disabled = false;
			}
			break;
		case 0:
			FS_fileStatus.update(1, `${message.body}`, 'fas fa-spinner fa-spin');
			break;
		case 1:
			fileImport = message.body.fileImport;
			FS_fileStatus.update(0, `Done, OGZ file is ready.`, 'fas fa-check-circle');

			if ('callback' in worker) {
				worker.callback(fileImport);
				worker.callback = () => {};
			}
			break;
	}
};

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

function jsonToOGZ(string) {
	worker.postMessage({'type': 0, 'body': {'content': string}});
}

function updateFileFeedback(selectedFile) {
	if (!FS.fileHandle || !selectedFile) {
		FS_fileStatus.update(0, 'Could not save file.', 'fas fa-times');
		return;
	}
	FS_fileStatus.update(0, 'File saved successfully.', 'fas fa-check-circle');
	FS_fileName.textContent = FS.fileHandle.name;
}

function saveFile(override = true) {
	FS_fileStatus.update(1, `${FS.fileHandle && override ? 'Saving' : 'Selecting'} OGZ file...`, 'fas fa-spinner fa-spin');

	switch(override) {
		case false:
			FS.saveAs(fileImport.GZIP, (selectedFile) => {
				updateFileFeedback(selectedFile);
			}, () => {
				FS_fileStatus.update(1, `Saving OGZ file...`, 'fas fa-spinner fa-spin');
			});
			break;
		case true:
			FS.save(fileImport.GZIP, (selectedFile) => {
				updateFileFeedback(selectedFile);
			}, () => {
				FS_fileStatus.update(1, `Saving OGZ file...`, 'fas fa-spinner fa-spin');
			});
			break;
	}
}

addButton('#button-save', () => {
	if (fileImport.GZIP && window['checkbox-useimportedjson'].checked) {
		saveFile();
	} else {
		window['checkbox-useimportedjson'].disabled = true;
		jsonToOGZ(TextEditor.editor.value);
		worker.callback = () => {
			saveFile();
		};
	};
});

addButton('#button-saveas', () => {
	if (fileImport.GZIP && window['checkbox-useimportedjson'].checked) {
		saveFile(false);
	} else {
		window['checkbox-useimportedjson'].disabled = true;
		worker.callback = () => {
			saveFile(false);
		};
		jsonToOGZ(TextEditor.editor.value);
	};
});

addButton('#button-formatjson', () => {
	TextEditor.format();
});

addButton('#button-validatejson', () => {
	TextEditor.parse((object) => {
		FS_fileStatus.update(0, 'Good to go!', 'fas fa-check-circle');
	});
});

addButton('#button-importjson', (event) => {
	FS_fileStatus.update(1, `Selecting JSON file...`, 'fas fa-spinner fa-spin');
	FS.importJson(file => {
		if (! file) {
			FS_fileStatus.update(0, 'Could not select file.', 'fas fa-times');
			return;
		}
		event.target.disabled = true;
		jsonToOGZ(file.content);
		worker.callback = () => {
			event.target.disabled = false;
			window['checkbox-useimportedjson'].disabled = false;
			if (FS.fileHandle) {
				saveFile();
				return;
			}

			FS_fileStatus.update(1, `${file.name} is imported.`, 'fas fa-file', [
				{'text': '<i class="fas fa-save"></i> Save OGZ', 'onclick': () => {
					saveFile();
				}}
			]);
		};
	});
});

const handleDragOver = (event) => {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    window['button-importjson'].classList.add('drag-over');
    FS_fileStatus.update(0, 'Drop file to start processing.', 'fas fa-upload');
};

const handleDragLeave = () => {
    window['button-importjson'].classList.remove('drag-over');
};

const handleDrop = async (event) => {
	event.stopPropagation();
	event.preventDefault();
	window['button-importjson'].classList.remove('drag-over');
	const files = event.dataTransfer.files;

	if (files.length > 0) {
		const file = files[0];
		if (file.type === 'application/json"' || file.name.endsWith('.json')) {
			const reader = new FileReader();
			FS_fileStatus.update(1, `Reading ${file.name}...`, 'fas fa-spinner fa-spin');
			reader.onload = (e) => {
				const content = e.target.result;
				window['checkbox-useimportedjson'].disabled = true;
				jsonToOGZ(content);
				worker.callback = () => {
					window['checkbox-useimportedjson'].disabled = false;
					if (FS.fileHandle) {
						saveFile();
						return;
					}

					FS_fileStatus.update(1, `${file.name} is imported.`, 'fas fa-file', [
						{'text': '<i class="fas fa-save"></i> Save OGZ', 'onclick': () => {
							saveFile();
						}}
					]);
				};
			};

			reader.readAsText(file);
		} else {
			FS_fileStatus.update(0, `Currently only JSON files are supported.`, 'fas fa-times');
		}
	}
}

document.body.addEventListener('dragover', handleDragOver);
document.body.addEventListener('dragleave', handleDragLeave);
document.body.addEventListener('drop', handleDrop);

const pageKeylog = [];
document.body.addEventListener('keydown', (event) => {
	if (!pageKeylog.includes(event.key)) {pageKeylog.push(event.key)}
	if (event.key === 's' && (pageKeylog.includes('Control') || TextEditor.keylog.includes('Control'))) {
		event.preventDefault();
		jsonToOGZ(TextEditor.parse());
		worker.callback = () => {
			saveFile();
		};
	};
});

document.body.addEventListener('keyup', (event) => {
	pageKeylog.splice(pageKeylog.indexOf(event.key), 1);
});