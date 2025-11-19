import * as ort from 'onnxruntime-web'

let session: ort.InferenceSession | null = null
let creating: Promise<ort.InferenceSession> | null = null
let backend: 'webgpu' | 'wasm-simd' | 'wasm' | 'fast' | undefined

type Update = (stage: 'downloading' | 'loading' | 'ready' | 'error', progress?: number, errorMessage?: string) => void

export async function ensureModelLoaded(update?: Update) {
  if (session) return session
  if (creating) return creating

  // Ensure ORT can locate wasm binaries even when bundler doesn't serve them
  const env: any = (ort as any).env
  env.wasm = env.wasm || {}
  env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/'
  env.wasm.numThreads = Math.max(1, Math.min(4, (navigator as any).hardwareConcurrency || 2))

  update?.('downloading', 0)

  const modelBytes = await getModelBytes(update)

  creating = (async () => {
    // WebGPU first
    try {
      if (typeof (navigator as any).gpu !== 'undefined') {
        update?.('loading', undefined)
        const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['webgpu'] })
        session = s
        backend = 'webgpu'
        update?.('ready', 1)
        return s
      }
    } catch (e) { console.warn('webgpu init failed', e) }
    // WASM SIMD
    try {
      ;(ort as any).env.wasm.simd = true
      update?.('loading', undefined)
      const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] })
      session = s
      backend = 'wasm-simd'
      update?.('ready', 1)
      return s
    } catch (e) { console.warn('wasm simd init failed', e) }
    // Plain WASM
    try {
      ;(ort as any).env.wasm.simd = false
      update?.('loading', undefined)
      const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] })
      session = s
      backend = 'wasm'
      update?.('ready', 1)
      return s
    } catch (e) { console.warn('plain wasm init failed', e) }
    const err = 'unsupported'
    backend = 'fast'
    update?.('error', undefined, err)
    throw new Error(err)
  })()
  return creating
}

async function getModelBytes(update?: Update): Promise<Uint8Array> {
  // Try CacheStorage first
  try {
    const cache = await (caches as any).open('dadoooo-models')
    const cached = await cache.match('model:u2netp')
    if (cached) {
      const buf = new Uint8Array(await cached.arrayBuffer())
      update?.('ready', 1)
      return buf
    }
  } catch {}

  const candidates = [
    '/models/u2netp.onnx',
    '/models/u2net.onnx',
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx'
  ]

  for (const url of candidates) {
    try {
      const buf = await downloadAsUint8Array(url, update)
      try {
        const cache = await (caches as any).open('dadoooo-models')
        await cache.put('model:u2netp', new Response(buf))
      } catch {}
      return buf
    } catch (e) { console.warn('model download failed', url, e) }
  }
  throw new Error('model_not_found')
}

async function downloadAsUint8Array(url: string, update?: Update): Promise<Uint8Array> {
  const resp = await fetch(url, { mode: 'cors' })
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

export async function runMatting(imageData: ImageData): Promise<ImageData> {
  if (!session) throw new Error('session_not_ready')
  const w0 = imageData.width
  const h0 = imageData.height
  const target = 320
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = w0
  srcCanvas.height = h0
  srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0)
  const c = document.createElement('canvas')
  c.width = target
  c.height = target
  const cctx = c.getContext('2d')!
  cctx.fillStyle = '#ffffff'
  cctx.fillRect(0, 0, target, target)
  const scale = Math.min(target / w0, target / h0)
  const nw = Math.max(1, Math.round(w0 * scale))
  const nh = Math.max(1, Math.round(h0 * scale))
  const ox = Math.floor((target - nw) / 2)
  const oy = Math.floor((target - nh) / 2)
  cctx.drawImage(srcCanvas, ox, oy, nw, nh)
  const d = cctx.getImageData(0, 0, target, target).data
  const chw = new Float32Array(1 * 3 * target * target)
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const idx = y * target + x
      const i = idx * 4
      chw[0 * target * target + idx] = d[i] / 255
      chw[1 * target * target + idx] = d[i + 1] / 255
      chw[2 * target * target + idx] = d[i + 2] / 255
    }
  }
  const inputName = session.inputNames ? session.inputNames[0] : 'input'
  const feeds: any = {}
  feeds[inputName] = new ort.Tensor('float32', chw, [1, 3, target, target])
  const results = await session.run(feeds)
  let outName = session.outputNames && session.outputNames.length ? session.outputNames[0] : Object.keys(results)[0]
  const names = session.outputNames && session.outputNames.length ? session.outputNames : Object.keys(results)
  for (const n of names) {
    const arr = results[n].data as any
    if (arr && arr.length === target * target) { outName = n; break }
  }
  const out = results[outName].data as Float32Array | Uint8Array
  const mSmall = new Uint8ClampedArray(target * target)
  for (let i = 0; i < mSmall.length; i++) {
    const v = (out as any)[i]
    const a = Math.max(0, Math.min(255, Math.round((typeof v === 'number' ? v : Number(v)) * 255)))
    mSmall[i] = a
  }
  const mCanvas = document.createElement('canvas')
  mCanvas.width = target
  mCanvas.height = target
  const mctx = mCanvas.getContext('2d')!
  const mid = mctx.createImageData(target, target)
  for (let i = 0, p2 = 0; i < mSmall.length; i++, p2 += 4) mid.data[p2 + 3] = mSmall[i]
  mctx.putImageData(mid, 0, 0)
  const big = document.createElement('canvas')
  big.width = w0
  big.height = h0
  big.getContext('2d')!.drawImage(mCanvas, 0, 0, w0, h0)
  const bigData = big.getContext('2d')!.getImageData(0, 0, w0, h0).data
  const alpha = new Uint8ClampedArray(w0 * h0)
  for (let i = 0, p3 = 0; i < alpha.length; i++, p3 += 4) alpha[i] = bigData[p3 + 3]
  const refined = refineAlpha(alpha, w0, h0, { morphRadius: 2, featherRadius: 2 })
  const outId = new ImageData(w0, h0)
  for (let i = 0, p4 = 0; i < w0 * h0; i++, p4 += 4) {
    outId.data[p4] = imageData.data[p4]
    outId.data[p4 + 1] = imageData.data[p4 + 1]
    outId.data[p4 + 2] = imageData.data[p4 + 2]
    outId.data[p4 + 3] = refined[i]
  }
  console.log('onnx run done')
  return outId
}

export function getBackend() { return backend }

export async function runFastPreview(imageData: ImageData): Promise<ImageData> {
  const { width, height, data } = imageData
  const bg = estimateBackgroundColor(imageData)
  const alpha = computeAlphaMask(imageData, bg)
  const refined = refineAlpha(alpha, width, height, { morphRadius: 1, featherRadius: 2 })
  const out = new ImageData(width, height)
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    out.data[p] = data[p]
    out.data[p + 1] = data[p + 1]
    out.data[p + 2] = data[p + 2]
    out.data[p + 3] = refined[i]
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

function estimateBackgroundColor(img: ImageData) {
  const { data, width, height } = img
  let r = 0, g = 0, b = 0, n = 0
  const step = Math.max(1, Math.floor(Math.min(width, height) / 50))
  for (let x = 0; x < width; x += step) {
    const iTop = (0 * width + x) * 4
    const iBot = ((height - 1) * width + x) * 4
    r += data[iTop]; g += data[iTop + 1]; b += data[iTop + 2]; n++
    r += data[iBot]; g += data[iBot + 1]; b += data[iBot + 2]; n++
  }
  for (let y = 0; y < height; y += step) {
    const iL = (y * width + 0) * 4
    const iR = (y * width + (width - 1)) * 4
    r += data[iL]; g += data[iL + 1]; b += data[iL + 2]; n++
    r += data[iR]; g += data[iR + 1]; b += data[iR + 2]; n++
  }
  return [r / n, g / n, b / n]
}

function computeAlphaMask(img: ImageData, bg: number[]) {
  const { data, width, height } = img
  const alpha = new Uint8ClampedArray(width * height)
  const dists: number[] = []
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
      const i = (y * width + x) * 4
      const dr = data[i] - bg[0]
      const dg = data[i + 1] - bg[1]
      const db = data[i + 2] - bg[2]
      dists.push(Math.sqrt(dr * dr + dg * dg + db * db))
    }
  }
  dists.sort((a, b) => a - b)
  const tLow = dists[Math.max(0, Math.floor(dists.length * 0.2))] + 5
  const tHigh = dists[Math.max(0, Math.floor(dists.length * 0.5))] + 20
  for (let iPix = 0, p = 0; iPix < width * height; iPix++, p += 4) {
    const dr = data[p] - bg[0]
    const dg = data[p + 1] - bg[1]
    const db = data[p + 2] - bg[2]
    const d = Math.sqrt(dr * dr + dg * dg + db * db)
    let a = 0
    if (d <= tLow) a = 0
    else if (d >= tHigh) a = 255
    else a = Math.round(((d - tLow) / (tHigh - tLow)) * 255)
    alpha[iPix] = a
  }
  return alpha
}