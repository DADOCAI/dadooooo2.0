import { createClient } from '@supabase/supabase-js'

// 兼容两种前缀：Vite 的 VITE_* 与 Next 的 NEXT_PUBLIC_*
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(String(url || ''), String(key || ''))

export function debugSupabaseEnv() {
  const masked = key ? String(key).slice(0,6) + '...' : ''
  console.log('supabase env', { url, anonKeyStart: masked })
}