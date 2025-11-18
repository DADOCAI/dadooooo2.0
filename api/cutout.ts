export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  try {
    const API_KEY = (process.env.REMBG_API_KEY as string) || ''
    if (!API_KEY) return new Response(JSON.stringify({ error: 'rembg_not_configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) || 'precise'
    const edge = (formData.get('edge_smoothing') as string) || 'false'
    if (!file) return new Response(JSON.stringify({ error: 'file_missing' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const buf = await file.arrayBuffer()
    const blob = new Blob([buf], { type: file.type || 'image/png' })
    const outForm = new FormData()
    outForm.append('image', blob, (file as any).name || 'upload.png')
    outForm.append('format', 'png')

    const resp = await fetch('https://api.rembg.com/rmbg', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Accept': 'image/png' },
      body: outForm
    })
    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: 'upstream_error', detail: text }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    const ab = await resp.arrayBuffer()
    return new Response(ab, { status: 200, headers: { 'Content-Type': 'image/png' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'cutout_failed', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}