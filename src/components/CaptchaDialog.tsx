import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface CaptchaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

// 新增：注册防机器人逻辑 — 图片验证码
export function CaptchaDialog({ open, onOpenChange, onVerified }: CaptchaDialogProps) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const captchaText = useMemo(() => generateCaptchaText(), [open]);

  useEffect(() => {
    if (!open) return;
    setInput("");
    setMessage("");
    drawCaptcha(canvasRef.current, captchaText);
  }, [open, captchaText]);

  const handleRefresh = () => {
    setInput("");
    setMessage("");
    drawCaptcha(canvasRef.current, generateCaptchaText(true));
  };

  const handleConfirm = () => {
    const a = (input || "").trim().toLowerCase();
    const b = (currentCaptchaValue(canvasRef.current) || captchaText).trim().toLowerCase();
    if (a && a === b) {
      onOpenChange(false);
      onVerified();
    } else {
      setMessage("验证码错误，请重试");
      handleRefresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] bg-white border border-blue-500 rounded-none shadow-none">
        <DialogTitle className="text-black">安全验证</DialogTitle>
        <DialogDescription className="text-gray-500">请输入下方图片中的字符</DialogDescription>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <canvas ref={canvasRef} width={180} height={60} className="border border-blue-500" />
            <Button type="button" variant="outline" className="rounded-none border-blue-500 text-blue-500" onClick={handleRefresh}>
              刷新验证码
            </Button>
          </div>
          <Input
            placeholder="输入验证码"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border-blue-500 rounded-none focus-visible:ring-blue-500 bg-white"
          />
          <Button type="button" className="w-full bg-white border border-blue-500 text-blue-500 py-2 rounded-none" onClick={handleConfirm}>
            确认
          </Button>
          {message && <p className="text-center text-red-500 text-sm">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generateCaptchaText(forceNew?: boolean) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = 4 + Math.floor(Math.random() * 3);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  // 存在 canvasRef 时，绘制时会覆盖当前值，这里返回字符串用于首次绘制
  return out + (forceNew ? "" : "");
}

function drawCaptcha(canvas: HTMLCanvasElement | null, text: string) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  // 背景
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  // 噪点
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = randColor(160, 220);
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // 干扰线
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = randColor(100, 180);
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }
  // 文本
  const fontSize = 28;
  const xStart = 15;
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    const ch = text[i];
    const angle = (Math.random() - 0.5) * 0.6; // -0.3 ~ 0.3 弧度
    ctx.translate(xStart + i * (w - xStart * 2) / text.length, h / 2);
    ctx.rotate(angle);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = randColor(40, 120);
    ctx.textBaseline = "middle";
    ctx.fillText(ch, -8, 0);
    ctx.restore();
  }
  // 将当前正确值缓存到 DOM 上，便于确认时读取
  try { (canvas as any).__captchaText = text; } catch {}
}

function currentCaptchaValue(canvas: HTMLCanvasElement | null): string | undefined {
  try { return (canvas as any)?.__captchaText; } catch { return undefined; }
}

function randColor(min: number, max: number) {
  const r = Math.floor(min + Math.random() * (max - min));
  const g = Math.floor(min + Math.random() * (max - min));
  const b = Math.floor(min + Math.random() * (max - min));
  return `rgb(${r},${g},${b})`;
}

