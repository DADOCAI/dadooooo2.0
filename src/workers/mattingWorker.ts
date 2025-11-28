import * as ort from 'onnxruntime-web'

type Update = (stage: 'downloading' | 'loading' | 'ready' | 'error', progress?: number, errorMessage?: string) => void
type Req =
  | { type: 'init'; jobId: number }
  | { type: 'matting'; jobId: number; width: number; height: number; data: Uint8ClampedArray }
  | { type: 'fast'; jobId: number; width: number; height: number; data: Uint8ClampedArray }
type Res =
  | { type: 'progress'; stage: 'downloading' | 'loading' | 'ready' | 'error'; progress?: number; errorMessage?: string }
  | { type: 'result'; jobId: number; width: number; height: number; data: Uint8ClampedArray }
  | { type: 'error'; jobId: number; errorMessage: string }

let session: ort.InferenceSession | null = null
let creating: Promise<ort.InferenceSession> | null = null

function postProgress(stage: 'downloading' | 'loading' | 'ready' | 'error', progress?: number, errorMessage?: string) {
  ;(self as any).postMessage({ type: 'progress', stage, progress, errorMessage } as Res)
}

async function ensureModelLoaded(update?: Update) {
  if (session) return session
  if (creating) return creating

  const env: any = (ort as any).env
  env.wasm = env.wasm || {}
  env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'
  env.wasm.numThreads = 1
  env.wasm.proxy = false
  env.wasm.simd = false

  update?.('downloading', 0)

  const modelBytes = await getModelBytes(update)

  creating = (async () => {
    try {
      update?.('loading', undefined)
      const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] })
      session = s
      update?.('ready', 1)
      return s
    } catch (e: any) {
      const msg = (e && e.message) ? String(e.message) : 'unsupported'
      update?.('error', undefined, msg)
      throw e
    }
  })()
  return creating
}

async function getModelBytes(update?: Update): Promise<Uint8Array> {
  const candidates = [
    'https://huggingface.co/jilijeanlouis/test-u2net/resolve/main/u2netp.onnx',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx'
  ]
  for (const url of candidates) {
    try {
      const buf = await downloadAsUint8Array(url, update)
      return buf
    } catch (e) {}
  }
  update?.('error', undefined, '模型下载失败或不可用')
  throw new Error('model_not_found')
}

async function downloadAsUint8Array(url: string, update?: Update): Promise<Uint8Array> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  let resp: Response
  try {
    resp = await fetch(url, { mode: 'cors', signal: controller.signal })
  } finally { clearTimeout(timeout) }
  if (!resp.ok) throw new Error('http_' + resp.status)
  const total = Number(resp.headers.get('content-length') || 0)
  if (resp.body && total > 0 && typeof (ReadableStream) !== 'undefined') {
    const reader = resp.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        loaded += value.length
        update?.('downloading', total ? loaded / total : undefined)
      }
    }
    const out = new Uint8Array(loaded)
    let offset = 0
    for (const ch of chunks) { out.set(ch, offset); offset += ch.length }
    return out
  } else {
    const arr = new Uint8Array(await resp.arrayBuffer())
    return arr
  }
}

async function runMatting(width: number, height: number, rgba: Uint8ClampedArray): Promise<Uint8ClampedArray> {
  if (!session) throw new Error('session_not_ready')
  const w0 = width
  const h0 = height
  const target = 320
  const chw = new Float32Array(1 * 3 * target * target)
  const tmp = resizeRgbaToSquare(rgba, w0, h0, target)
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const idx = y * target + x
      const i = idx * 4
      chw[0 * target * target + idx] = tmp[i] / 255
      chw[1 * target * target + idx] = tmp[i + 1] / 255
      chw[2 * target * target + idx] = tmp[i + 2] / 255
    }
  }
  const inputName = session.inputNames ? session.inputNames[0] : 'input'
  const feeds: any = {}
  feeds[inputName] = new ort.Tensor('float32', chw, [1, 3, target, target])
  const results = await session.run(feeds)
  let outName = session.outputNames && session.outputNames.length ? session.outputNames[0] : Object.keys(results)[0]
  const names = session.outputNames && session.outputNames.length ? session.outputNames : Object.keys(results)
  for (const n of names) {
    const arr = (results as any)[n].data as any
    if (arr && arr.length === target * target) { outName = n; break }
  }
  const out = (results as any)[outName].data as Float32Array | Uint8Array
  const mSmall = new Uint8ClampedArray(target * target)
  for (let i = 0; i < mSmall.length; i++) {
    const v = (out as any)[i]
    const a = Math.max(0, Math.min(255, Math.round((typeof v === 'number' ? v : Number(v)) * 255)))
    mSmall[i] = a
  }
  const alphaBig = scaleAlphaNearest(mSmall, target, target, w0, h0)
  const refined = refineAlpha(alphaBig, w0, h0, { morphRadius: 2, featherRadius: 2 })
  const outRgba = new Uint8ClampedArray(w0 * h0 * 4)
  for (let i = 0, p4 = 0, pSrc = 0; i < w0 * h0; i++, p4 += 4, pSrc += 4) {
    outRgba[p4] = rgba[pSrc]
    outRgba[p4 + 1] = rgba[pSrc + 1]
    outRgba[p4 + 2] = rgba[pSrc + 2]
    outRgba[p4 + 3] = refined[i]
  }
  return outRgba
}

function runFastPreview(width: number, height: number, rgba: Uint8ClampedArray): Uint8ClampedArray {
  const img = { data: rgba, width, height } as ImageData
  const bg = estimateBackgroundColor(img)
  const alpha = computeAlphaMask(img, bg)
  const refined = refineAlpha(alpha, width, height, { morphRadius: 1, featherRadius: 2 })
  const out = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    out[p] = rgba[p]
    out[p + 1] = rgba[p + 1]
    out[p + 2] = rgba[p + 2]
    out[p + 3] = refined[i]
  }
  return out
}

function resizeRgbaToSquare(src: Uint8ClampedArray, w0: number, h0: number, target: number) {
  const out = new Uint8ClampedArray(target * target * 4)
  const scale = Math.min(target / w0, target / h0)
  const nw = Math.max(1, Math.round(w0 * scale))
  const nh = Math.max(1, Math.round(h0 * scale))
  const ox = Math.floor((target - nw) / 2)
  const oy = Math.floor((target - nh) / 2)
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(w0 - 1, Math.round(x / scale))
      const sy = Math.min(h0 - 1, Math.round(y / scale))
      const si = (sy * w0 + sx) * 4
      const di = ((oy + y) * target + (ox + x)) * 4
      out[di] = src[si]
      out[di + 1] = src[si + 1]
      out[di + 2] = src[si + 2]
      out[di + 3] = 255
    }
  }
  return out
}

function scaleAlphaNearest(src: Uint8ClampedArray, sw: number, sh: number, dw: number, dh: number) {
  const out = new Uint8ClampedArray(dw * dh)
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor(x * sw / dw)
      const sy = Math.floor(y * sh / dh)
      out[y * dw + x] = src[sy * sw + sx]
    }
  }
  return out
}

function blurAlpha(alpha: Uint8ClampedArray, w: number, h: number, r: number) {
  const out = new Uint8ClampedArray(alpha.length)
  const rs = Math.max(1, r)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0
      for (let dy = -rs; dy <= rs; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy))
        for (let dx = -rs; dx <= rs; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx))
          s += alpha[yy * w + xx]
          c++
        }
      }
      out[y * w + x] = Math.round(s / c)
    }
  }
  alpha.set(out)
}

function refineAlpha(alpha: Uint8ClampedArray, w: number, h: number, opts: { morphRadius: number, featherRadius: number }) {
  const bin = new Uint8ClampedArray(alpha.length)
  for (let i = 0; i < alpha.length; i++) bin[i] = alpha[i] >= 128 ? 255 : 0
  const opened = erode(dilate(bin, w, h, opts.morphRadius), w, h, opts.morphRadius)
  const refined = new Uint8ClampedArray(opened.length)
  refined.set(opened)
  if (opts.featherRadius > 0) blurAlpha(refined, w, h, opts.featherRadius)
  return refined
}

function dilate(src: Uint8ClampedArray, w: number, h: number, r: number) {
  const out = new Uint8ClampedArray(src.length)
  const rs = Math.max(1, r)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let maxv = 0
      for (let dy = -rs; dy <= rs; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy))
        for (let dx = -rs; dx <= rs; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx))
          const v = src[yy * w + xx]
          if (v > maxv) maxv = v
        }
      }
      out[y * w + x] = maxv
    }
  }
  return out
}

function erode(src: Uint8ClampedArray, w: number, h: number, r: number) {
  const out = new Uint8ClampedArray(src.length)
  const rs = Math.max(1, r)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minv = 255
      for (let dy = -rs; dy <= rs; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy))
        for (let dx = -rs; dx <= rs; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx))
          const v = src[yy * w + xx]
          if (v < minv) minv = v
        }
      }
      out[y * w + x] = minv
    }
  }
  return out
}

;(self as any).onmessage = async (ev: MessageEvent<Req>) => {
  const msg = ev.data
  try {
    if (msg.type === 'init') {
      await ensureModelLoaded((s, p, e) => postProgress(s, p, e))
      return
    }
    if (msg.type === 'matting') {
      const rgba = await runMatting(msg.width, msg.height, msg.data)
      ;(self as any).postMessage({ type: 'result', jobId: msg.jobId, width: msg.width, height: msg.height, data: rgba } as Res, [rgba.buffer])
      return
    }
    if (msg.type === 'fast') {
      const rgba = runFastPreview(msg.width, msg.height, msg.data)
      ;(self as any).postMessage({ type: 'result', jobId: msg.jobId, width: msg.width, height: msg.height, data: rgba } as Res, [rgba.buffer])
      return
    }
  } catch (e: any) {
    ;(self as any).postMessage({ type: 'error', jobId: (msg as any).jobId || 0, errorMessage: e && e.message ? String(e.message) : 'error' } as Res)
  }
}

