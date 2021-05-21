/*
	JSON editor that supports tab indentation, error feedback and syntax highlighting (highlight.js).
	by @SalatielSauer, licensed under ZLIB (https://www.zlib.net/zlib_license.html)
*/

class Editor {
	constructor(editor, highlight) {
		this.editor = document.querySelector(editor);
		this.highlight = document.querySelector(highlight);
		this.keylog = [];
		this.error = { state: false };
		this.editor.onkeydown = (event) => {
			if (!this.keylog.includes(event.key)) {
				this.keylog.push(event.key);
			}
			this.interceptKeys(event);
		};
		this.editor.onkeyup = (event) => {
			this.keylog.splice(this.keylog.indexOf(event.key), 1);
		};
		this.editor.onclick = this.editor.oninput = (event) => {
			this.updateHighlight();
		};
		this.editor.onscroll = (event) => {
			this.updateScroll(event);
		};
	}

	updateText(text) {
		this.editor.value = text;
		this.updateHighlight();
	}

	updateHighlight() {
		this.highlight.innerHTML = this.editor.value;
		hljs.highlightAll();
		if (this.error.state) {
			this.editor.style.zIndex = 1;
			this.error.state = false;
		}
	}

	updateScroll(event) {
		this.highlight.scrollTop = event.target.scrollTop;
		this.highlight.scrollLeft = event.target.scrollLeft;
	}

	refreshEditorProperties() {
		this.text = this.editor.value;
		this.textSlice = {
			left: this.text.slice(0, this.editor.selectionStart),
			right: this.text.slice(this.editor.selectionEnd, this.text.length),
		};
		this.textSelected = this.text.substring(
			this.editor.selectionStart,
			this.editor.selectionEnd
		);
		this.cursor = {
			start: this.editor.selectionStart,
			end: this.editor.selectionEnd,
		};
		this.cursorSelecting = this.cursor.start != this.cursor.end;
	}

	interceptKeys(event) {
		this.refreshEditorProperties();

		if (event.key == "Tab" && this.keylog.includes("Shift")) {
			event.preventDefault();
			if (!this.cursorSelecting) {
				// unselected backward indent (shift + tab)
				this.updateText(
					`${this.text.substring(0, this.cursor.start - 1)}${this.text.substring(this.cursor.end)}`
				);
				this.editor.selectionEnd = this.editor.selectionStart = this.cursor.start - 1;
				return;
			}
			// selected backward indent (shift + tab)
			this.updateText(
				`${this.textSlice.left}${this.textSelected.replace(/(^.*?)(\t)/gm, "")}${this.textSlice.right}`
			);
			this.editor.selectionStart = this.cursor.start;
			this.editor.selectionEnd = this.cursor.end - this.textSelected.split("\n").length;
		}

		if (event.key == "Tab" && !this.keylog.includes("Shift")) {
			event.preventDefault();
			if (!this.cursorSelecting) {
				// unselected forward indent (tab)
				this.updateText(`${this.textSlice.left}\t${this.textSlice.right}`);
				this.editor.selectionEnd = this.editor.selectionStart = this.cursor.start + 1;
				return;
			}
			// selected forward indent (tab)
			this.updateText(
				`${this.textSlice.left}${this.textSelected.replace(/^/gm, "\t")}${this.textSlice.right}`
			);
			this.editor.selectionStart = this.cursor.start;
			this.editor.selectionEnd = this.cursor.end + this.textSelected.split("\n").length;
		}
	}

	parse(callback = () => {}) {
		try {
			this.json = JSON.parse(this.editor.value);
		} catch (error) {
			if (!error.message.includes("position")) {
				this.highlight.innerHTML = `<span class="highlight-feedback-bad">${this.editor.value}</span>`;
				alert(error);
				return;
			}
			this.error = {
				state: true,
				position: parseInt(error.message.match(/position (\d+)/)[1]),
			};
			this.editor.selectionStart = this.error.position;
			this.editor.selectionEnd = this.error.position + 1;
			this.refreshEditorProperties();
			// balloon pointing the error
			this.highlight.innerHTML = `<span class="highlight-feedback-good">${
				this.textSlice.left
			}</span><span class="highlight-feedback-bad"><span class="highlight-feedback-token">${
				this.textSelected
			}</span><span class="highlight-feedback-message">${error.message
				.replace("token \n", "new line").replace("in JSON ", "")
			} <i id="icon-close-message" class="fas fa-times-circle"></i></span>${
				this.textSlice.right
			}</span>`;
			document.querySelector("#icon-close-message").onclick = () => {
				this.updateHighlight();
			};
			this.editor.selectionEnd = 0;
			this.editor.style.zIndex = 0;
			return;
		}
		return callback(this.json);
	}

	format(indent = "\t") {
		this.parse((object) => {
			this.editor.value = JSON.stringify(object, (key, value) => {
				if (Array.isArray(value) && !value.some((k) => k && (typeof k) == "object")) {
				  return `\uE000${JSON.stringify(value.map((v) => (typeof v) == "string" ? v.replace(/"/g, "\uE001") : v))}\uE000`;
				}
				return value;
			}, indent).replace(/"\uE000([^\uE000]+)\uE000"/g, (match) => match.substr(2, match.length - 4).replace(/\\"/g, `"`).replace(/\uE001/g, `\\\"`).replace(/,/g, ", "));
		    this.updateHighlight();
		})
	}
}

function getNewFileHandle() {
	return window.showSaveFilePicker({
		suggestedName: "mynewmap.ogz",
		suggestedStartLocation: "documents",
		types: [{
			description: "Cube Engine Map File",
			accept: {
				"application/gzip": [".ogz"]
			}
		}],
		excludeAcceptAllOption: true,
		multiple: false,
	});
}

async function writeFile(fileHandle, content) {
	const writable = await fileHandle.createWritable();
	await writable.write(content);
	await writable.close();
}

class FileSystem {
	constructor() {
		this.hasAccess = "showOpenFilePicker" in window;
	}
	async save(content, callback = () => {}) {
		if (!this.fileHandle) {
			return await this.saveAs(content, callback);
		}
		try {
			await writeFile(this.fileHandle, content);
		} catch (error) {
			callback();
			return;
		}
		callback(this.fileHandle);
	}
	async saveAs(content, callback = () => {}) {
		try {
			this.fileHandle = await getNewFileHandle();
		} catch (error) {
			callback();
			return;
		}
		this.save(content, callback);
	}
}
