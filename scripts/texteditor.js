class AceHoverAutocomplete {
	constructor(aceEditor, descriptions) {
		this.editor = aceEditor;
		this.functionTips = descriptions;

		this.tooltip = document.createElement('div');
		this.tooltip.className = 'tooltip';
		this.tooltip.style.position = 'absolute';
		this.tooltip.style.display = 'none';
		this.tooltip.style.zIndex = '5';
		document.body.appendChild(this.tooltip);

		this.container = document.createElement('div');
		this.container.className = 'autocomplete-container';
		this.container.style.display = 'none';
		document.body.appendChild(this.container);

		this.suggestions = [];
		this.selectedIndex = -1;
		this.isAutocompleteShowing = false;
		this.currentFunctionMatches = null;

		this.editor.on('change', () => setTimeout(() => this.handleEditorChange(), 0));
		this.editor.selection.on('changeCursor', () => setTimeout(() => this.handleCursorChange(), 0));
		this.editor.on('blur', () => {
			this.hideTooltip();
			this.hideAutocomplete();
		});

		this.bindKeyboardCommands();
	}

	bindKeyboardCommands() {
		this.editor.commands.addCommand({
			name: 'autocompleteSelectUp',
			bindKey: { win: 'Ctrl-Up', mac: 'Ctrl-Up' },
			exec: () => {
				if (this.isAutocompleteShowing && this.suggestions.length > 0) {
					this.moveSelectionUp();
				}
			},
			readOnly: true
		});

		this.editor.commands.addCommand({
			name: 'autocompleteSelectDown',
			bindKey: { win: 'Ctrl-Down', mac: 'Ctrl-Down' },
			exec: () => {
				if (this.isAutocompleteShowing && this.suggestions.length > 0) {
					this.moveSelectionDown();
				}
			},
			readOnly: true
		});

		this.editor.commands.addCommand({
			name: 'autocompleteConfirm',
			bindKey: { win: 'Enter', mac: 'Enter' },
			exec: (editor) => {
				if (this.isAutocompleteShowing && this.suggestions.length > 0 && this.selectedIndex >= 0) {
					this.selectAutocompleteItem(this.selectedIndex);
				} else {
					editor.insert('\n');
				}
			},
			readOnly: false
		});
		

		this.editor.commands.addCommand({
			name: 'tooltipParamLeft',
			bindKey: { win: 'Ctrl-Left', mac: 'Ctrl-Left' },
			exec: () => {
				if (this.currentFunctionMatches && this.currentFunctionMatches.length > 0) {
					let m = this.currentFunctionMatches[0];
					let line = this.editor.session.getLine(this.editor.getCursorPosition().row);
					let re = new RegExp(`\\b(${m.functionName})\\s*\\(`, 'g');
					let match, startPos = -1;
					while ((match = re.exec(line)) !== null) {
						startPos = match.index + match[0].length - 1;
						break;
					}
					if (startPos < 0) return;
					let parenCount = 1;
					let closeParenPos = startPos + 1;
					while (parenCount > 0 && closeParenPos < line.length) {
						if (line[closeParenPos] === '(') parenCount++;
						if (line[closeParenPos] === ')') parenCount--;
						closeParenPos++;
					}
					let paramText = line.substring(startPos + 1, closeParenPos - 1);
					let newIndex = m.paramIndex - 1;
					if (newIndex < 0) newIndex = m.params.length - 1;
					let offsets = this.getParamOffsets(paramText);
					if (newIndex >= offsets.length) newIndex = 0;
					let off = offsets[newIndex];
					let base = startPos + 1 + off;
					m.paramIndex = newIndex;
					let pos = this.editor.getCursorPosition();
					// find the next comma or the end of the string
					let nextComma = paramText.indexOf(',', off);
					if (nextComma === -1) nextComma = paramText.length;

					// place caret after the param
					let paramLength = nextComma - off;
					pos.column = base + paramLength;
					this.editor.selection.moveToPosition(pos);
					this.handleHoverTooltip();
				}
			},
			readOnly: false
		});

		this.editor.commands.addCommand({
			name: 'tooltipParamRight',
			bindKey: { win: 'Ctrl-Right', mac: 'Ctrl-Right' },
			exec: () => {
				if (this.currentFunctionMatches && this.currentFunctionMatches.length > 0) {
					let m = this.currentFunctionMatches[0];
					let line = this.editor.session.getLine(this.editor.getCursorPosition().row);
					let re = new RegExp(`\\b(${m.functionName})\\s*\\(`, 'g');
					let match, startPos = -1;
					while ((match = re.exec(line)) !== null) {
						startPos = match.index + match[0].length - 1;
						break;
					}
					if (startPos < 0) return;
					let parenCount = 1;
					let closeParenPos = startPos + 1;
					while (parenCount > 0 && closeParenPos < line.length) {
						if (line[closeParenPos] === '(') parenCount++;
						if (line[closeParenPos] === ')') parenCount--;
						closeParenPos++;
					}
					let paramText = line.substring(startPos + 1, closeParenPos - 1);
					let newIndex = m.paramIndex + 1;
					if (newIndex >= m.params.length) newIndex = 0;
					let offsets = this.getParamOffsets(paramText);
					if (newIndex >= offsets.length) newIndex = 0;
					let off = offsets[newIndex];
					let base = startPos + 1 + off;
					m.paramIndex = newIndex;
					let pos = this.editor.getCursorPosition();
					// find the next comma or the end of the string
					let nextComma = paramText.indexOf(',', off);
					if (nextComma === -1) nextComma = paramText.length;

					// place caret after the param
					let paramLength = nextComma - off;
					pos.column = base + paramLength;
					this.editor.selection.moveToPosition(pos);
					this.editor.selection.moveToPosition(pos);
					this.handleHoverTooltip();
				}
			},
			readOnly: false
		});
	}

	moveSelectionUp() {
		this.selectedIndex--;
		if (this.selectedIndex < 0) {
			this.selectedIndex = this.suggestions.length - 1;
		}
		this.highlightSelectedItem();
	}

	moveSelectionDown() {
		this.selectedIndex++;
		if (this.selectedIndex >= this.suggestions.length) {
			this.selectedIndex = 0;
		}
		this.highlightSelectedItem();
	}

	highlightSelectedItem() {
		const items = this.container.querySelectorAll('.item');
		items.forEach((item, idx) => {
			if (idx === this.selectedIndex) {
				item.classList.add('selected');
			} else {
				item.classList.remove('selected');
			}
		});
	}

	handleEditorChange() {
		this.checkForAutocomplete();
	}

	handleCursorChange() {
		this.handleHoverTooltip();
		this.checkForAutocomplete();
	}

	handleHoverTooltip() {
		const cursorPos = this.editor.getCursorPosition();
		const row = cursorPos.row;
		const column = cursorPos.column;
		const fullText = this.editor.getValue();
		const lines = fullText.split('\n');
		const currentLine = lines[row] || '';
		const functionMatches = this.getFunctionsAtCaret(currentLine, column);
		this.currentFunctionMatches = functionMatches;
		if (functionMatches.length > 0) {
			this.showTooltip(functionMatches, row);
		} else {
			this.hideTooltip();
		}
	}

	getFunctionsAtCaret(line, caretOffset) {
		const functionCallRegex = /\b(ogzeditor\.[a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
		let match, functions = [];
		while ((match = functionCallRegex.exec(line)) !== null) {
			const functionName = match[1];
			const startPos = match.index;
			const openParenPos = startPos + match[0].length - 1;
			let closeParenPos = openParenPos + 1;
			let parenCount = 1;
			while (parenCount > 0 && closeParenPos < line.length) {
				if (line[closeParenPos] === '(') parenCount++;
				if (line[closeParenPos] === ')') parenCount--;
				closeParenPos++;
			}
			if (caretOffset >= openParenPos + 1 && caretOffset <= closeParenPos) {
				const tip = this.functionTips[functionName];
				if (tip) {
					const paramText = line.substring(openParenPos + 1, closeParenPos - 1);
					const paramIndex = this.getActiveParameterIndex(paramText, caretOffset - (openParenPos + 1));
					functions.push({
						functionName,
						params: tip.params,
						paramIndex,
						comment: tip.comment,
						details: tip.details || {},
						startPos
					});
				}
			}
		}
		return functions;
	}

	getActiveParameterIndex(paramText, relativeCaretPos) {
		if (relativeCaretPos <= 0) return 0;
		let commaCount = 0;
		let inString = false;
		let stringChar = '';
		let parenCount = 0;
		let squareBracketCount = 0;
		let curlyBraceCount = 0;
		for (let i = 0; i < paramText.length && i < relativeCaretPos; i++) {
			const char = paramText[i];
			if (char === '"' || char === "'") {
				if (!inString) {
					inString = true;
					stringChar = char;
				} else if (stringChar === char) {
					inString = false;
				}
			} else if (!inString) {
				if (char === '(') parenCount++;
				if (char === ')') parenCount--;
				if (char === '[') squareBracketCount++;
				if (char === ']') squareBracketCount--;
				if (char === '{') curlyBraceCount++;
				if (char === '}') curlyBraceCount--;
				if (char === ',' && parenCount === 0 && squareBracketCount === 0 && curlyBraceCount === 0) {
					commaCount++;
				}
			}
		}
		return commaCount;
	}

	showTooltip(functionMatches, row) {
		const match = functionMatches[0];
		const coords = this.editor.renderer.textToScreenCoordinates(
			row,
			match.startPos + match.functionName.length
		);
		this.tooltip.style.left = coords.pageX + 'px';
		this.tooltip.style.top = (coords.pageY + 20) + 'px';
		let tooltipContent = '';
		functionMatches.forEach((funcMatch, index) => {
			let { functionName, params, paramIndex, comment, details } = funcMatch;
			let funcTooltip = `<div style="margin-bottom: 4px;">`;
			funcTooltip += `<span class='comment'>💬 ${comment}<br>${'➜'.repeat(index + 1)}</span>`;
			funcTooltip += `${functionName}(`;
			params.forEach((param, i) => {
				if (i > 0) funcTooltip += ', ';
				const hasDetails = !!details[i];
				funcTooltip += `<span 
					class="param${i === paramIndex ? ` active${hasDetails ? ' hasDetails' : ''}` : ''}"
					title="${hasDetails ? `🛈 ${details[i]}` : ''}">
					${param}
				</span>`;
			});
			funcTooltip += `)</div>`;
			tooltipContent += funcTooltip;
		});
		this.tooltip.innerHTML = tooltipContent;
		this.tooltip.style.display = 'block';
	}

	hideTooltip() {
		this.tooltip.style.display = 'none';
	}

	checkForAutocomplete() {
		if (this.isInOgzeditorContext()) {
			this.showAutocomplete();
		} else {
			this.hideAutocomplete();
		}
	}

	isInOgzeditorContext() {
		const cursorPos = this.editor.getCursorPosition();
		const lineText = this.editor.session.getLine(cursorPos.row);
		const textUpToCursor = lineText.substring(0, cursorPos.column);
		return /\bogzeditor\.[a-zA-Z0-9_]*$/.test(textUpToCursor);
	}

	showAutocomplete() {
		const cursorPos = this.editor.getCursorPosition();
		const lineText = this.editor.session.getLine(cursorPos.row);
		const textUpToCursor = lineText.substring(0, cursorPos.column);
		const prefixMatch = textUpToCursor.match(/ogzeditor\.\w*$/);
		const prefix = prefixMatch ? prefixMatch[0] : 'ogzeditor.';

		const searchTerm = prefix.split('.').pop(); // Get the part after 'ogzeditor.'
		const base = 'ogzeditor.';

		this.suggestions = Object.keys(this.functionTips)
			.filter(key => key.startsWith(base + searchTerm))
			.sort();

		if (this.suggestions.length === 0) {
			this.hideAutocomplete();
			return;
		}

		this.isAutocompleteShowing = true;
		this.container.innerHTML = '';
		const coords = this.editor.renderer.textToScreenCoordinates(cursorPos.row, cursorPos.column);
		this.container.style.left = coords.pageX + 'px';
		this.container.style.top = (coords.pageY + 20) + 'px';

		this.selectedIndex = -1;
		this.suggestions.forEach((fn, idx) => {
			const methodPart = fn.replace(base, '');
			const tip = this.functionTips[fn];
  
			const item = document.createElement('div');
			item.className = 'item';
			if (tip.type == 0 || tip.type === undefined) {
				item.classList.add('function-item');
				item.innerHTML = `<span class="function-name">${methodPart}(..)</span>`;
				item.title = `🛈 ${tip.comment.replace('<br>', '\n')}\n➜${base}${methodPart}(${tip.params.join(', ')})`;
			} else {
				let closings = (tip.type==1) ? ['{', '}'] : ['[', ']'];
				item.classList.add('object-item');
				item.textContent = `${methodPart}${closings.join('..')}`;
				item.title = `🛈 ${tip.comment.replace('<br>', '\n')}\n➜${base}${methodPart} = ${closings[0]}${tip.params.join(', ')}${closings[1]}`;
			}
			

			item.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.selectAutocompleteItem(idx);
			});
			this.container.appendChild(item);
		});
		this.container.style.display = 'block';
		this.highlightSelectedItem();
	}

	hideAutocomplete() {
		this.container.style.display = 'none';
		this.isAutocompleteShowing = false;
		this.suggestions = [];
		this.selectedIndex = -1;
	}

	selectAutocompleteItem(index) {
		if (index < 0 || index >= this.suggestions.length) return;
		const fn = this.suggestions[index];
		const methodPart = fn.replace('ogzeditor.', '');
		const tip = this.functionTips[fn];
		const isFunction = tip.type == 0 || tip.type === undefined;
	
		this.editor.focus();
	
		const cursorPos = this.editor.getCursorPosition();
		const lineText = this.editor.session.getLine(cursorPos.row);
		const textUpToCursor = lineText.substring(0, cursorPos.column);
		
		// Match 'ogzeditor.' followed by word characters
		const prefixMatch = textUpToCursor.match(/(ogzeditor\.)(\w*)$/);
		if (!prefixMatch) {
			// If no match is found, insert normally
			if (isFunction) {
				this.editor.insert(`${methodPart}()`);
				// Move cursor inside the parentheses
				const newPos = { row: cursorPos.row, column: cursorPos.column + methodPart.length + 1 };
				this.editor.selection.moveTo(newPos.row, newPos.column);
			} else {
				this.editor.insert(methodPart);
			}
			this.hideAutocomplete();
			return;
		}
	
		const base = prefixMatch[1]; // 'ogzeditor.'
		const typedPart = prefixMatch[2]; // The part after 'ogzeditor.'
		const insertStart = cursorPos.column - typedPart.length;
	
		// Replace only the typed part after 'ogzeditor.' with the suggestion
		this.editor.session.replace({
			start: { row: cursorPos.row, column: insertStart },
			end: cursorPos
		}, '');
	
		if (isFunction) {
			this.editor.insert(`${methodPart}()`);
			// Move cursor inside the parentheses
			const newPos = { row: cursorPos.row, column: insertStart + methodPart.length + 1 };
			this.editor.selection.moveTo(newPos.row, newPos.column);
		} else {
			this.editor.insert(methodPart);
		}
	
		this.hideAutocomplete();
	}
	
	getParamOffsets(str) {
		let offsets = [];
		let inString = false;
		let stringChar = '';
		let parenCount = 0;
		let squareBracketCount = 0;
		let curlyBraceCount = 0;
		offsets.push(0);
		for (let i = 0; i < str.length; i++) {
			const ch = str[i];
			if (ch === '"' || ch === "'") {
				if (!inString) {
					inString = true;
					stringChar = ch;
				} else if (stringChar === ch) {
					inString = false;
				}
			} else if (!inString) {
				if (ch === '(') parenCount++;
				if (ch === ')') parenCount--;
				if (ch === '[') squareBracketCount++;
				if (ch === ']') squareBracketCount--;
				if (ch === '{') curlyBraceCount++;
				if (ch === '}') curlyBraceCount--;
				if (ch === ',' && parenCount === 0 && squareBracketCount === 0 && curlyBraceCount === 0) {
					offsets.push(i + 1);
				}
			}
		}
		return offsets;
	}
}

function _download_file(name, content, type = 'application/gzip') {
	const blob = new Blob([content], { type: type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;

	link.download = `${name}`;

	link.click();
	URL.revokeObjectURL(url);
}

function getNewFileHandle() {
	return window.showSaveFilePicker({
		suggestedName: 'mynewmap.ogz',
		suggestedStartLocation: 'documents',
		types: [{
			description: 'Cube Engine Map File',
			accept: {
				'application/gzip': ['.ogz']
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

async function readFile(fileHandle) {
	const file = await fileHandle.getFile();
	const stream = file.stream();
	const reader = stream.getReader();
	let result = new Uint8Array();

	return new Promise((resolve, reject) => {
		reader.read().then(function process({done, value}) {
			if (done) {
				resolve(result);
				return;
			}

			let tmp = new Uint8Array(result.length + value.length);
			tmp.set(result, 0);
			tmp.set(value, result.length);
			result = tmp;

			return reader.read().then(process);
		}).catch(reject);
	});
}


class FileSystem {
	constructor() {
		this.hasAccess = 'showOpenFilePicker' in window;
	}
	async save(content, callback = () => {}, onLoading = () => {}) {
		if (!this.fileHandle) {
			return await this.saveAs(content, callback, onLoading);
		}
		try {
			await writeFile(this.fileHandle, content);
		} catch (error) {
			console.error(error);
			return;
		}
		callback(this.fileHandle);
	}

	async saveAs(content, callback = () => {}, onLoading = () => {}) {
		try {
			this.fileHandle = await getNewFileHandle();
		} catch (error) {
			console.log(error)
			callback();
			return;
		}
		onLoading();
		this.save(content, callback);
	}

	async importJson(callback = () => {}, onLoading = () => {}) {
		try {
			const fileHandle = await window.showOpenFilePicker({
				types: [{
					description: 'JSON File',
					accept: {
						'application/json': ['.json']
					}
				}],
				excludeAcceptAllOption: true,
				multiple: false,
			});
			//onLoading(fileHandle[0]);
			const content = await readFile(fileHandle[0]);
			const text = new TextDecoder().decode(content);
			callback({'content': text, 'name': fileHandle[0].name});
		} catch (error) {
			callback();
		}
	}

}
