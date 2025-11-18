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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(null);
    try {
      const bmp = await createImageBitmap(selectedFile);
      const maxSide = 2048;
      const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const bg = estimateBackgroundColor(img);
      const alpha = computeAlphaMask(img, bg, mode === 'precise');
      if (edgeSmoothing) blurAlpha(alpha, w, h, 2);
      const out = composeRGBA(img, alpha);
      ctx.putImageData(out, 0, 0);
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      });
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (err) {
      setErrorMsg('前端抠图失败，请换更清晰的图片');
    } finally {
      setIsProcessing(false);
    }
  };

  function estimateBackgroundColor(img: ImageData) {
    const { data, width, height } = img;
    let r = 0, g = 0, b = 0, n = 0;
    const step = Math.max(1, Math.floor(Math.min(width, height) / 50));
    for (let x = 0; x < width; x += step) {
      const iTop = (0 * width + x) * 4;
      const iBot = ((height - 1) * width + x) * 4;
      r += data[iTop]; g += data[iTop + 1]; b += data[iTop + 2]; n++;
      r += data[iBot]; g += data[iBot + 1]; b += data[iBot + 2]; n++;
    }
    for (let y = 0; y < height; y += step) {
      const iL = (y * width + 0) * 4;
      const iR = (y * width + (width - 1)) * 4;
      r += data[iL]; g += data[iL + 1]; b += data[iL + 2]; n++;
      r += data[iR]; g += data[iR + 1]; b += data[iR + 2]; n++;
    }
    return [r / n, g / n, b / n];
  }

  function computeAlphaMask(img: ImageData, bg: number[], precise: boolean) {
    const { data, width, height } = img;
    const alpha = new Uint8ClampedArray(width * height);
    const dists: number[] = [];
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
      for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
        const i = (y * width + x) * 4;
        const dr = data[i] - bg[0];
        const dg = data[i + 1] - bg[1];
        const db = data[i + 2] - bg[2];
        dists.push(Math.sqrt(dr * dr + dg * dg + db * db));
      }
    }
    dists.sort((a, b) => a - b);
    const tLow = dists[Math.max(0, Math.floor(dists.length * 0.2))] + 5;
    const tHigh = dists[Math.max(0, Math.floor(dists.length * (precise ? 0.6 : 0.4)))] + 20;
    for (let iPix = 0, p = 0; iPix < width * height; iPix++, p += 4) {
      const dr = data[p] - bg[0];
      const dg = data[p + 1] - bg[1];
      const db = data[p + 2] - bg[2];
      const d = Math.sqrt(dr * dr + dg * dg + db * db);
      let a = 0;
      if (d <= tLow) a = 0;
      else if (d >= tHigh) a = 255;
      else a = Math.round(((d - tLow) / (tHigh - tLow)) * 255);
      alpha[iPix] = a;
    }
    return alpha;
  }

  function blurAlpha(alpha: Uint8ClampedArray, w: number, h: number, r: number) {
    const out = new Uint8ClampedArray(alpha.length);
    const rs = Math.max(1, r);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, c = 0;
        for (let dy = -rs; dy <= rs; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy));
          for (let dx = -rs; dx <= rs; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx));
            s += alpha[yy * w + xx];
            c++;
          }
        }
        out[y * w + x] = Math.round(s / c);
      }
    }
    alpha.set(out);
  }

  function composeRGBA(img: ImageData, alpha: Uint8ClampedArray) {
    const { data, width, height } = img;
    const out = new ImageData(width, height);
    for (let i = 0, p = 0; i < width * height; i++, p += 4) {
      out.data[p] = data[p];
      out.data[p + 1] = data[p + 1];
      out.data[p + 2] = data[p + 2];
      out.data[p + 3] = alpha[i];
    }
    return out;
  }

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
              {errorMsg && (
                <p className="text-red-600 text-center mt-2">{errorMsg}</p>
              )}
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