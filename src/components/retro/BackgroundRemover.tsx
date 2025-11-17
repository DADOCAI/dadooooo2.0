import { useState, useRef } from 'react';
import { RetroWindow } from './RetroWindow';
import { RetroButton } from './RetroButton';
import { Upload, Download, Image as ImageIcon, Sparkles, Zap } from 'lucide-react@0.487.0';

type ProcessMode = 'precise' | 'fast';

export function BackgroundRemover() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<ProcessMode>('precise');
  const [edgeSmoothing, setEdgeSmoothing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setSelectedImage(evt.target?.result as string);
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', mode === 'precise' ? 'precise' : 'fast');
      formData.append('edge_smoothing', edgeSmoothing ? 'true' : 'false');

      const res = await fetch('/api/cutout', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error('处理失败');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const a = document.createElement('a');
    a.href = processedImage;
    a.download = 'removed-background.png';
    a.click();
  };

  return (
    <RetroWindow title="抠图智能化工具">
      <div className="p-6 space-y-6">
        {/* Mode Selection */}
        <div className="flex gap-4 items-center justify-center">
          <button
            onClick={() => setMode('precise')}
            className={`px-6 py-3 border-2 transition-all ${
              mode === 'precise'
                ? 'border-black bg-black text-white'
                : 'border-black bg-white text-black hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>精确模式</span>
            </div>
          </button>
          <button
            onClick={() => setMode('fast')}
            className={`px-6 py-3 border-2 transition-all ${
              mode === 'fast'
                ? 'border-black bg-black text-white'
                : 'border-black bg-white text-black hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>快速模式</span>
            </div>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6 cutout-flex">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-black p-6 bg-white flex-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="sr-only"
            />
            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-16 h-16 mb-4" />
                <p className="text-center mb-2">点击上传图片</p>
                <p className="text-sm text-gray-600 text-center">
                  支持 JPG, PNG 格式<br />
                  最大 3MB，建议分辨率 3000px
                </p>
              </div>
            ) : (
              <div className="relative aspect-square">
                <img src={selectedImage} alt="Original" className="w-full h-full object-contain" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2 right-2 px-3 py-1 bg-white border-2 border-black hover:bg-gray-100"
                >
                  更换
                </button>
              </div>
            )}
          </div>

          {/* Result Area */}
          <div className="border-2 border-black p-6 bg-white flex-1 min-w-0">
            <div className="relative aspect-square">
              {/* 仅在有处理结果时显示棋盘格背景；默认白底 */}
              {processedImage && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #ccc 25%, transparent 25%),
                      linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%),
                      linear-gradient(-45deg, transparent 75%, #ccc 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                />
              )}

              {processedImage ? (
                <img src={processedImage} alt="Processed" className="relative w-full h-full object-contain" />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <ImageIcon className="w-16 h-16 mb-4 text-gray-400" />
                  <p className="text-gray-500 text-center">
                    {isProcessing ? '处理中...' : (selectedImage ? '等待处理...' : '处理结果将显示在这里')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between border-2 border-black p-4 bg-white">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={edgeSmoothing}
              onChange={(e) => setEdgeSmoothing(e.target.checked)}
              className="w-5 h-5 border-2 border-black"
            />
            <span>边缘修正（提高边缘/毛发清晰度）</span>
          </label>
          <div className="text-sm text-gray-600">
            {mode === 'precise' ? '精确模式：更高质量，处理时间较长' : '快速模式：快速处理，适合预览'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <RetroButton onClick={handleProcess} disabled={!selectedImage || isProcessing} className="px-8 py-3 text-lg">
            {isProcessing ? '处理中...' : '开始抠图'}
          </RetroButton>
          {processedImage && (
            <RetroButton onClick={handleDownload} className="px-8 py-3 text-lg">
              <Download className="w-5 h-5 inline mr-2" />
              下载结果
            </RetroButton>
          )}
        </div>

        {/* Info Box */}
        <div className="border-2 border-black p-4 bg-yellow-50">
          <p className="text-sm">
            <strong>提示：</strong>
            {mode === 'precise'
              ? '精确模式适用于人像、产品图等需要高质量抠图的场景'
              : '快速模式适用于预览效果，处理速度更快但质量略低'}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4 border-t-2 border-black">
          © 2025 CPU 未满载 · 所有权归您我的连带非垄断
        </div>
      </div>
    </RetroWindow>
  );
}