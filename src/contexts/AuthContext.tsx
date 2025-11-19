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
  prefillEmail?: string;
  setPrefillEmail: (email?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | undefined>(undefined);

  // Persisted session
  const SESSION_KEY = "dado.auth.session";
  const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  // 临时测试账号（仅用于本地测试）
  const TEST_EMAIL = "dadoshejis@163.com";
  const TEST_PASSWORD = "2434544181";

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const bodyText = await res.text()
      const data = (() => { try { return JSON.parse(bodyText) } catch { return {} } })()
      if (!res.ok) { console.error('login failed', data); setIsLoggedIn(false); return { ok: false, error: data?.detail || '登录失败' } }
      const { access_token, refresh_token } = data
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
      }
      setIsLoggedIn(true)
      setUserEmail(email)
      setShowLoginDialog(false)
      try {
        const now = Date.now()
        const session = { email, createdAt: now, expiresAt: now + SESSION_TTL_MS }
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      } catch {}
      return { ok: true }
    } catch (e) {
      console.error('login exception', e)
      setIsLoggedIn(false)
      return { ok: false, error: '网络错误' }
    }
  };

  const sendMagicLink = async (email: string) => {
    console.log('supabase magic link start', { email });
    // 中文注释：优先通过云端端点发送邮件登录链接；失败时给出错误提示，避免频繁重试触发 429
    try {
      const endpoint = (import.meta.env.VITE_MAGIC_LINK_ENDPOINT as string) || '/api/send-magic-link'
      const REDIRECT_BASE = (import.meta.env.VITE_PUBLIC_ORIGIN as string) || 'https://dadooooo2-0.vercel.app'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: REDIRECT_BASE + '/auth/callback' })
      })
      const bodyText = await res.text()
      console.log('send-magic-link response', { status: res.status, body: bodyText })
      if (res.ok) return
      // 若云端端点返回 429，提示稍后再试；不再回退直连，避免再触发 429
      if (res.status === 429) {
        console.warn('magic link rate-limited; please retry later')
        return
      }
    } catch (e) {
      console.warn('send-magic-link proxy failed', e)
    }
    // 不再直接调用 Supabase，减少触发 429 的概率；前端 UI 已给出提示
  };

  const register = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    console.log('supabase signup start', { email });
    try {
      const REDIRECT_BASE = (import.meta.env.VITE_PUBLIC_ORIGIN as string) || 'https://dadooooo2-0.vercel.app'
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, redirectTo: REDIRECT_BASE + '/auth/callback' })
      })
      const bodyText = await res.text()
      const data = (() => { try { return JSON.parse(bodyText) } catch { return {} } })()
      if (!res.ok) { console.error('supabase signup error', data); return { ok: false, error: data?.detail || '发送失败' } }
      console.log('supabase signup ok', data);
    } catch (e) { console.error('signup exception', e); return { ok: false, error: '网络错误' } }
    try {
      localStorage.setItem('dado.auth.registrationFlow', 'true');
      localStorage.setItem('dado.auth.registrationEmail', email);
    } catch {}
    return { ok: true }
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
    const getStored = () => {
      try {
        const v = localStorage.getItem(SESSION_KEY);
        if (!v) return undefined;
        const s = JSON.parse(v);
        if (s && typeof s.expiresAt === 'number' && s.expiresAt > Date.now() && typeof s.email === 'string') return s;
      } catch {}
      return undefined;
    };
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (email) { setIsLoggedIn(true); setUserEmail(email); }
      else {
        const s = getStored();
        if (s) { setIsLoggedIn(true); setUserEmail(s.email); }
      }
    });
    // 中文注释：监听登录状态变化；用户从邮箱点击链接回来后会触发，随后更新登录态与邮箱
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      if (email) { setIsLoggedIn(true); setUserEmail(email); }
      else {
        const s = getStored();
        if (s) { setIsLoggedIn(true); setUserEmail(s.email); }
        else { setIsLoggedIn(false); setUserEmail(undefined); }
      }
      try {
        const rf = localStorage.getItem('dado.auth.registrationFlow');
        const re = localStorage.getItem('dado.auth.registrationEmail') || undefined;
        if (rf === 'true') {
          localStorage.removeItem('dado.auth.registrationFlow');
          setPrefillEmail(re);
          setShowRegisterDialog(false);
          setShowLoginDialog(true);
          // 如果自动登录了，则退出并返回登录页以便用户使用密码登录
          if (session) {
            supabase.auth.signOut().catch(()=>{});
          }
        }
      } catch {}
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
        register,
        prefillEmail,
        setPrefillEmail
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