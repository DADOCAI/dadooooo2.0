import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, debugSupabaseEnv } from "../lib/supabase";

interface AuthContextType {
  isLoggedIn: boolean;
  userEmail?: string;
  // 传统账号密码登录（保留接口，当前不使用）
  login: (email: string, password: string) => void;
  // 魔法链接登录（只输入邮箱，发送邮件链接）
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => void;
  showLoginDialog: boolean;
  setShowLoginDialog: (show: boolean) => void;
  showRegisterDialog: boolean;
  setShowRegisterDialog: (show: boolean) => void;
  // 注册（保留接口，当前改用魔法链接）
  register: (email: string, password: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  // Persisted session
  const SESSION_KEY = "dado.auth.session";
  const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  // 临时测试账号（仅用于本地测试）
  const TEST_EMAIL = "dadoshejis@163.com";
  const TEST_PASSWORD = "2434544181";

  const login = async (email: string, password: string) => {
    // 保留账号密码登录接口（目前不启用）
    console.log('password login not used, prefer magic link');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { console.error('supabase login error', error); setIsLoggedIn(false); return; }
    console.log('supabase login ok', data);
    setIsLoggedIn(true);
    setUserEmail(email);
    setShowLoginDialog(false);
    try {
      const now = Date.now();
      const session = { email, createdAt: now, expiresAt: now + SESSION_TTL_MS };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
  };

  // 发送魔法链接到用户邮箱
  const sendMagicLink = async (email: string) => {
    console.log('supabase magic link start', { email });
    // 中文注释：优先通过云端端点发送邮件登录链接，其次后端代理，最后直连 Supabase
    try {
      const endpoint = (import.meta.env.VITE_MAGIC_LINK_ENDPOINT as string) || '/api/send-magic-link'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: window.location.origin })
      })
      const bodyText = await res.text()
      console.log('send-magic-link response', { status: res.status, body: bodyText })
      if (res.ok) return
    } catch (e) {
      console.warn('send-magic-link proxy failed, fallback to direct supabase', e)
    }
    // 中文注释：代理失败时，回退为直接调用 Supabase 的魔法链接登录
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) { console.error('supabase magic link error', error); return }
    console.log('supabase magic link ok', data)
  };

  const register = async (email: string, password: string) => {
    // 保留注册接口（当前改用魔法链接登录）
    return sendMagicLink(email);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserEmail(undefined);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  };

  // 恢复会话 + 监听登录状态变化（用户点击邮箱链接返回网站时会触发）
  useEffect(() => {
    debugSupabaseEnv();
    // 中文注释：页面加载时读取当前会话，若已登录则更新顶部显示的用户邮箱
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (email) { setIsLoggedIn(true); setUserEmail(email); }
    });
    // 中文注释：监听登录状态变化；用户从邮箱点击链接回来后会触发，随后更新登录态与邮箱
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      if (email) { setIsLoggedIn(true); setUserEmail(email); }
      else { setIsLoggedIn(false); setUserEmail(undefined); }
    });
    return () => { sub?.subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn,
        userEmail,
        login,
        sendMagicLink,
        logout,
        showLoginDialog,
        setShowLoginDialog,
        showRegisterDialog,
        setShowRegisterDialog,
        register
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}