importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js', './mini-jsocta.js', './jsocta_helpers.js', './external/gifuct.js');

class AssetHandler {
	constructor() {
		this.clearAll();
	}

	clearAll(preserveLast) {
		if (!preserveLast) {
			this.asset = { frames: [], originalFrames: [], json: [] };
			return;
		}
		
		const keepLastOrEmpty = (arr) => (arr.length > 1 ? arr.slice(-1) : []);
		
		this.asset = {
			frames: keepLastOrEmpty(this.asset.frames),
			originalFrames: keepLastOrEmpty(this.asset.originalFrames),
			json: keepLastOrEmpty(this.asset.json)
		};
	}	  

	async processJsonFiles(jsonFiles) {
		for (const content of jsonFiles) {
			try {
				const jsonObject = JSON.parse(content);
				this.asset.json.push(jsonObject);
			} catch (err) {
				console.error(`Failed to parse JSON`, err);
				postMessage({ type: 'failed', content: `Failed to parse JSON: ${err.message}` });
			}
		}
	}

	async processDataUrls(dataUrls) {
		if (dataUrls.length === 0) return;

		// restore original frames before appending new ones
		if (this.asset.originalFrames.length > 0) {
			this.asset.frames = this.asset.originalFrames;
		}

		// if it's a GIF, process it with gifuct-js
		if (dataUrls.length === 1 && dataUrls[0].startsWith('data:image/gif')) {
			await this.processGif(dataUrls[0]);
		} else {
			// process as separate images
			await this.processImages(dataUrls);
		}

		// save original frames for non-destructive scaling
		this.asset.originalFrames = this.asset.frames;
	}

	async processGif(gifDataUrl) {
		try {
			const response = await fetch(gifDataUrl);
			const buffer = await response.arrayBuffer();
			const gif = gifuct.parseGIF(buffer);
			const frames = gifuct.decompressFrames(gif, true);
			const { width: gifWidth, height: gifHeight } = gif.lsd;
			if (frames.length === 0) return;
	
			frames.forEach((frame, frameIndex) => {
				const patch = frame.patch;
				const rgbaData = new Uint8ClampedArray(gifWidth * gifHeight * 4);
	
				// if this is not the first frame, get the previous frame's RGBA data
				//const previousFrameData = frameIndex > 0 ? this.asset.frames[frameIndex - 1].rgba : null;
	
				for (let i = 0; i < patch.length; i += 4) {
					const pixelIndex = i / 4;
					const rgbaIndex = pixelIndex * 4;
	
					let r = patch[i];
					let g = patch[i + 1];
					let b = patch[i + 2];
					let a = patch[i + 3];
	
					// if not the first frame and the pixel is fully black (including alpha),
					// use the pixel from the previous frame
					/*if (frameIndex > 0 && r === 0 && g === 0 && b === 0) {
						r = previousFrameData[rgbaIndex];
						g = previousFrameData[rgbaIndex + 1];
						b = previousFrameData[rgbaIndex + 2];
						a = previousFrameData[rgbaIndex + 3];
					}*/
	
					rgbaData[rgbaIndex] = r;
					rgbaData[rgbaIndex + 1] = g;
					rgbaData[rgbaIndex + 2] = b;
					rgbaData[rgbaIndex + 3] = a;
				}
	
				this.asset.frames.push({
					rgba: rgbaData,
					width: gifWidth,
					height: gifHeight
				});
			});
		} catch (error) {
			console.error('Error processing GIF:', error);
		}
	}
	
	async processImages(dataUrls) {
		try {
			const loadImage = async (dataUrl) => {
				const response = await fetch(dataUrl);
				const blob = await response.blob();
				const bitmap = await createImageBitmap(blob);
				return bitmap;
			};

			const canvas = new OffscreenCanvas(512, 512);
			const ctx = canvas.getContext('2d', { willReadFrequently: true });

			for (const dataUrl of dataUrls) {
				const img = await loadImage(dataUrl);
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				const imageData = ctx.getImageData(0, 0, img.width, img.height);
				const rgbaData = new Uint8ClampedArray(img.width * img.height * 4);

				for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 4) {
					rgbaData[j] = imageData.data[i];
					rgbaData[j + 1] = imageData.data[i + 1];
					rgbaData[j + 2] = imageData.data[i + 2];
					rgbaData[j + 3] = imageData.data[i + 3];
				}

				this.asset.frames.push({
					rgba: rgbaData,
					width: img.width,
					height: img.height
				});
			}
		} catch (error) {
			console.error('Error processing images:', error);
		}
	}

	setQuality(percentage, posterizeLevels) {
		percentage = Math.min(Math.max(5, percentage), 100);

		const scaleFactor = percentage / 100;
		const canvas = new OffscreenCanvas(512, 512);
		const ctx = canvas.getContext('2d');

		this.asset.frames = this.asset.originalFrames.map(frame => {
			if (frame.rgba.length === 0 || frame.width === 0 || frame.height === 0) {
				console.error('Invalid frame data encountered');
				return frame;
			}

			canvas.width = Math.floor(frame.width * scaleFactor);
			canvas.height = Math.floor(frame.height * scaleFactor);

			const tempCanvas = new OffscreenCanvas(frame.width, frame.height);
			const tempCtx = tempCanvas.getContext('2d');

			const imgData = new ImageData(new Uint8ClampedArray(frame.rgba), frame.width, frame.height);
			tempCtx.putImageData(imgData, 0, 0);

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(tempCanvas, 0, 0, frame.width, frame.height, 0, 0, canvas.width, canvas.height);

			const resizedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			return {
				rgba: new Uint8ClampedArray(resizedImageData.data),
				width: canvas.width,
				height: canvas.height
			};
		});

		if (typeof posterizeLevels !== 'undefined') {
			this.setPosterize(posterizeLevels);
		}
	}

	setPosterize(levels = 2) {
		// constrain levels to a minimum of 2 to avoid division by zero or weird results.
		const effectiveLevels = Math.max(2, levels);

		// calculate the size of each color "step".
		const stepSize = 256 / effectiveLevels;

		this.asset.frames.forEach((frame) => {
			const { rgba } = frame;
			for (let i = 0; i < rgba.length; i += 4) {
				let r = rgba[i];
				let g = rgba[i + 1];
				let b = rgba[i + 2];
				// alpha channel is rgba[i + 3] - we leave it as is

				// convert the current color to a "bucket" determined by stepSize
				r = Math.floor(r / stepSize) * stepSize;
				g = Math.floor(g / stepSize) * stepSize;
				b = Math.floor(b / stepSize) * stepSize;

				rgba[i] = r;
				rgba[i + 1] = g;
				rgba[i + 2] = b;
				// leave rgba[i + 3] (alpha) unchanged
			}
		});
	}
}


// worker message handling
const assetHandler = new AssetHandler();

self.onmessage = async (event) => {
	const data = event.data;
	let jsocta_skip_init = {state: false};

	switch(data.type) {
		case 'clear_assets':
			assetHandler.clearAll(data.preserveLast);
			postMessage({type: 'info', content: `${data.preserveLast ? 'Previous' : 'All'} assets have been removed.`, state: 0, prefix: '🗑️'});
			postMessage({type: 'done_asset', content: assetHandler.asset});
			break;
		case 'upload':
			postMessage({type: 'info', content: 'Processing assets..', prefix: '🖼️'});

			// if we have images, process them
			if (data.images && data.images.length) {
				await assetHandler.processDataUrls(data.images);
			}

			// if we have JSON files, parse them
			if (data.jsonFiles && data.jsonFiles.length) {
				await assetHandler.processJsonFiles(data.jsonFiles);
			}

			postMessage({type: 'done_asset', content: assetHandler.asset});
			break;

		case 'user_script':
			JSOCTAHELPER.execute(data.content);
			break;

		case 'jsocta_fix_mapsize':
			if (JSOCTAHELPER.OBJECTS.mapvars.mapsize >= 65536) {
				// throw warn, we reached the max mapsize
				console.warn('Out-of-bounds cubes are beyond predefined limit of 65536 units (mapscale 16).');
				postMessage({type: 'failed', content: 'Out-of-bounds cubes are beyond predefined limit of 65536 units (mapscale 16).'});
				return;
			} else {
				JSOCTAHELPER.OBJECTS.mapvars.mapsize *= 2;
				jsocta_skip_init = {state: true, reason: `Map size adjusted to ${Math.log2(JSOCTAHELPER.OBJECTS.mapvars.mapsize)}.`};
			}

		case 'jsocta_start_process':
			try {
				if (!jsocta_skip_init.state) {
					postMessage({type: 'info', content: 'Extracting object data..', prefix: '🔎'});
					JSOCTAHELPER.execute(data.content); // run user's javascript
				}
				
				postMessage({type: 'info', content: `${jsocta_skip_init.state ? `⚠️ ${jsocta_skip_init.reason}\n` : ''}Writing OGZ data..`});
				JSOCTAHELPER.encode(!jsocta_skip_init.state); // converts js objects to hex string

				postMessage({type: 'info', content: 'Compressing OGZ data..', prefix: '⏳'});
				JSOCTAHELPER.compress(); // finally gzip everything

				postMessage({type: 'done_ogz', content: {OBJECTS: JSOCTAHELPER.OBJECTS, JSOCTA: JSOCTAHELPER.JSOCTA, GZIP: JSOCTAHELPER.GZIP}});
			} catch (error) {
				console.warn(error);
				postMessage({type: 'failed', content: error});
			}
			break;
	}
};

class JSOCTA_helper {
	constructor(assethandler) {
		this.OBJECTS = {
			mapvars: {'maptitle': `map created with OGZ Editor`},
			entities: [],
			geometry: []
		}
		this.JSOCTA = {};
		this.byteArray = [];

		this.onerror = () => {};
		this.assetHandler = assethandler;
	}

	set_mapvars(object = {}) {
		if (typeof object === 'function') {
			object = object();
		}
		this.OBJECTS.mapvars = object || {};
	}

	set_entities(object = []) {
		if (typeof object === 'function') {
			object = object();
		}
		this.OBJECTS.entities = object || [];
		this.OBJECTS.entities = this.OBJECTS.entities.flat();
	}

	set_geometry(object = []) {
		if (typeof object === 'function') {
			object = object();
		}
		this.OBJECTS.geometry = object || [];
		this.OBJECTS.geometry = this.OBJECTS.geometry.flat();
	}

	execute(text) {
		if (text.includes('.asset') && assetHandler.asset.frames.length === 0 && assetHandler.asset.json.length === 0) {
			postMessage({
				type: 'failed',
				content: '⚠️ This script requires at least one asset, make sure to upload it and try again.'
			});
			return;
		}
		//console.log('executing user script')
		const helpers = {
			...jsocta_helpers,
			asset: this.assetHandler.asset,
			assetQuality: this.assetHandler.setQuality,
			assetReduceColors: this.assetHandler.setPosterize
		}
		const user_script = new Function('mapvars', 'entities', 'geometry', 'ogzeditor', text);
		user_script(
			this.set_mapvars.bind(this), 
			this.set_entities.bind(this), 
			this.set_geometry.bind(this),
			helpers
		);
	}

	encode(fresh = true) {
		if (fresh) {
			this.JSOCTA = new OctaMap(this.OBJECTS);
		};
		this.byteArray = this.JSOCTA.get_byte_array();
	}

	compress() {
		this.GZIP = pako.gzip(this.byteArray);
	}
}

const JSOCTAHELPER = new JSOCTA_helper(assetHandler);
