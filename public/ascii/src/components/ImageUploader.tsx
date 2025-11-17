import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  onVideoUpload?: (file: File) => void;
  isShaking?: boolean;
  onShakeToggle?: () => void;
}

export function ImageUploader({ onImageUpload, onVideoUpload, isShaking, onShakeToggle }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [bubbleImgOk, setBubbleImgOk] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setIsUploading(true);
      const url = URL.createObjectURL(file);
      
      // Simulate upload with animation delay
      setTimeout(() => {
        setPreview(url);
        setIsUploading(false);
        setShowTip(true);
        onImageUpload(file);
      }, 800);
    } else if (file.type.startsWith('video/')) {
      setIsUploading(true);
      
      // Generate video thumbnail for preview
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        video.currentTime = 0.1; // Capture frame at 0.1s
      };
      
      video.onseeked = () => {
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          const thumbnailUrl = canvas.toDataURL('image/jpeg');
          
          setTimeout(() => {
            setPreview(thumbnailUrl);
            setIsUploading(false);
            setShowTip(true);
            onVideoUpload?.(file);
            URL.revokeObjectURL(video.src);
          }, 800);
        }
      };
      
      video.onerror = () => {
        console.error('Failed to load video for preview');
        setIsUploading(false);
        URL.revokeObjectURL(video.src);
      };
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={handleChange}
      />

      <div
        className={`relative w-full aspect-square max-w-[280px] mx-auto transition-all cursor-pointer ${
          dragActive ? 'scale-105' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => { setShowTip(false); onShakeToggle?.(); }}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, rotate: { duration: 0.8, ease: "linear" } }}
              className="absolute inset-0"
            >
              {/* CD Disc Container - Spinning */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 p-3 shadow-lg">
                {/* Rainbow reflection effect */}
                <div className="absolute inset-0 rounded-full opacity-40 bg-gradient-conic from-pink-500 via-purple-500 via-blue-500 via-cyan-500 via-green-500 via-yellow-500 via-orange-500 to-pink-500 mix-blend-overlay"></div>
                
                {/* Empty disc */}
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-inner bg-neutral-100"></div>
                
                {/* Center hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200 shadow-xl border-4 border-white">
                  <div className="absolute inset-2 rounded-full bg-white shadow-inner"></div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loaded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isShaking ? {
                opacity: 1,
                scale: 1,
                rotate: [0, -5, 5, -5, 5, -3, 3, -1, 1, 0],
                x: [0, -3, 3, -3, 3, -2, 2, -1, 1, 0],
                y: [0, -2, 2, -2, 2, -1, 1, 0, 0, 0]
              } : {
                opacity: 1,
                scale: 1
              }}
              transition={isShaking ? {
                duration: 0.5,
                ease: "easeInOut"
              } : {
                duration: 0.3
              }}
              className="absolute inset-0"
            >
              {/* CD Disc Container */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 p-3 shadow-lg">
                {/* Rainbow reflection effect */}
                <div className="absolute inset-0 rounded-full opacity-40 bg-gradient-conic from-pink-500 via-purple-500 via-blue-500 via-cyan-500 via-green-500 via-yellow-500 via-orange-500 to-pink-500 mix-blend-overlay"></div>
                
                {/* Image preview or placeholder */}
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-inner bg-neutral-100">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute top-[25%] left-0 right-0 flex justify-center">
                      <div className="text-neutral-400 text-xs">拖拽图片或视频到这里</div>
                    </div>
                  )}
                </div>
                
                {/* Center hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200 shadow-xl border-4 border-white pointer-events-none">
                  <div className="absolute inset-2 rounded-full bg-white shadow-inner"></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {preview && !isUploading && showTip && (
            <motion.div
              key="bubble"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute -top-3 -right-3 pointer-events-none"
            >
              {bubbleImgOk ? (
                <img
                  src="/ascii/assets/bubble.png"
                  alt="试一下点击下光碟"
                  className="w-[240px] h-auto"
                  onError={() => setBubbleImgOk(false)}
                />
              ) : (
                <div className="relative bg-white text-black border-2 border-black rounded-sm shadow-[6px_6px_0_#00000020] px-4 py-2 text-sm whitespace-nowrap">
                  试一下点击下光碟
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l-2 border-t-2 border-black rotate-45"></div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Upload/Change Button - always show below the disc */}
      <Button
        onClick={handleClick}
        disabled={isUploading}
        className="w-full mt-4 bg-white hover:bg-neutral-50 text-black border border-neutral-200 rounded-none shadow-sm disabled:opacity-50"
        size="default"
      >
        <Upload className="w-4 h-4 mr-2" />
        {preview ? '更换图片或视频' : '点击上传'}
      </Button>
    </div>
  );
}
