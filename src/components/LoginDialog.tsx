import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import logo from 'figma:asset/e5c375aeb9d5459e76d1f4b4579b4d2ffbb0055e.png';

export function LoginDialog() {
  const { showLoginDialog, setShowLoginDialog, login, setShowRegisterDialog, prefillEmail, setPrefillEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { if (prefillEmail) { setEmail(prefillEmail); setPrefillEmail(undefined); } }, [prefillEmail, setPrefillEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const r = await login(email, password);
    if (r.ok) { setMessage("登录成功"); return; }
    const raw = (r.error || "").toLowerCase();
    let zh = "登录失败";
    if (raw.includes("invalid") && raw.includes("password")) zh = "密码错误";
    else if (raw.includes("not found") || raw.includes("no user") || raw.includes("user not")) zh = "此账号未注册";
    else if (raw.includes("email not confirmed") || raw.includes("confirm")) zh = "邮箱未验证，请先完成邮箱验证";
    else if (raw.includes("rate") && raw.includes("limit")) zh = "请求过于频繁，请稍后再试";
    else if (raw.includes("network")) zh = "网络错误，请稍后重试";
    setMessage(zh);
  };

  return (
    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent 
        className="sm:max-w-[425px] bg-white border border-blue-500 rounded-none shadow-none p-0"
        style={{
          outline: 'none',
        }}
      >
        <div className="p-8">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <DialogTitle className="sr-only">登录</DialogTitle>
            <DialogDescription className="sr-only">登录以使用工具</DialogDescription>
            <div className="ml-2">
              <img 
                src={logo}
                alt="dado logo"
                className="h-14 object-contain"
              />
            </div>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black">
                邮箱
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-blue-500 rounded-none focus-visible:ring-blue-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-black">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-blue-500 rounded-none focus-visible:ring-blue-500 bg-white"
              />
            </div>

            {/* 登录按钮：账号密码登录 */}
            <button
              type="submit"
              className={`w-full bg-white border border-blue-500 text-blue-500 py-3 hover:bg-blue-50 transition-colors flex items-center justify-center`}
              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
            >
              登录
            </button>

            {/* 发送后的提示文案 */}
            {message && (
              <p className="text-center text-gray-500 text-sm mt-2">{message}</p>
            )}

            {/* 注册提示 */}
            <p className="text-center text-gray-500 text-sm mt-4">
              还没有账号？{" "}
              <button
                type="button"
                className="text-blue-500 hover:underline"
                onClick={() => {
                  setShowRegisterDialog(true);
                }}
              >
                立即注册
              </button>
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}