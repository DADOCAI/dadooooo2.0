import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import logo from 'figma:asset/e5c375aeb9d5459e76d1f4b4579b4d2ffbb0055e.png';
import { CaptchaDialog } from "./CaptchaDialog";
import { canRegisterToday, incrementRegisterSuccess } from "../lib/registerLimit";

export function RegisterDialog() {
  const { showRegisterDialog, setShowRegisterDialog, register, setShowLoginDialog, setPrefillEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  // 改为“邮箱 + 魔法链接登录”，不再使用 6 位验证码
  // 新增：注册防机器人逻辑 — 前置态
  const [honeypot, setHoneypot] = useState("");
  const formRenderTimeRef = useRef<number>(Date.now());
  const [showCaptcha, setShowCaptcha] = useState(false);

  // 新增：注册防机器人逻辑 — 验证码通过后执行真实注册
  const onCaptchaVerified = async () => {
    const r = await register(email, password);
    try { setPrefillEmail(email); } catch {}
    if (r.ok) {
      setMessage("验证链接已发送，请到邮箱点击链接完成注册");
      try { incrementRegisterSuccess(); } catch {}
      return;
    }
    const raw = (r.error || "").toLowerCase();
    let zh = "发送失败";
    if (raw.includes("exist") || raw.includes("already") || raw.includes("duplicate") || raw.includes("registered")) {
      zh = "该邮箱已注册，无需重复注册";
    } else if (raw.includes("rate") && raw.includes("limit")) {
      zh = "请求过于频繁，请稍后再试";
    } else if (raw.includes("network")) {
      zh = "网络错误，请稍后重试";
    }
    setMessage(zh);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    // 新增：注册防机器人逻辑 — 蜜罐字段
    if ((honeypot || "").trim() !== "") {
      console.log('Blocked by honeypot');
      setMessage("请求异常，请稍后再试");
      return;
    }
    // 新增：注册防机器人逻辑 — 简单时间防护（默认阈值 5 秒）
    const dt = Date.now() - (formRenderTimeRef.current || Date.now());
    if (dt < 5000) { setMessage("操作过快，请稍后再试"); return; }
    if (password !== confirmPassword) { setMessage("两次密码不一致"); return; }
    // 新增：注册防机器人逻辑 — 前端限流（每日≤3次）
    if (!canRegisterToday()) {
      setMessage("今天注册次数已达上限，请明天再试。如果有疑问请联系客服。");
      return;
    }
    // 新增：注册防机器人逻辑 — 打开验证码弹窗；验证通过后才调用原注册
    setShowCaptcha(true);
  };

  return (
    <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
      <DialogContent 
        className="sm:max-w-[425px] bg-white border border-blue-500 rounded-none shadow-none p-0"
        style={{
          outline: 'none',
        }}
      >
        <div className="p-8">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <DialogTitle className="sr-only">注册</DialogTitle>
            <DialogDescription className="sr-only">创建新账号</DialogDescription>
            <div className="ml-2">
              <img 
                src={logo}
                alt="dado logo"
                className="h-14 object-contain"
              />
            </div>
          </div>

          {/* 注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 新增：注册防机器人逻辑 — 蜜罐隐藏字段 */}
            <div style={{ position: 'absolute', left: -9999, opacity: 0, width: 0, height: 0 }} aria-hidden tabIndex={-1}>
              <Label htmlFor="nickname-hidden" className="sr-only">昵称</Label>
              <Input
                id="nickname-hidden"
                name="nickname_hidden"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-black">
                邮箱
              </Label>
              <Input
                id="register-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-blue-500 rounded-none focus-visible:ring-blue-500 bg-white"
              />
              {/* 删除 6 位验证码输入区域，改为直接发送魔法链接 */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-black">
                密码
              </Label>
              <Input
                id="register-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-blue-500 rounded-none focus-visible:ring-blue-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-black">
                确认密码
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-blue-500 rounded-none focus-visible:ring-blue-500 bg-white"
              />
            </div>

            {/* 发送验证链接 */}
            <button
              type="submit"
              className={`w-full bg-white border border-blue-500 text-blue-500 py-3 hover:bg-blue-50 transition-colors flex items-center justify-center`}
              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
            >
              发送验证链接
            </button>

            {message && (
              <p className="text-center text-gray-500 text-sm mt-2">{message}</p>
            )}

            {/* 登录提示 */}
            <p className="text-center text-gray-500 text-sm mt-4">
              已有账号？{" "}
              <button
                type="button"
                className="text-blue-500 hover:underline"
                onClick={() => {
                  setShowRegisterDialog(false);
                  // 打开登录对话框
                  setTimeout(() => {
                    setShowLoginDialog(true);
                  }, 100);
                }}
              >
                立即登录
              </button>
            </p>
          </form>
        </div>
        {/* 新增：注册防机器人逻辑 — 图片验证码弹窗 */}
        <CaptchaDialog open={showCaptcha} onOpenChange={setShowCaptcha} onVerified={onCaptchaVerified} />
      </DialogContent>
    </Dialog>
  );
}
