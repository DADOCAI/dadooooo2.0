// Based on: https://github.com/WSE-research/image-to-ascii-art
// Core ASCII conversion utilities

export interface ConversionOptions {
  width: number;
  height: number;
  charset: string;
  invert: boolean;
  colored: boolean;
  background: 'white' | 'black';
  pixelMode: boolean;
  showCharacters: boolean;
}

export interface AsciiArtResult {
  text: string;
  html: string;
  width: number;
  height: number;
  imageData?: ImageData; // Store original image data for JPG export
}

/**
 * Main function to convert image to ASCII art
 */
export function convertImageToAscii(
  imageData: ImageData,
  options: ConversionOptions
): AsciiArtResult {
  const { width, height, data } = imageData;
  const { charset, invert, colored, background, pixelMode, showCharacters } = options;

  const charMap: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const normalizedValue = i / 255;
    const adjustedValue = invert ? 1 - normalizedValue : normalizedValue;
    const charIndex = Math.floor(adjustedValue * (charset.length - 1));
    charMap[i] = charset[charIndex] || ' ';
  }

  const textLines: string[] = new Array(height);
  const htmlLines: string[] = new Array(height);

  for (let y = 0; y < height; y++) {
    const lineChars: string[] = new Array(width);
    const htmlParts: string[] = new Array(width);

    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3];

      const gray = getGrayscale(r, g, b) | 0;
      const char = charMap[gray];
      const displayChar = (pixelMode && !showCharacters) ? ' ' : char;

      lineChars[x] = displayChar;

      if (pixelMode) {
        const bgColor = `rgb(${r},${g},${b})`;
        const textColor = showCharacters ? (background === 'white' ? '#000000' : '#ffffff') : 'transparent';
        htmlParts[x] = `<span style=\"color:${textColor};background-color:${bgColor};opacity:${alpha/255}\">${displayChar}</span>`;
      } else if (colored) {
        const color = `rgb(${r},${g},${b})`;
        const bgColor = background === 'white' ? '#ffffff' : '#000000';
        htmlParts[x] = `<span style=\"color:${color};background-color:${bgColor};opacity:${alpha/255}\">${displayChar}</span>`;
      } else {
        htmlParts[x] = displayChar;
      }
    }

    textLines[y] = lineChars.join('');
    htmlLines[y] = htmlParts.join('');
  }

  const asciiText = textLines.join('\n') + '\n';
  const asciiHtml = htmlLines.join('\n') + '\n';

  return {
    text: asciiText,
    html: asciiHtml,
    width,
    height,
    imageData
  };
}

/**
 * Calculate grayscale value from RGB
 * Using the luminosity method
 */
function getGrayscale(r: number, g: number, b: number): number {
  // Standard luminosity formula
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Map grayscale value to ASCII character
 */
function getCharacter(gray: number, charset: string, invert: boolean): string {
  const normalizedValue = gray / 255;
  const adjustedValue = invert ? 1 - normalizedValue : normalizedValue;
  
  const charIndex = Math.floor(adjustedValue * (charset.length - 1));
  return charset[charIndex] || ' ';
}

/**
 * Load and process image
 */
export async function loadAndProcessImage(
  imageUrl: string,
  targetWidth: number,
  targetHeight?: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Calculate height if not provided (maintain aspect ratio)
      const aspectRatio = img.height / img.width;
      const width = targetWidth;
      const height = targetHeight || Math.floor(targetWidth * aspectRatio * 0.5);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      resolve(imageData);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Predefined character sets
 */
export const CHARACTER_SETS = {
  'standard': ' .:-=+*#%@',
  'standard-reverse': '@%#*+=-:. ',
  'detailed': ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  'blocks': ' ░▒▓█',
  'simple': ' .:oO@',
  'minimal': ' .oO',
  '10-levels': ' .:-=+*#%@',
  '70-levels': ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
};

/**
 * Export ASCII art as text file
 */
export function downloadAsText(content: string, filename: string = 'ascii-art.txt'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export ASCII art as HTML file
 */
export function downloadAsHtml(content: string, filename: string = 'ascii-art.html'): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ASCII Art</title>
  <style>
    body {
      background: #000;
      color: #fff;
      margin: 0;
      padding: 20px;
      font-family: monospace;
      font-size: 10px;
      line-height: 1;
      white-space: pre;
      overflow-x: auto;
    }
  </style>
</head>
<body>${content}</body>
</html>`;
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      throw new Error('Failed to copy to clipboard');
    }
    document.body.removeChild(textArea);
  }
}

/**
 * Export ASCII art as JPG image
 */
export async function downloadAsJpg(
  result: AsciiArtResult,
  options: ConversionOptions,
  fontSize: number = 10,
  filename: string = 'ascii-art.jpg'
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Set canvas size based on ASCII art dimensions and font size
  const charWidth = fontSize * 0.6; // Monospace character width ratio
  const charHeight = fontSize;
  canvas.width = result.width * charWidth;
  canvas.height = result.height * charHeight;
  
  // Set font
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';
  
  // Set background
  const backgroundColor = (options.colored || options.pixelMode) && options.background === 'white' 
    ? '#ffffff' 
    : '#000000';
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Parse and render the ASCII art
  const lines = result.text.split('\n');
  const imageData = result.imageData;
  
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      const posX = x * charWidth;
      const posY = y * charHeight;
      
      // Get color from imageData if available
      let r = 212, g = 212, b = 212; // default neutral-300
      if (imageData && imageData.data) {
        const index = (y * result.width + x) * 4;
        r = imageData.data[index];
        g = imageData.data[index + 1];
        b = imageData.data[index + 2];
      }
      
      if (options.pixelMode) {
        // Pixel mode: draw colored background blocks
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(posX, posY, charWidth, charHeight);
        
        // Draw character on top if enabled
        if (options.showCharacters) {
          ctx.fillStyle = options.background === 'white' ? '#000000' : '#ffffff';
          ctx.fillText(char, posX, posY);
        }
      } else if (options.colored) {
        // Colored mode: colored characters with solid background
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(char, posX, posY);
      } else {
        // Regular ASCII art
        ctx.fillStyle = '#d4d4d4'; // neutral-300
        ctx.fillText(char, posX, posY);
      }
    }
  }
  
  // Convert canvas to blob and download
  canvas.toBlob((blob) => {
    if (!blob) {
      throw new Error('Failed to create image blob');
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
}

export function renderToCanvas(
  result: AsciiArtResult,
  options: ConversionOptions,
  fontSize: number,
  canvas: HTMLCanvasElement
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const charWidth = fontSize * 0.6;
  const charHeight = fontSize;
  canvas.width = Math.max(1, Math.floor(result.width * charWidth));
  canvas.height = Math.max(1, Math.floor(result.height * charHeight));

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  const backgroundColor = (options.colored || options.pixelMode) && options.background === 'white' 
    ? '#ffffff' 
    : '#000000';
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lines = result.text.split('\n');
  const imageData = result.imageData;

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      const posX = x * charWidth;
      const posY = y * charHeight;

      let r = 212, g = 212, b = 212;
      if (imageData && imageData.data) {
        const index = (y * result.width + x) * 4;
        r = imageData.data[index];
        g = imageData.data[index + 1];
        b = imageData.data[index + 2];
      }

      if (options.pixelMode) {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(posX, posY, charWidth, charHeight);
        if (options.showCharacters) {
          ctx.fillStyle = options.background === 'white' ? '#000000' : '#ffffff';
          ctx.fillText(char, posX, posY);
        }
      } else if (options.colored) {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(char, posX, posY);
      } else {
        ctx.fillStyle = '#d4d4d4';
        ctx.fillText(char, posX, posY);
      }
    }
  }
}

export function renderFrameToCanvas(
  imageData: ImageData | undefined,
  options: ConversionOptions,
  fontSize: number,
  canvas: HTMLCanvasElement
): void {
  if (!imageData) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const charWidth = fontSize * 0.6;
  const charHeight = fontSize;
  canvas.width = Math.max(1, Math.floor(imageData.width * charWidth));
  canvas.height = Math.max(1, Math.floor(imageData.height * charHeight));

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  const backgroundColor = (options.colored || options.pixelMode) && options.background === 'white' 
    ? '#ffffff' 
    : '#000000';
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { data, width, height } = imageData;
  const charset = options.charset;
  const invert = options.invert;

  const charMap: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const normalizedValue = i / 255;
    const adjustedValue = invert ? 1 - normalizedValue : normalizedValue;
    const charIndex = Math.floor(adjustedValue * (charset.length - 1));
    charMap[i] = charset[charIndex] || ' ';
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const gray = getGrayscale(r, g, b) | 0;
      const char = charMap[gray];
      const posX = x * charWidth;
      const posY = y * charHeight;

      if (options.pixelMode) {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(posX, posY, charWidth, charHeight);
        if (options.showCharacters) {
          ctx.fillStyle = options.background === 'white' ? '#000000' : '#ffffff';
          ctx.fillText(char, posX, posY);
        }
      } else if (options.colored) {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(char, posX, posY);
      }
    }
  }
}
