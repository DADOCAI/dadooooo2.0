import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { bootstrap } from 'global-agent'

const app = express()
app.use(express.json())
app.use(cors())

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000
let SUPABASE_URL = process.env.SUPABASE_URL || ''
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 尝试从项目根的 .env.local 读取 Supabase 配置（本地开发友好）
try {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '../.env.local')
  if ((!SUPABASE_URL || !SUPABASE_KEY) && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      const [k, v] = line.split('=')
      if (!k) continue
      if (k.trim() === 'VITE_SUPABASE_URL' || k.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = v?.trim() || SUPABASE_URL
      if (k.trim() === 'VITE_SUPABASE_ANON_KEY' || k.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') SUPABASE_KEY = v?.trim() || SUPABASE_KEY
    }
  }
} catch {}
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@dadoooo.local'

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
console.log('[server] supabase config', { url: SUPABASE_URL, keyStart: SUPABASE_KEY ? SUPABASE_KEY.slice(0,6)+'...' : '' })
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

const memoryStore = new Map()

function nowMs() { return Date.now() }
function plusMs(ms) { return nowMs() + ms }
function genCode() { return String(Math.floor(100000 + Math.random()*900000)) }
function validEmail(e){ return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(e) }

app.post('/api/auth/send-email-code', async (req,res)=>{
  const { email } = req.body || {}
  if (!validEmail(email)) return res.status(400).json({ error:'invalid_email' })

  const prev = memoryStore.get(email)
  if (prev && prev.lastSent && nowMs() - prev.lastSent < 60000) {
    const remain = Math.ceil((60000 - (nowMs()-prev.lastSent))/1000)
    console.warn('[send-email-code] cooldown', { email, remain })
    return res.status(429).json({ error:'cooldown', remain })
  }

  const code = genCode()
  const expiresAt = plusMs(5*60*1000)
  memoryStore.set(email, { code, expiresAt, used:false, lastSent: nowMs() })

  try {
    if (resend) {
      console.log('[send-email-code] sending via Resend', { email })
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: '验证码',
        html: `<div style="font-family:Arial;padding:16px"><h2>验证码</h2><p>您的验证码为：<b>${code}</b></p><p>5分钟内有效</p></div>`
      })
    } else {
      console.warn('[send-email-code] RESEND_API_KEY not set, email will NOT be sent')
      console.log('[send-email-code] simulate code', { email, code })
    }
    if (supabase) {
      const { error } = await supabase.from('email_codes').insert({ email, code, expires_at: new Date(expiresAt).toISOString(), used:false })
      if (error) console.error('[send-email-code] supabase insert error', error)
    }
    res.json({ ok:true })
  } catch (e) {
    console.error('[send-email-code] send_failed', e)
    res.status(500).json({ error:'send_failed', detail: String(e && e.message || e) })
  }
})

app.post('/api/auth/verify-email-code', async (req,res)=>{
  const { email, code } = req.body || {}
  if (!validEmail(email)) return res.status(400).json({ error:'invalid_email' })
  if (!code || String(code).length !== 6) return res.status(400).json({ error:'invalid_code' })

  const rec = memoryStore.get(email)
  if (!rec || rec.used || rec.code !== String(code) || nowMs() > rec.expiresAt) {
    console.warn('[verify-email-code] failed', { email })
    return res.status(400).json({ error:'verify_failed' })
  }
  rec.used = true
  memoryStore.set(email, rec)

  try {
    if (supabase) {
      const { error:upErr } = await supabase.from('email_codes').update({ used:true }).eq('email', email).eq('code', String(code))
      if (upErr) console.error('[verify-email-code] supabase update error', upErr)
      const { error:profErr } = await supabase.from('profiles').update({ email_verified:true }).eq('email', email)
      if (profErr) console.error('[verify-email-code] profiles update error', profErr)
    }
  } catch {}

  res.json({ success:true })
})

app.get('/api/health', (req,res)=>{ res.json({ ok:true }) })

// 通过服务端发送 Supabase 魔法链接，避免浏览器网络被拦截
app.post('/api/auth/send-magic-link', async (req, res) => {
  const { email, redirectTo } = req.body || {}
  if (!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) return res.status(400).json({ error: 'invalid_email' })
  if (!supabase) return res.status(500).json({ error: 'supabase_not_configured' })
  try {
    console.log('[magic-link] start', { email, redirectTo })
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo || `http://localhost:${PORT === 8000 ? 3000 : 3000}` }
    })
    if (error) {
      console.error('[magic-link] error', error)
      return res.status(500).json({ error: 'supabase_error', detail: error.message })
    }
    console.log('[magic-link] ok', data)
    res.json({ ok: true })
  } catch (e) {
    console.error('[magic-link] failed', e)
    res.status(500).json({ error: 'send_failed', detail: String(e && e.message || e) })
  }
})

app.listen(PORT, ()=>{ console.log('server', PORT) })
// 如果存在 HTTPS_PROXY/HTTP_PROXY，则启用全局代理，帮助本机网络直连 Supabase
try {
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
    bootstrap()
    console.log('[server] global-agent enabled with proxy', process.env.GLOBAL_AGENT_HTTP_PROXY)
  }
} catch {}