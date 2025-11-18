import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  try {
    const API_KEY = process.env.REMBG_API_KEY || ''
    if (!API_KEY) return res.status(500).json({ error: 'rembg_not_configured' })

    const contentType = req.headers['content-type'] || ''
    if (!String(contentType).startsWith('multipart/form-data')) {
      return res.status(400).json({ error: 'invalid_content_type' })
    }

    const buffers: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk) => buffers.push(Buffer.from(chunk)))
      req.on('end', () => resolve())
      req.on('error', (e) => reject(e))
    })
    const rawBody = Buffer.concat(buffers)

    // Quick and safe multipart parse using boundary
    const boundaryMatch = /boundary=([^;]+)/i.exec(String(contentType))
    if (!boundaryMatch) return res.status(400).json({ error: 'missing_boundary' })
    const boundary = `--${boundaryMatch[1]}`
    const parts = rawBody.toString('binary').split(boundary)

    let fileBuffer: Buffer | undefined
    let filename = 'upload.png'
    let mode: string | undefined
    let edge_smoothing: string | undefined

    for (const p of parts) {
      // headers and body split
      const [rawHeaders, rawContent] = p.split('\r\n\r\n')
      if (!rawHeaders || !rawContent) continue
      const headers = rawHeaders.toLowerCase()
      if (headers.includes('content-disposition') && headers.includes('name="file"')) {
        const fnameMatch = /filename="([^"]+)"/i.exec(rawHeaders)
        if (fnameMatch) filename = fnameMatch[1]
        const endIndex = rawContent.lastIndexOf('\r\n')
        const binary = rawContent.substring(0, endIndex)
        fileBuffer = Buffer.from(binary, 'binary')
      } else if (headers.includes('name="mode"')) {
        const endIndex = rawContent.lastIndexOf('\r\n')
        mode = rawContent.substring(0, endIndex)
      } else if (headers.includes('name="edge_smoothing"')) {
        const endIndex = rawContent.lastIndexOf('\r\n')
        edge_smoothing = rawContent.substring(0, endIndex)
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'file_missing' })

    // Build form for rembg API
    const form = new FormData()
    const blob = new Blob([fileBuffer])
    form.append('image', blob, filename)
    form.append('format', 'png')

    const resp = await fetch('https://api.rembg.com/rmbg', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: form as any
    })
    if (!resp.ok) {
      const text = await resp.text()
      return res.status(502).json({ error: 'upstream_error', detail: text })
    }
    const ab = await resp.arrayBuffer()
    res.setHeader('Content-Type', 'image/png')
    res.send(Buffer.from(ab))
  } catch (e: any) {
    res.status(500).json({ error: 'cutout_failed', detail: e?.message || String(e) })
  }
}