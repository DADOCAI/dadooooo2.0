import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import logo from 'figma:asset/e5c375aeb9d5459e76d1f4b4579b4d2ffbb0055e.png';

export function RegisterDialog() {
  const { showRegisterDialog, setShowRegisterDialog, register, setShowLoginDialog, setPrefillEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  // 改为“邮箱 + 魔法链接登录”，不再使用 6 位验证码

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (password !== confirmPassword) { setMessage("两次密码不一致"); return; }
    await register(email, password);
    try { setPrefillEmail(email); } catch {}
    setMessage("验证链接已发送，请到邮箱点击链接完成注册");
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
      </DialogContent>
    </Dialog>
  );
}