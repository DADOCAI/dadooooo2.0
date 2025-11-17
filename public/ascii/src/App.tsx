import { useState, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { ImageUploader } from './components/ImageUploader';
import { AsciiOutput } from './components/AsciiOutput';
import { ControlPanel } from './components/ControlPanel';
import { 
  loadAndProcessImage, 
  convertImageToAscii, 
  ConversionOptions,
  AsciiArtResult,
  CHARACTER_SETS
} from './utils/imageToAscii';
import {
  extractVideoFrames
} from './utils/videoToAscii';

export default function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [asciiResult, setAsciiResult] = useState<AsciiArtResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fontSize, setFontSize] = useState(10);
  const [isShaking, setIsShaking] = useState(false);
  const [isJitterOn, setIsJitterOn] = useState(false);
  
  // Video/GIF state
  const [isAnimated, setIsAnimated] = useState(false);
  const [videoFrames, setVideoFrames] = useState<ImageData[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(10);
  const lastFrameTimeRef = useRef<number>(0);
  
  const [options, setOptions] = useState<ConversionOptions>({
    width: 100,
    height: 0,
    charset: CHARACTER_SETS['standard-reverse'],
    invert: false,
    colored: false,
    background: 'black',
    pixelMode: false,
    showCharacters: true
  });

  const handleImageUpload = async (file: File) => {
    // Reset animation state
    setIsAnimated(false);
    setVideoFrames([]);
    setIsPlaying(false);
    
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    await processImage(url);
  };

  const processImage = async (url: string) => {
    setIsProcessing(true);
    try {
      // Load and resize image
      const imageData = await loadAndProcessImage(url, options.width, options.height);
      
      // Convert to ASCII
      const result = convertImageToAscii(imageData, options);
      
      setAsciiResult(result);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionsChange = async (newOptions: Partial<ConversionOptions>) => {
    const updatedOptions = { ...options, ...newOptions };
    setOptions(updatedOptions);
    
    if (isAnimated && videoFrames.length > 0) {
      const currentFrame = videoFrames[currentFrameIndex];
      if (currentFrame) {
        if (updatedOptions.colored || updatedOptions.pixelMode) {
          setAsciiResult({ text: '', html: '', width: currentFrame.width, height: currentFrame.height, imageData: currentFrame });
        } else {
          const result = convertImageToAscii(currentFrame, updatedOptions);
          setAsciiResult(result);
        }
      }
    } else if (imageUrl) {
      // For static images
      setIsProcessing(true);
      try {
        const imageData = await loadAndProcessImage(imageUrl, updatedOptions.width, updatedOptions.height);
        const result = convertImageToAscii(imageData, updatedOptions);
        setAsciiResult(result);
      } catch (error) {
        console.error('Error processing image:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleVideoUpload = async (file: File) => {
    // Reset state
    setIsPlaying(false);
    setCurrentFrameIndex(0);
    
    setIsProcessing(true);
    try {
      // Extract frames from video
      const frames = await extractVideoFrames(file, options.width, options.height, fps);
      setVideoFrames(frames);
      setIsAnimated(true);
      
      // Process the first frame to ASCII
      if (frames.length > 0) {
        if (options.colored || options.pixelMode) {
          setAsciiResult({ text: '', html: '', width: frames[0].width, height: frames[0].height, imageData: frames[0] });
        } else {
          const firstFrameResult = convertImageToAscii(frames[0], options);
          setAsciiResult(firstFrameResult);
        }
      }
    } catch (error) {
      console.error('Error processing video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAnimation = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      lastFrameTimeRef.current = performance.now();
    }
  };

  const stopAnimation = () => {
    setIsPlaying(false);
  };

  const toggleShake = () => {
    setIsJitterOn(prev => !prev);
    if (!isShaking) {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 400);
    }
  };

  // Animation loop effect
  useEffect(() => {
    if (!isPlaying || videoFrames.length === 0) return;

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const timeSinceLastFrame = currentTime - lastFrameTimeRef.current;
      
      if (timeSinceLastFrame >= 1000 / fps) {
        lastFrameTimeRef.current = currentTime;
        setCurrentFrameIndex(prevIndex => (prevIndex + 1) % videoFrames.length);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, fps, videoFrames.length]);

  useEffect(() => {
    if (isAnimated && videoFrames.length > 0 && !isProcessing) {
      const currentFrame = videoFrames[currentFrameIndex];
      if (currentFrame) {
        if (options.colored || options.pixelMode) {
          setAsciiResult({ text: '', html: '', width: currentFrame.width, height: currentFrame.height, imageData: currentFrame });
        } else {
          const result = convertImageToAscii(currentFrame, options);
          setAsciiResult(result);
        }
      }
    }
  }, [currentFrameIndex, isAnimated, options, videoFrames, isProcessing]);

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <header className="border-b border-neutral-200">
          <div className="px-8 py-6">
            <h1 className="text-black">ASCII 艺术生成器</h1>
          </div>
        </header>

        {/* Main Content - Fixed Left/Right Layout */}
        <main className="flex-1 flex">
          {/* Left Sidebar - Fixed Width */}
          <aside className="w-80 border-r border-neutral-200 p-8 space-y-8 overflow-y-auto">
            <ImageUploader 
              onImageUpload={handleImageUpload} 
              onVideoUpload={handleVideoUpload}
              isShaking={isShaking}
              onShakeToggle={toggleShake}
            />
            <ControlPanel 
              options={options}
              onOptionsChange={handleOptionsChange}
              isProcessing={isProcessing}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
            />
          </aside>

          {/* Right Content - Flexible Width */}
          <div className="flex-1 p-8 overflow-y-auto">
          <AsciiOutput 
            result={asciiResult}
            options={options}
            isProcessing={isProcessing}
            isAnimated={isAnimated}
            isPlaying={isPlaying}
            playAnimation={playAnimation}
            stopAnimation={stopAnimation}
            setFps={setFps}
            fontSize={fontSize}
            isJitterOn={isJitterOn}
          />
          </div>
        </main>
      </div>
    </>
  );
}
