import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || ''
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'supabase_not_configured' })
    const raw = typeof req.body === 'string' ? safeJson(req.body) : req.body
    const { email, password } = raw || {}
    if (!email || !password) return res.status(400).json({ error: 'invalid_params' })
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: 'supabase_error', detail: error.message })
    // 返回 access_token 与 refresh_token，前端用 supabase.auth.setSession 设置会话
    const access_token = data.session?.access_token || ''
    const refresh_token = data.session?.refresh_token || ''
    return res.json({ ok: true, access_token, refresh_token })
  } catch (e: any) {
    return res.status(500).json({ error: 'login_failed', detail: e?.message || String(e) })
  }
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return {} } }