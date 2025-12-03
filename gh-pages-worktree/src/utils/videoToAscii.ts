// Video and GIF to ASCII art conversion utilities

import { ConversionOptions, AsciiArtResult, convertImageToAscii } from './imageToAscii';

/**
 * Extract frames from video file
 */
export async function extractVideoFrames(
  file: File,
  targetWidth: number,
  targetHeight: number = 0,
  fps: number = 10
): Promise<ImageData[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const frames: ImageData[] = [];
    const url = URL.createObjectURL(file);
    
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Calculate dimensions
      const aspectRatio = video.videoHeight / video.videoWidth;
      const width = targetWidth;
      const height = targetHeight || Math.floor(targetWidth * aspectRatio * 0.5);
      
      canvas.width = width;
      canvas.height = height;
      
      const duration = video.duration;
      const frameInterval = 1 / fps;
      const timestamps: number[] = [];
      
      const maxFrames = 60;
      const actualFps = Math.min(fps, maxFrames / duration);
      const actualInterval = 1 / actualFps;
      
      for (let t = 0; t < duration && timestamps.length < maxFrames; t += actualInterval) {
        timestamps.push(t);
      }

      let currentIndex = 0;

      const captureFrame = () => {
        if (currentIndex >= timestamps.length) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }

        const timestamp = timestamps[currentIndex];
        video.currentTime = timestamp;
      };

      video.onseeked = () => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        frames.push(imageData);

        currentIndex++;
        setTimeout(captureFrame, 0);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      captureFrame();
    };
  });
}

/**
 * Extract frames from GIF
 */
export async function extractGifFrames(
  file: File,
  targetWidth: number,
  targetHeight?: number
): Promise<ImageData[]> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions
      const aspectRatio = img.height / img.width;
      const width = targetWidth;
      const height = targetHeight || Math.floor(targetWidth * aspectRatio * 0.5);
      
      canvas.width = width;
      canvas.height = height;

      // For GIF, we'll capture the current frame
      // Note: Browser will handle GIF animation automatically
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      URL.revokeObjectURL(url);
      
      // For static extraction, return single frame
      resolve([imageData]);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load GIF'));
    };

    img.src = url;
  });
}

/**
 * Process video frame to ASCII with given options
 */
export function processVideoFrameToAscii(
  imageData: ImageData,
  options: ConversionOptions,
  targetWidth: number,
  targetHeight?: number
): AsciiArtResult {
  // Resize if needed
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const aspectRatio = imageData.height / imageData.width;
  const width = targetWidth;
  const height = targetHeight || Math.floor(targetWidth * aspectRatio * 0.5);
  
  canvas.width = width;
  canvas.height = height;

  // Create temporary canvas for source
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  
  if (!tempCtx) {
    throw new Error('Failed to get temp canvas context');
  }

  tempCtx.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tempCanvas, 0, 0, width, height);

  const resizedImageData = ctx.getImageData(0, 0, width, height);
  
  return convertImageToAscii(resizedImageData, options);
}

/**
 * Check if file is video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Check if file is GIF
 */
export function isGifFile(file: File): boolean {
  return file.type === 'image/gif';
}

/**
 * Check if file is animated media (video or GIF)
 */
export function isAnimatedMedia(file: File): boolean {
  return isVideoFile(file) || isGifFile(file);
}
