
// Decodes a Stereogram image ('Magic Eye' - https://en.wikipedia.org/wiki/Autostereogram) and turns it into an in-game heightmap.

// This JavaScript adaptation is based on https://github.com/kscottz/DeMagicEye
class MagicEyeDecoder {
	constructor() {
	}

	/**
	 * Main method to decode the Magic Eye image into a depth map.
	 * @param {Uint8ClampedArray} rgbaArray - The RGBA image data.
	 * @param {number} width - Width of the image.
	 * @param {number} height - Height of the image.
	 * @param {number} [searchWindow=1.1] - Optional search window multiplier.
	 * @returns {Uint8ClampedArray} - The resulting depth map as grayscale data.
	 */
	decode(rgbaArray, width, height, searchWindow = 1.1) {
		// Step 1: Convert RGBA to Grayscale
		const gray = this.rgbaToGrayscale(rgbaArray, width, height);

		// Step 2: Compute Integral Image
		const integral = this.computeIntegralImage(gray, width, height);

		// Step 3: Find Optimal Window
		const optimalWindow = this.findOptimalWindow(gray, integral, width, height);

		// Calculate the actual window size based on the searchWindow multiplier
		const window = Math.floor(searchWindow * optimalWindow);

		// Determine sample size
		const sampleSize = Math.floor(window / 10);

		// Step 4: Generate Depth Map
		const depthMap = this.generateDepthMap(gray, integral, width, height, window, sampleSize);

		// Step 5: Post-processing (Median Filter, Equalize, Invert, Blur)
		const processedDepthMap = this.postProcessDepthMap(depthMap, width, height, window);

		return processedDepthMap;
	}

	/**
	 * Converts RGBA data to grayscale.
	 */
	rgbaToGrayscale(rgba, width, height) {
		const gray = new Uint8ClampedArray(width * height);
		for (let i = 0; i < width * height; i++) {
			const r = rgba[i * 4];
			const g = rgba[i * 4 + 1];
			const b = rgba[i * 4 + 2];
			// Using luminosity method
			gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		}
		return gray;
	}

	/**
	 * Computes the integral image for fast area sum calculations.
	 */
	computeIntegralImage(gray, width, height) {
		const integral = new Uint32Array((width + 1) * (height + 1));
		for (let y = 1; y <= height; y++) {
			let rowSum = 0;
			for (let x = 1; x <= width; x++) {
				rowSum += gray[(y - 1) * width + (x - 1)];
				integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum;
			}
		}
		return integral;
	}

	/**
	 * Calculates the sum of pixels in a rectangular window using the integral image.
	 */
	integralWindow(x1, y1, x2, y2, integral, width) {
		const p3 = integral[y2 * (width + 1) + x2];
		const p2 = integral[y2 * (width + 1) + x1];
		const p1 = integral[y1 * (width + 1) + x2];
		const p0 = integral[y1 * (width + 1) + x1];
		return p3 - p2 - p1 + p0;
	}

	/**
	 * Finds the optimal window size for disparity matching.
	 */
	findOptimalWindow(gray, integral, width, height, minSplit = 4, maxSplit = 16) {
		const maxWin = Math.floor(width / minSplit);
		const minWin = Math.floor(width / maxSplit);
		let minVal = Infinity;
		let optimal = minWin;

		for (let win = minWin; win <= maxWin; win++) {
			// Sum of left half
			const left = this.integralWindow(0, 0, win, height, integral, width);
			// Sum of right half
			const right = this.integralWindow(win, 0, 2 * win, height, integral, width);
			const diff = Math.abs(left - right) / (win * height);
			if (diff < minVal) {
				minVal = diff;
				optimal = win;
			}
		}

		return optimal;
	}

	/**
	 * Generates the depth map by matching disparities.
	 */
	generateDepthMap(gray, integral, width, height, window, sampleSize) {
		const depthMap = new Int32Array(width * height);

		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - window - 1; x++) {
				// Sum of the sample window
				const sampleSum = this.integralWindow(x, y, x + sampleSize, y + 1, integral, width);

				let minDiff = Infinity;
				let bestOffset = 0;

				// Search within the window
				const searchStart = Math.floor(window * 0.5);
				const searchEnd = window - sampleSize;

				for (let offset = searchStart; offset < searchEnd; offset++) {
					const testX = x + offset;
					if (testX + sampleSize > width) break;

					const testSum = this.integralWindow(testX, y, testX + sampleSize, y + 1, integral, width);
					const diff = Math.abs(sampleSum - testSum) / (sampleSize);

					if (diff < minDiff) {
						minDiff = diff;
						bestOffset = offset;
					}
				}

				// Assign the best offset (disparity)
				depthMap[y * width + x] = bestOffset;
			}
		}

		// Normalize depth map to 0-255
		let maxDisparity = 0;
		for (let i = 0; i < depthMap.length; i++) {
			if (depthMap[i] > maxDisparity) {
				maxDisparity = depthMap[i];
			}
		}

		const normalizedDepthMap = new Uint8ClampedArray(width * height);
		for (let i = 0; i < depthMap.length; i++) {
			normalizedDepthMap[i] = Math.floor((depthMap[i] / maxDisparity) * 255);
		}

		return normalizedDepthMap;
	}

	/**
	 * Applies post-processing steps to enhance the depth map.
	 */
	postProcessDepthMap(depthMap, width, height, window) {
		// Convert to ImageData-like structure
		let imageData = new Uint8ClampedArray(depthMap.length * 4);
		for (let i = 0; i < depthMap.length; i++) {
			const val = depthMap[i];
			imageData[i * 4] = val;     // R
			imageData[i * 4 + 1] = val; // G
			imageData[i * 4 + 2] = val; // B
			imageData[i * 4 + 3] = 255; // A
		}

		// Apply median filter
		imageData = this.medianFilter(imageData, width, height);

		// Apply histogram equalization
		imageData = this.histogramEqualization(imageData, width, height);

		// Invert colors
		imageData = this.invertColors(imageData, width, height);

		// Apply blur (simple box blur)
		imageData = this.blur(imageData, width, height, 5);

		// Extract grayscale depth map
		const processedDepthMap = new Uint8ClampedArray(width * height);
		for (let i = 0; i < width * height; i++) {
			processedDepthMap[i] = imageData[i * 4];
		}

		return processedDepthMap;
	}

	/**
	 * Applies a median filter to the image data.
	 */
	medianFilter(imageData, width, height) {
		const filtered = new Uint8ClampedArray(imageData.length);
		const radius = 1; // 3x3 kernel

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const neighbors = [];
				for (let dy = -radius; dy <= radius; dy++) {
					for (let dx = -radius; dx <= radius; dx++) {
						const nx = x + dx;
						const ny = y + dy;
						if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
							const idx = (ny * width + nx) * 4;
							neighbors.push(imageData[idx]);
						}
					}
				}
				neighbors.sort((a, b) => a - b);
				const median = neighbors[Math.floor(neighbors.length / 2)];
				const idx = (y * width + x) * 4;
				filtered[idx] = median;
				filtered[idx + 1] = median;
				filtered[idx + 2] = median;
				filtered[idx + 3] = 255;
			}
		}
		return filtered;
	}

	/**
	 * Applies histogram equalization to enhance contrast.
	 */
	histogramEqualization(imageData, width, height) {
		const histogram = new Array(256).fill(0);
		const totalPixels = width * height;

		// Build histogram
		for (let i = 0; i < width * height; i++) {
			const val = imageData[i * 4];
			histogram[val]++;
		}

		// Compute cumulative distribution
		const cumulative = [];
		cumulative[0] = histogram[0];
		for (let i = 1; i < 256; i++) {
			cumulative[i] = cumulative[i - 1] + histogram[i];
		}

		// Normalize cumulative distribution
		const lut = new Array(256);
		for (let i = 0; i < 256; i++) {
			lut[i] = Math.floor((cumulative[i] / totalPixels) * 255);
		}

		// Apply equalization
		const equalized = new Uint8ClampedArray(imageData.length);
		for (let i = 0; i < width * height; i++) {
			const val = imageData[i * 4];
			const eq = lut[val];
			equalized[i * 4] = eq;
			equalized[i * 4 + 1] = eq;
			equalized[i * 4 + 2] = eq;
			equalized[i * 4 + 3] = 255;
		}

		return equalized;
	}

	/**
	 * Inverts the colors of the image data.
	 */
	invertColors(imageData, width, height) {
		const inverted = new Uint8ClampedArray(imageData.length);
		for (let i = 0; i < width * height; i++) {
			inverted[i * 4] = 255 - imageData[i * 4];
			inverted[i * 4 + 1] = 255 - imageData[i * 4 + 1];
			inverted[i * 4 + 2] = 255 - imageData[i * 4 + 2];
			inverted[i * 4 + 3] = 255;
		}
		return inverted;
	}

	/**
	 * Applies a simple box blur to the image data.
	 */
	blur(imageData, width, height, kernelSize = 5) {
		const half = Math.floor(kernelSize / 2);
		const blurred = new Uint8ClampedArray(imageData.length);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let sum = 0;
				let count = 0;

				for (let ky = -half; ky <= half; ky++) {
					for (let kx = -half; kx <= half; kx++) {
						const nx = x + kx;
						const ny = y + ky;
						if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
							const idx = (ny * width + nx) * 4;
							sum += imageData[idx];
							count++;
						}
					}
				}

				const avg = Math.floor(sum / count);
				const idx = (y * width + x) * 4;
				blurred[idx] = avg;
				blurred[idx + 1] = avg;
				blurred[idx + 2] = avg;
				blurred[idx + 3] = 255;
			}
		}

		return blurred;
	}
}

const MAGICEYE = new MagicEyeDecoder();

ogzeditor.assetQuality(50); // 100 means high quality (slow)
let ASSET = ogzeditor.asset;
let IMAGE = ASSET.frames[0];

let WIDTH = IMAGE.width;
let HEIGHT = IMAGE.height;
let PIXELS = MAGICEYE.decode(IMAGE.rgba, WIDTH, HEIGHT);

let GRIDPOWER = 1;
let CUBESIZE = 1 << GRIDPOWER;

let map = [];

let START_POS = [0, 0, 512];

map.push(PIXELS.reduce((cubes, _, i) => {
	let x = i % WIDTH;
	let y = Math.floor(i / WIDTH);

	let depth = PIXELS[i] / 255;

	let zHeight = depth*64;
	if (zHeight != 0) {
		for (let z = 0; z <= zHeight; z += CUBESIZE) {
			cubes.push({
				x: START_POS[0] + (x * CUBESIZE),
				y: START_POS[1] + (y * CUBESIZE), 
				z: START_POS[2] + z,
				g: GRIDPOWER,
				vcolor: [depth, depth, depth],
				af: 1462
			});
		}
	}

	return cubes;
}, []));

geometry(() => map);