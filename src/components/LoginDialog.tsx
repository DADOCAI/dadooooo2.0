import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import logo from 'figma:asset/e5c375aeb9d5459e76d1f4b4579b4d2ffbb0055e.png';

export function LoginDialog() {
  const { showLoginDialog, setShowLoginDialog, sendMagicLink, setShowRegisterDialog } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // 中文注释：点击“发送登录链接”后，调用 Supabase 魔法链接登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    await sendMagicLink(email);
    setMessage("登录链接已发送，请到邮箱点击链接完成登录");
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

            {/* 这里不再使用密码，保留结构方便以后扩展（不显示） */}

            {/* 登录按钮：发送魔法链接到邮箱 */}
            <button
              type="submit"
              className="w-full bg-white border border-blue-500 text-blue-500 py-3 hover:bg-blue-50 transition-colors flex items-center justify-center"
              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
            >
              发送登录链接
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