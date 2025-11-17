// Based on the open-source project: https://github.com/WSE-research/image-to-ascii-art

export interface AsciiSettings {
  width: number;
  charset: string;
  invert: boolean;
  fontSize: number;
  colorMode: 'grayscale' | 'color' | 'ansi';
}

export interface AsciiResult {
  ascii: string;
  html?: string;
  width: number;
  height: number;
}

// Character sets with different density levels
export const CHARSETS = {
  standard: '@%#*+=-:. ',
  detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  simple: '@#*+=-:. ',
  blocks: '█▓▒░ ',
  dots: '●◐◑◒◓○ ',
  minimal: '█▄▀ ',
  ascii10: '@%#*+=-:. ',
  ascii70: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
};

/**
 * Convert an image to ASCII art
 */
export async function imageToAscii(
  imageSource: string | HTMLImageElement,
  settings: AsciiSettings
): Promise<AsciiResult> {
  return new Promise((resolve, reject) => {
    const img = typeof imageSource === 'string' ? new window.Image() : imageSource;
    
    const processImage = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.height / img.width;
        const targetWidth = settings.width;
        // Character aspect ratio compensation (characters are taller than wide)
        const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Draw image with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        let result: AsciiResult;
        
        if (settings.colorMode === 'color') {
          result = convertToColorAscii(imageData, settings);
        } else if (settings.colorMode === 'ansi') {
          result = convertToAnsiAscii(imageData, settings);
        } else {
          result = convertToGrayscaleAscii(imageData, settings);
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.onload = processImage;
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSource;
    } else {
      processImage();
    }
  });
}

/**
 * Convert image data to grayscale ASCII
 */
function convertToGrayscaleAscii(
  imageData: ImageData,
  settings: AsciiSettings
): AsciiResult {
  const { data, width, height } = imageData;
  const charset = settings.charset;
  let ascii = '';
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      
      // Calculate relative luminance (perceived brightness)
      // Using the standard formula for human perception
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
      const normalizedBrightness = brightness / 255;
      
      // Map brightness to character
      const charIndex = Math.floor(
        (settings.invert ? 1 - normalizedBrightness : normalizedBrightness) * 
        (charset.length - 1)
      );
      
      ascii += charset[charIndex] || charset[charset.length - 1];
    }
    ascii += '\n';
  }
  
  return {
    ascii,
    width,
    height,
  };
}

/**
 * Convert image data to colored ASCII (HTML)
 */
function convertToColorAscii(
  imageData: ImageData,
  settings: AsciiSettings
): AsciiResult {
  const { data, width, height } = imageData;
  const charset = settings.charset;
  let ascii = '';
  let html = '';
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      
      // Calculate brightness
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
      const normalizedBrightness = brightness / 255;
      
      // Map brightness to character
      const charIndex = Math.floor(
        (settings.invert ? 1 - normalizedBrightness : normalizedBrightness) * 
        (charset.length - 1)
      );
      
      const char = charset[charIndex] || charset[charset.length - 1];
      ascii += char;
      
      // Add color styling
      const color = `rgb(${r},${g},${b})`;
      const opacity = a / 255;
      html += `<span style="color:${color};opacity:${opacity}">${char}</span>`;
    }
    ascii += '\n';
    html += '\n';
  }
  
  return {
    ascii,
    html,
    width,
    height,
  };
}

/**
 * Convert image data to ANSI colored ASCII
 */
function convertToAnsiAscii(
  imageData: ImageData,
  settings: AsciiSettings
): AsciiResult {
  const { data, width, height } = imageData;
  const charset = settings.charset;
  let ascii = '';
  let html = '';
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      
      // Calculate brightness
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const normalizedBrightness = brightness / 255;
      
      // Map brightness to character
      const charIndex = Math.floor(
        (settings.invert ? 1 - normalizedBrightness : normalizedBrightness) * 
        (charset.length - 1)
      );
      
      const char = charset[charIndex] || charset[charset.length - 1];
      
      // Map RGB to ANSI 256 color
      const ansiColor = rgbToAnsi256(r, g, b);
      ascii += char;
      html += `<span style="color:${ansiToRgb(ansiColor)}">${char}</span>`;
    }
    ascii += '\n';
    html += '\n';
  }
  
  return {
    ascii,
    html,
    width,
    height,
  };
}

/**
 * Convert RGB to ANSI 256 color code
 */
function rgbToAnsi256(r: number, g: number, b: number): number {
  // Grayscale
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  
  // Color
  const ansiR = Math.round((r / 255) * 5);
  const ansiG = Math.round((g / 255) * 5);
  const ansiB = Math.round((b / 255) * 5);
  
  return 16 + 36 * ansiR + 6 * ansiG + ansiB;
}

/**
 * Convert ANSI color code back to RGB for display
 */
function ansiToRgb(ansi: number): string {
  if (ansi < 16) {
    // Basic colors
    const colors = [
      '#000000', '#800000', '#008000', '#808000',
      '#000080', '#800080', '#008080', '#c0c0c0',
      '#808080', '#ff0000', '#00ff00', '#ffff00',
      '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
    ];
    return colors[ansi];
  } else if (ansi < 232) {
    // 216 colors
    const i = ansi - 16;
    const r = Math.floor(i / 36) * 51;
    const g = (Math.floor(i / 6) % 6) * 51;
    const b = (i % 6) * 51;
    return `rgb(${r},${g},${b})`;
  } else {
    // Grayscale
    const gray = 8 + (ansi - 232) * 10;
    return `rgb(${gray},${gray},${gray})`;
  }
}

/**
 * Download ASCII art as a text file
 */
export function downloadAscii(ascii: string, filename: string = 'ascii-art.txt'): void {
  const blob = new Blob([ascii], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy ASCII art to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
