import { useState, useRef, useEffect } from 'react';
import { RetroWindow } from './RetroWindow';
import { RetroButton } from './RetroButton';
import { Upload, Download, Image as ImageIcon, Sparkles, Zap } from 'lucide-react@0.487.0';
import LocalModelInitDialog from '../common/LocalModelInitDialog';
import { ensureWorkerReady, runMattingInWorker, runFastPreviewInWorker, getLastReadyModel, resetMattingWorker } from '../../lib/mattingWorkerClient';

type ProcessMode = 'precise' | 'fast';

export function BackgroundRemover() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<ProcessMode>('precise');
  const [edgeSmoothing, setEdgeSmoothing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [onnxSession, setOnnxSession] = useState<any | null>(null);
  const [dlgVisible, setDlgVisible] = useState(false);
  const [dlgStage, setDlgStage] = useState<string | undefined>(undefined);
  const [dlgProgress, setDlgProgress] = useState<number | undefined>(undefined);
  const [dlgError, setDlgError] = useState<string | undefined>(undefined);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setDlgVisible(true)
        setDlgStage('downloading')
        setDlgProgress(undefined)
        setDlgError(undefined)
        await ensureModelLoaded((s, p, e) => {
          if (!alive) return
          setDlgStage(s); setDlgProgress(p); setDlgError(e)
        })
        if (!alive) return
        setDlgVisible(false)
      } catch (e) {
        if (!alive) return
        setDlgVisible(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      resetMattingWorker();
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setSelectedImage(evt.target?.result as string);
        setProcessedImage(null);
        setStatusMsg(null);
        setErrorMsg(null);
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
      const maxSide = 1536;
      const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      let preciseReady = true;
      try {
        setModelLoading(true);
        await ensureWorkerReady((s, p, e) => { setDlgStage(s); setDlgProgress(p); setDlgError(e); setDlgVisible(s !== 'ready' && s !== 'error'); });
        setDlgVisible(false);
        const outId = await runMattingInWorker(img);
        setModelLoading(false);
        const m = getLastReadyModel();
        setStatusMsg(m ? `已使用 ${m.toUpperCase()} 模型进行精确抠图` : '已使用本地模型进行精确抠图');
        const blob: Blob = await new Promise((resolve, reject) => {
          const c2 = document.createElement('canvas');
          c2.width = outId.width; c2.height = outId.height;
          c2.getContext('2d')!.putImageData(outId, 0, 0);
          c2.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
        });
        const url2 = URL.createObjectURL(blob);
        setProcessedImage(url2);
      } catch (errPrecise) {
        preciseReady = false;
        setModelLoading(false);
      }
      if (!preciseReady) {
        try {
          const outFast = await runFastPreviewInWorker(img);
          const blob: Blob = await new Promise((resolve, reject) => {
            const c3 = document.createElement('canvas');
            c3.width = outFast.width; c3.height = outFast.height;
            c3.getContext('2d')!.putImageData(outFast, 0, 0);
            c3.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
          });
          const url3 = URL.createObjectURL(blob);
          setProcessedImage(url3);
          setStatusMsg('已先生成快速预览，模型正在后台加载后将自动升级');
          // try to load and upgrade when ready
          try {
            await ensureWorkerReady((s, p, e) => { setDlgStage(s); setDlgProgress(p); setDlgError(e); });
            const outId2 = await runMattingInWorker(img);
            const blob2: Blob = await new Promise((resolve, reject) => {
              const c4 = document.createElement('canvas');
              c4.width = outId2.width; c4.height = outId2.height;
              c4.getContext('2d')!.putImageData(outId2, 0, 0);
              c4.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
            });
            const url4 = URL.createObjectURL(blob2);
            setProcessedImage(url4);
            setStatusMsg('已升级为精确抠图结果');
          } catch {}
        } catch {
          setErrorMsg('设备不支持本地精确抠图，请使用快速模式');
        }
      }
    } catch (err) {
      setDlgVisible(false);
      try {
        const bmp = await createImageBitmap(selectedFile);
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0, w, h);
        const img2 = ctx.getImageData(0, 0, w, h);
        const outFast = await runFastPreviewInWorker(img2);
        const blob: Blob = await new Promise((resolve, reject) => {
          const c3 = document.createElement('canvas');
          c3.width = outFast.width; c3.height = outFast.height;
          c3.getContext('2d')!.putImageData(outFast, 0, 0);
          c3.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
        });
        const url3 = URL.createObjectURL(blob);
        setProcessedImage(url3);
        setStatusMsg('您的设备暂不支持本地抠图，已为您自动切换到快速模式');
      } catch {
        setErrorMsg('设备不支持本地精确抠图，请使用快速模式');
      }
    } finally {
      setIsProcessing(false);
      setModelLoading(false);
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
            <LocalModelInitDialog visible={dlgVisible} stage={dlgStage} progress={dlgProgress} errorMessage={dlgError} />
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
              {statusMsg && (
                <p className="text-gray-600 text-center mt-2">{statusMsg}</p>
              )}
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
            {isProcessing ? '处理中...' : (modelLoading && !processedImage ? '正在加载模型，首次可能需要10-30秒' : '开始抠图')}
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
