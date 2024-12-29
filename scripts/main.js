
const WORKER = new Worker('scripts/worker.js');

class StatusFeedback {
	constructor(selector) {
		this.element = document.querySelector(selector);
	}

	update(state = 0, text = '', icon = '', buttons = []) {
		// reset animations
		const clone = this.element.cloneNode(true);
		this.element.parentNode.replaceChild(clone, this.element);
		this.element = clone;

		this.element.innerHTML = `<span class='icon'>${icon}</span> ${text.replace('\n', '<br>')}${buttons.length ? '<br>' : ''}`;
		buttons.forEach(button => {
			const buttonElement = document.createElement(button.element || 'button');
			if (button.id) {
				buttonElement.id = button.id;
			}
			buttonElement.innerHTML = button.text;
			buttonElement.addEventListener('click', (e) => button.onclick(e));
			this.element.appendChild(buttonElement);
		});
		this.element.classList.remove('element-fadein', 'element-fadeout', 'element-stayin');
		this.element.classList.add(state ? (buttons.length ? 'element-stayin' : 'element-fadein') : 'element-fadeout');
	}
}

const FS = new FileSystem();
const FS_fileStatus = new StatusFeedback("#filesystem-status");

function handleWorkerFailure(data) {
	if (data.content.toString().includes('RangeError')) {
		FS_fileStatus.update(1, `Trying to adjust mapsize to contain out-of-bounds cubes..`, '🛠');
		WORKER.postMessage({ type: 'jsocta_fix_mapsize' });
	} else {
		FS_fileStatus.update(0, `Something went wrong.`, '❌');
		alert(data.content);
	}
}

function handleAssetDone(data) {
	const frameCount = data.content.frames.length;
	FS_fileStatus.update(0, `${frameCount} image${frameCount > 1 ? 's are' : ' is'} ready to be used.`, '✔️');

	const assetClearButton = window['main-asset-clear-button'];
	assetClearButton.textContent = `🗑️Remove Images: 🖼️${frameCount}`;
	assetClearButton.style.display = 'unset';

	//console.log('Asset is done:', data.content);
}

function FS_updateFeedback(selectedFile) {
	if (!FS.fileHandle || !selectedFile) {
		if (FS.hasAccess) {
			FS_fileStatus.update(0, 'Could not save file.', '❌');
		} else {
			FS_fileStatus.update(1, 'OGZ Editor could not access the file picker.<br>Try downloading instead.<br>', '⚠️', [
				{text: '📥 Download .OGZ', onclick: () => { window['button_download'].click(); }},
				{text: '✖', onclick: () => { FS_fileStatus.update() }}
			]);
		}
		return;
	}
	FS_fileStatus.update(0, 'File saved successfully.', '✔️');
}

WORKER.onmessage = (event) => {
	const data = event.data;
	//console.log('Receiving message:', data);
	switch (data.type) {
		case 'failed':
			handleWorkerFailure(data);
			directDownloadOGZ = false;
			break;

		case 'info':
			FS_fileStatus.update(data.state === undefined ? 1 : data.state, `${data.content}`, data.prefix || '⚙️');
			break;

		case 'done_ogz':
			if (directDownloadOGZ) {
				directDownloadOGZ = false;
				const filename = 'mynewmap.ogz';
				_download_file(filename, data.content.GZIP, 'application/gzip');
				FS_fileStatus.update(0, 'OGZ file ready to be downloaded.', '✔️');
			} else {
				FS_fileStatus.update(1, `Saving OGZ file..`, '⚙️');
				FS.save(data.content.GZIP, (selectedFile) => {
					FS_updateFeedback(selectedFile);
					if (selectedFile && selectedFile.name) {
						setFilenameDisplay(selectedFile.name);
					}
				});
			}
			break;

		case 'done_asset':
			handleAssetDone(data);
			break;
	 }
};

window['input_file'].addEventListener('change', (event) => {
	ProcessFileStream(event.target.files);
});

window['main-asset-clear-button'].addEventListener('click', (event) => {
	event.target.style.display = 'none';
	WORKER.postMessage({ type: 'clear_assets' });
});

document.getElementById('presets-dropdown-item-selector').addEventListener('change', (event) => {
	const selectedIndex = parseInt(event.target.value, 10);
	const selectedPreset = ogzeditor_presets[selectedIndex];
	if (!selectedPreset) return;

	// if preset has a 'file' path and no 'body' yet, fetch its contents
	if (selectedPreset.file && !selectedPreset.body) {
		fetch(selectedPreset.file)
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to fetch preset file.');
				}
				return response.text();
			})
			.then(text => {
				// update the preset body so it won’t fetch again next time
				selectedPreset.body = text;
				EDITOR.setValue(selectedPreset.body, -1);

				FS_fileStatus.update(0, `Loaded '<span style='color: lightblue;'>${selectedPreset.name}</span>'<span style='font-size: 11px; pointer-events: all;'> by <a href='${selectedPreset.url}'>${selectedPreset.author}</a></span>`, '✔️');

				// update preset buttons
				updatePresetButtons(selectedPreset);

				// store in localStorage the last selected preset
				localStorage.setItem('lastSelectedPreset', selectedIndex);
			})
			.catch(error => {
				FS_fileStatus.update(0, `Failed to load preset file: ${error}`, '❌');
			});
	} else {
		// either there's no file property or 'body' is already defined
		EDITOR.setValue(selectedPreset.body || '', -1);
		FS_fileStatus.update(0, `Loaded '<span style='color: lightblue;'>${selectedPreset.name}</span>'<span style='font-size: 11px; pointer-events: all;'> by <a href='${selectedPreset.url}'>${selectedPreset.author}</a></span>`, '✔️');

		// update preset buttons
		updatePresetButtons(selectedPreset);

		// store in localStorage the last selected preset
		localStorage.setItem('lastSelectedPreset', selectedIndex);
	}

	if (selectedPreset.ommitWarnings) {
		EDITOR.session.setUseWorker(false);
	} else {
		EDITOR.session.setUseWorker(true);
	}
});


function ProcessFileStream(fileStream) {
	function parseJsFileContent(content, fallbackName) {
		// extract meta data
		const nameMatch = content.match(/\/\/@name\s+(.+)/);
		const authorMatch = content.match(/\/\/@author\s+(.+)/);
		const urlMatch = content.match(/\/\/@url\s+(.+)/);

		// default/fallback values
		const name = nameMatch ? nameMatch[1] : fallbackName;
		const author = authorMatch ? authorMatch[1] : 'Anonymous';
		const url = urlMatch ? urlMatch[1] : '';

		// remove lines containing //@name / //@author / //@url
		content = content
			.replace(/\/\/@name\s+(.+)/g, '')
			.replace(/\/\/@author\s+(.+)/g, '')
			.replace(/\/\/@url\s+(.+)/g, '')
			.trim();

		return { name, author, url, body: content };
	}

	const fileReadPromises = Array.from(fileStream).map((file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			
			// determine the file type based on MIME type
			if (file.type.startsWith('image/')) {
				reader.onloadend = () => resolve({ type: 'image', content: reader.result });
				reader.readAsDataURL(file);
			} else if (file.type === 'text/javascript' || file.name.endsWith('.js')) {
				reader.onloadend = () => resolve({ type: 'js', content: reader.result, name: file.name });
				reader.readAsText(file);
			} else {
				reject(new Error(`Unsupported file type: ${file.name}`));
			}
		});
	});

	 Promise.all(fileReadPromises)
		.then((files) => {
			const imageFiles = files.filter(file => file.type === 'image').map(file => file.content);
			const jsFiles = files.filter(file => file.type === 'js');

			// handle JS Files: create presets
			jsFiles.forEach((jsFile) => {
				const fallbackName = jsFile.name.replace(/\.js$/i, '') || 'Unnamed Preset';
				const { name, author, url, body } = parseJsFileContent(jsFile.content, fallbackName);

				saveCustomPreset({ name, author, url, body });
			});;

			// handle image files: send to worker
			if (imageFiles.length) {
				WORKER.postMessage({
					type: 'upload',
					content: imageFiles
				});
			}

			if (imageFiles.length) {
				FS_fileStatus.update(0, `${imageFiles.length} image file${imageFiles.length > 1 ? 's' : ''} uploaded.`, '✔️');
			}

			//console.log('All files processed:', files);
		})
		.catch((error) => {
			console.error('Error processing assets:', error);
			FS_fileStatus.update(0, `Could not import assets - ${error.message}`, '❌');
		});
}

function runUserScriptAndEncode() {
	WORKER.postMessage({
		type: 'jsocta_start_process',
		content: EDITOR.getValue()
	});
}

function RequestSave(requestFileHandler = false) {
	if (!FS.fileHandle || requestFileHandler === true) {
		FS.saveAs('', () => {
			runUserScriptAndEncode();
		});
	} else {
		runUserScriptAndEncode();
	}
}

const EDITOR = ace.edit("texteditor");
EDITOR.setTheme("ace/theme/one_dark");
EDITOR.session.setMode("ace/mode/javascript");
EDITOR.setPrintMarginColumn(-1);
EDITOR.session.setUseWrapMode(true);

const EDITOR_TOOLTIPS = new AceHoverAutocomplete(EDITOR, helpers_descriptions);

function refreshPresets() {
	const presetsDropdown = window['presets-dropdown-item-selector'];
	presetsDropdown.innerHTML = '';
	ogzeditor_presets.forEach((preset, index) => {
		const option = document.createElement('option');
		option.value = index;
		option.title = `Script by ${preset.author}`;
		if (preset.isCustom) {
			option.textContent = `📌📄 ${preset.name}`;
		} else {
			option.textContent = `📄 ${preset.name}`;
		}
		if (preset.isCustom) {
			option.style.color = '#4CAF50';
		}
		presetsDropdown.appendChild(option);
	});
}

// load custom presets from localStorage
function loadCustomPresets() {
	const savedPresets = JSON.parse(localStorage.getItem('customPresets')) || [];
	savedPresets.forEach(preset => {
		preset.isCustom = true; // Mark as custom
		ogzeditor_presets.push(preset);
	});
	refreshPresets();
}

EDITOR.on('input', () => {
	const saveButton = window['button_preset'];
	saveButton.style.display = 'unset';

	const currentText = EDITOR.getValue();
	const selectedIndex = parseInt(window['presets-dropdown-item-selector'].value, 10);
	const selectedPreset = ogzeditor_presets[selectedIndex];
	const isCustomPreset = selectedPreset.isCustom;
	const isDifferent = currentText !== selectedPreset.body;

	if (isCustomPreset && isDifferent) {
		window['button_preset_refresh'].style.display = 'unset';
	}
	else {
		window['button_preset_refresh'].style.display = 'none';
	}
});

function saveCustomPreset(existing_preset) {
	const currentText = existing_preset.body || EDITOR.getValue();
	const presetName = existing_preset.name || prompt('Enter preset name:', 'Custom Script');
	if (!presetName) {
		FS_fileStatus.update(0, 'Preset name is required.', '⚠️');
		return;
	}
	const presetAuthor = existing_preset.author || prompt('Enter author name:', 'Anonymous') || 'Anonymous';
	const presetUrl = existing_preset.url || prompt('Enter optional URL:', '') || '';

	const customPreset = {
		name: presetName.trim(),
		author: presetAuthor.trim(),
		url: presetUrl.trim(),
		body: currentText,
		isCustom: true
	};

	let savedPresets = JSON.parse(localStorage.getItem('customPresets')) || [];

	const presetExists = savedPresets.some(preset =>
		preset.name === customPreset.name && preset.body === customPreset.body
	);

	if (!presetExists) {
		savedPresets.push(customPreset);
		localStorage.setItem('customPresets', JSON.stringify(savedPresets));
		FS_fileStatus.update(0, 'Custom preset saved.', '✔️');

		ogzeditor_presets.push(customPreset);
		refreshPresets();
		selectPreset(ogzeditor_presets.length - 1);
	} else {
		FS_fileStatus.update(0, 'Custom preset already exists.', '⚠️');
	}
}

function refreshCustomPreset(preset, index) {
	const currentText = EDITOR.getValue();
	let savedPresets = JSON.parse(localStorage.getItem('customPresets')) || [];
	const presetIndex = savedPresets.findIndex(p =>
		p.name === preset.name && p.body === preset.body
	);
	if (presetIndex !== -1) {
		preset.body = savedPresets[presetIndex].body = currentText;
		localStorage.setItem('customPresets', JSON.stringify(savedPresets));
		FS_fileStatus.update(0, `Preset '<span style='color: lightblue;'>${savedPresets[presetIndex].name}</span>' updated.`, '✔️');
	} else {
		FS_fileStatus.update(0, 'Preset not found.', '⚠️');
	}
	window['button_preset_refresh'].style.display = 'none';
}

function removeCustomPreset(preset) {
	if (!confirm(`Are you sure you want to remove the custom preset '${preset.name}'?`)) {
		return;
	}
	let savedPresets = JSON.parse(localStorage.getItem('customPresets')) || [];
	savedPresets = savedPresets.filter(p =>
		!(p.name === preset.name && p.body === preset.body)
	);
	localStorage.setItem('customPresets', JSON.stringify(savedPresets));
	FS_fileStatus.update(0, 'Custom preset removed.', '✔️');

	const presetIndex = ogzeditor_presets.findIndex(p =>
		p.name === preset.name && p.body === preset.body
	);

	if (presetIndex !== -1) {
		ogzeditor_presets.splice(presetIndex, 1);
		refreshPresets();
		selectPreset(0);
	}
}

function downloadPreset() {
	const presetsDropdown = window['presets-dropdown-item-selector'];
	const selectedIndex = parseInt(presetsDropdown.value, 10);
	const selectedPreset = ogzeditor_presets[selectedIndex];

	if (!selectedPreset) {
		FS_fileStatus.update(0, 'No preset selected to download.', '⚠️');
		return;
	}

	let content = EDITOR.getValue();
	let credits = `\n\n//@name ${selectedPreset.name}\n//@author ${selectedPreset.author}\n//@url ${selectedPreset.url ? `${selectedPreset.url}` : 'github.com/OGZ-Editor'}\n`;

	if (!content.includes(credits)) {
		content += credits;
	}

	let filename = selectedPreset.name.trim() || 'ogzeditor_preset';
	filename = filename.replace(/[^a-z0-9_\-]/gi, '_');
	filename += '.js';
	const blob = new Blob([content], { type: 'application/javascript' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	FS_fileStatus.update(0, `Preset '${selectedPreset.name}' downloaded successfully.`, '✔️');
}

function selectPreset(index) {
	const presetsDropdown = window['presets-dropdown-item-selector'];
	presetsDropdown.value = index;
	presetsDropdown.dispatchEvent(new Event('change'));
}

function updatePresetButtons(preset) {
	const saveButton = window['button_preset'];
	const refreshButton = window['button_preset_refresh'];
	const savedPresets = JSON.parse(localStorage.getItem('customPresets')) || [];
	const isCustomPreset = savedPresets.some(p =>
		p.name === preset.name && p.body === preset.body
	);

	if (isCustomPreset) {
		saveButton.textContent = '❌';
		saveButton.title = 'Remove Custom Preset';
		saveButton.style.display = 'unset';
		saveButton.onclick = () => removeCustomPreset(preset);

		saveButton.style.borderColor = 'red';
		refreshButton.onclick = () => refreshCustomPreset(preset);
	} else {
		saveButton.textContent = '➕';
		saveButton.title = 'Add Custom Preset';
		saveButton.style.display = 'unset';
		saveButton.style.borderColor = '#b0b0b0';
		saveButton.onclick = saveCustomPreset;

		refreshButton.style.display = 'none';
	}
}

function setFilenameDisplay(filename) {
	if (filename.length <= 25) {
		window['filesystem-file'].textContent = filename;
		return;
	}
	const trimmed = `${filename.slice(0, 7)}...${filename.slice(-10)}`;
	window['filesystem-file'].textContent = trimmed;
}


document.addEventListener('DOMContentLoaded', () => {
	loadCustomPresets();
	// load last selected preset if available, otherwise select the first one
	const lastSelectedPreset = localStorage.getItem('lastSelectedPreset') || null;
	if (lastSelectedPreset !== null) {
		selectPreset(parseInt(lastSelectedPreset, 10));
	} else {
		selectPreset(0);
	}
	EDITOR.renderer.updateFull();
	EDITOR.once('change', () => {
		setTimeout(() => {
			// check line count here:
			if (EDITOR.session.getLength() > 50) {
				EDITOR.session.foldAll();
			}
		}, 0);
	});
});

window['button_save'].addEventListener('click', () => {
	RequestSave();
});

window['button_saveas'].addEventListener('click', () => {
	RequestSave(true);
});

let directDownloadOGZ = false;
window['button_download'].addEventListener('click', () => {
	directDownloadOGZ = true;
	runUserScriptAndEncode();
});

EDITOR.commands.addCommand({
	name: 'save',
	bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
	exec: RequestSave
});

const assetUploadAreas = [EDITOR.container];

assetUploadAreas.forEach(element => {
	['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
		element.addEventListener(eventName, (event) => {
			event.preventDefault();
		});
	});

	element.addEventListener('dragover', (event) => {
		event.preventDefault();
		element.classList.add('dragging');
	});

	['dragleave', 'drop'].forEach(eventName => {
		element.addEventListener(eventName, (event) => {
			event.preventDefault();
			event.stopPropagation();
			element.classList.remove('dragging');
			EDITOR.focus();
		}, true);
	});

	element.addEventListener('drop', (event) => {
		event.preventDefault();
		ProcessFileStream(event.dataTransfer.files);
	}, true);
});

window.addEventListener('paste', (event) => {
	const clipboardItems = event.clipboardData.items;
	for (let i = 0; i < clipboardItems.length; i++) {
		const item = clipboardItems[i];
		if (item.type.startsWith('image/')) {
			const blob = item.getAsFile();
			if (blob) {
				ProcessFileStream([blob]);
			}
			break;
		}
	}
});
