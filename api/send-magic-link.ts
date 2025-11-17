import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || ''
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'supabase_not_configured' })
    }
    // 兼容 x-www-form-urlencoded / 原始文本
    const raw = typeof req.body === 'string' ? safeJson(req.body) : req.body
    const { email, redirectTo } = raw || {}
    if (!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) {
      return res.status(400).json({ error: 'invalid_email' })
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo || 'http://localhost:3000' }
    })
    if (error) return res.status(429).json({ error: 'supabase_error', detail: error.message })
    return res.json({ ok: true, data })
  } catch (e: any) {
    return res.status(500).json({ error: 'send_failed', detail: e?.message || String(e) })
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s) } catch { return {} }
}