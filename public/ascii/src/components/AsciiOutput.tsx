import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Copy, Download, Loader2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { 
  AsciiArtResult, 
  ConversionOptions,
  copyToClipboard,
  downloadAsText,
  downloadAsHtml,
  downloadAsJpg,
  renderToCanvas,
  renderFrameToCanvas
} from '../utils/imageToAscii';

interface AsciiOutputProps {
  result: AsciiArtResult | null;
  options: ConversionOptions;
  isProcessing?: boolean;
  isAnimated?: boolean;
  isPlaying?: boolean;
  playAnimation?: () => void;
  stopAnimation?: () => void;
  setFps?: (fps: number) => void;
  fontSize?: number;
  isShaking?: boolean;
  toggleShake?: () => void;
  isJitterOn?: boolean;
}

export function AsciiOutput({ 
  result, 
  options, 
  isProcessing,
  isAnimated = false,
  isPlaying = false,
  playAnimation,
  stopAnimation,
  setFps,
  fontSize = 10,
  isShaking = false,
  isJitterOn = false
}: AsciiOutputProps) {
  const [copied, setCopied] = useState(false);
  const baseTextRef = useRef<string>('');
  const [animatedText, setAnimatedText] = useState<string>('');
  const baseHtmlRef = useRef<string>('');
  const [animatedHtml, setAnimatedHtml] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Reset base text when result changes
    if (result?.text) {
      baseTextRef.current = result.text;
      if (!isJitterOn) {
        setAnimatedText('');
      }
    }
  }, [result?.text, isJitterOn]);

  useEffect(() => {
    if (result?.html) {
      baseHtmlRef.current = result.html;
      if (!isJitterOn) {
        setAnimatedHtml('');
      }
    }
  }, [result?.html, isJitterOn]);

  const charset = useMemo(() => options.charset || ' .:-=+*#%@', [options.charset]);

  useEffect(() => {
    if (!isJitterOn) {
      setAnimatedText('');
      setAnimatedHtml('');
      return;
    }

    if (options.colored || options.pixelMode) {
      const tickHtml = () => {
        const src = baseHtmlRef.current;
        if (!src) return;
        const prob = 0.015;
        const jittered = src.replace(/>([^<\n])</g, (m, c) => {
          if (Math.random() < prob) {
            const randChar = charset[Math.floor(Math.random() * charset.length)] || c;
            return `>${randChar}<`;
          }
          return m;
        });
        setAnimatedHtml(jittered);
      };
      const i = setInterval(tickHtml, 80);
      return () => clearInterval(i);
    } else {
      const tickText = () => {
        const src = baseTextRef.current;
        if (!src) return;
        const chars = src.split('');
        const total = chars.length;
        const changes = Math.max(1, Math.floor(total * 0.015));
        for (let i = 0; i < changes; i++) {
          const idx = Math.floor(Math.random() * total);
          const c = chars[idx];
          if (c === '\n') continue;
          const randChar = charset[Math.floor(Math.random() * charset.length)] || c;
          chars[idx] = randChar;
        }
        setAnimatedText(chars.join(''));
      };
      const i = setInterval(tickText, 80);
      return () => clearInterval(i);
    }
  }, [isJitterOn, options.colored, options.pixelMode, charset]);

  useEffect(() => {
    if (!result) return;
    if (!(options.colored || options.pixelMode)) return;
    if (!isAnimated) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderFrameToCanvas(result.imageData, options, fontSize, canvas);
  }, [result, options, fontSize, isAnimated]);

  const handleCopy = async () => {
    if (!result) return;
    
    try {
      await copyToClipboard(result.text);
      setCopied(true);
      toast.success('已复制到剪贴板！');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败，请重试');
    }
  };

  const handleDownloadText = () => {
    if (!result) return;
    
    try {
      downloadAsText(result.text, `ascii-art-${Date.now()}.txt`);
      toast.success('TXT文件已下载！');
    } catch (err) {
      toast.error('下载失败，请重试');
    }
  };

  const handleDownloadHtml = () => {
    if (!result) return;
    
    try {
      const content = options.colored ? result.html : result.text;
      downloadAsHtml(content, `ascii-art-${Date.now()}.html`);
      toast.success('HTML文件已下载！');
    } catch (err) {
      toast.error('下载失败，请重试');
    }
  };

  const handleDownloadJpg = async () => {
    if (!result) return;
    
    try {
      await downloadAsJpg(result, options, fontSize, `ascii-art-${Date.now()}.jpg`);
      toast.success('JPG文件已下载！');
    } catch (err) {
      toast.error('下载失败，请重试');
    }
  };

  return (
    <div>
      {result && !isProcessing && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {/* Play/Pause controls for animated content */}
          {isAnimated && (
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? stopAnimation : playAnimation}
              className="bg-white border-neutral-300 hover:bg-neutral-50 text-black"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  播放
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="bg-white border-neutral-300 hover:bg-neutral-50 text-black"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadText}
            className="bg-white border-neutral-300 hover:bg-neutral-50 text-black"
          >
            TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadHtml}
            className="bg-white border-neutral-300 hover:bg-neutral-50 text-black"
          >
            HTML
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJpg}
            className="bg-white border-neutral-300 hover:bg-neutral-50 text-black"
          >
            JPG
          </Button>
        </div>
      )}

      <div 
        className="border border-neutral-300 rounded min-h-[600px] overflow-hidden flex items-center justify-center"
        style={{ 
          backgroundColor: (options.colored || options.pixelMode) && options.background === 'white' ? '#ffffff' : '#000000'
        }}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center min-h-[550px] text-neutral-400">
            <Loader2 className="w-8 h-8 mb-3 animate-spin" />
            <p className="text-sm">转换中...</p>
          </div>
        ) : result ? (
          <div className="p-6 inline-block">
            {(options.colored || options.pixelMode) && isAnimated ? (
              <canvas ref={canvasRef} />
            ) : (options.colored || options.pixelMode) ? (
              <pre 
                className="whitespace-pre font-mono"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '1',
                  letterSpacing: '0',
                }}
                dangerouslySetInnerHTML={{ __html: animatedHtml || result.html }}
              />
            ) : (
              <pre 
                className="whitespace-pre font-mono text-neutral-300"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '1',
                  letterSpacing: '0',
                }}
              >
                {animatedText || result.text}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[550px] text-neutral-400">
            <p className="text-sm">上传图片开始转换</p>
          </div>
        )}
      </div>
    </div>
  );
}
