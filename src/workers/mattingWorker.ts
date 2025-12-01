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
let modelType: 'bria' = 'bria'

 

async function idbOpen(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open('isnet-model-cache', 1)
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('models')) db.createObjectStore('models') }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  try {
    const db = await idbOpen()
    return await new Promise((resolve) => {
      const tx = db.transaction('models', 'readonly')
      const store = tx.objectStore('models')
      const req = store.get(key)
      req.onsuccess = () => {
        const v = req.result as ArrayBuffer | undefined
        resolve(v ? new Uint8Array(v) : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function idbPut(key: string, bytes: Uint8Array): Promise<void> {
  try {
    const db = await idbOpen()
    await new Promise<void>((resolve) => {
      const tx = db.transaction('models', 'readwrite')
      const store = tx.objectStore('models')
      const req = store.put(bytes.buffer, key)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })
  } catch {}
}
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

  // 环境检测：优先 WebGPU，不可用则回退 WASM 单线程
  const providersPlan: string[][] = []
  try {
    if (env.webgpu && typeof env.webgpu.init === 'function') {
      await env.webgpu.init()
      providersPlan.push(['webgpu', 'wasm'])
    }
  } catch {}
  if (providersPlan.length === 0) providersPlan.push(['wasm'])

  update?.('downloading', 0)

  const modelBytes = await getModelBytesCached(update)

  creating = (async () => {
    let lastErr: any = null
    for (const prov of providersPlan) {
      try {
        update?.('loading', undefined)
        const s = await ort.InferenceSession.create(modelBytes, { executionProviders: prov })
        session = s
        console.log('execution provider =', prov[0])
        // 快速自检：对 64×64 测试图做一次推理
        await quickSelfTest(session)
        update?.('ready', 1, modelType)
        return s
      } catch (e: any) {
        lastErr = e
        continue
      }
    }
    const msg = (lastErr && lastErr.message) ? String(lastErr.message) : 'unsupported'
    update?.('error', undefined, msg)
    throw lastErr || new Error('unsupported')
  })()
  return creating
}

async function getModelBytes(update?: Update): Promise<Uint8Array> {
  const candidates = [
    'https://huggingface.co/briaai/RMBG-1.4/resolve/main/model.onnx'
  ]
  for (const url of candidates) {
    try {
      const cached = await idbGet(url)
      if (cached && cached.byteLength > 0) {
        console.log('segment model url =', url)
        console.log('segment model size =', cached.byteLength, 'bytes')
        return cached
      }
      console.log('segment model url =', url)
      const buf = await downloadAsUint8Array(url, update)
      console.log('segment model size =', buf.byteLength, 'bytes')
      await idbPut(url, buf)
      return buf
    } catch (e) {}
  }
  update?.('error', undefined, '模型下载失败或不可用')
  throw new Error('model_not_found')
}

async function downloadAsUint8Array(url: string, update?: Update): Promise<Uint8Array> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)
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
  const target = 1024
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]

  // BRIA 预处理：等比缩放到不超过1024，并居中padding到1024×1024；转为RGB、float32并按mean/std归一化
  const boxed = resizeAndPadToSquare(rgba, w0, h0, target)
  const chw = new Float32Array(1 * 3 * target * target)
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const idx = y * target + x
      const i = idx * 4
      const r = boxed.rgba[i] / 255
      const g = boxed.rgba[i + 1] / 255
      const b = boxed.rgba[i + 2] / 255
      chw[0 * target * target + idx] = (r - mean[0]) / std[0]
      chw[1 * target * target + idx] = (g - mean[1]) / std[1]
      chw[2 * target * target + idx] = (b - mean[2]) / std[2]
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
  const maskSquare = new Float32Array(target * target)
  for (let i = 0; i < maskSquare.length; i++) {
    const v = Number((out as any)[i])
    const s = 1 / (1 + Math.exp(-v))
    maskSquare[i] = Math.max(0, Math.min(1, s))
  }

  // 从方形掩码裁掉padding区域
  const cropped = cropFloat(maskSquare, target, target, boxed.padLeft, boxed.padTop, boxed.w1, boxed.h1)
  // 回弹到原图尺寸
  const alphaBigF = scaleAlphaBilinear(cropped, boxed.w1, boxed.h1, w0, h0)

  // normalize mask to 0..1 via min-max, then optional thresholding to push foreground/background
  // mask 后处理：min-max normalize + 轻度gamma与阈值强化，抠干净白墙背景
  let minV = 1, maxV = 0
  for (let i = 0; i < alphaBigF.length; i++) {
    const v = alphaBigF[i]
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }
  const denom = Math.max(1e-6, maxV - minV)
  for (let i = 0; i < alphaBigF.length; i++) {
    let v = (alphaBigF[i] - minV) / denom
    v = Math.pow(Math.max(0, Math.min(1, v)), 2.0)
    if (v < 0.05) v = 0
    else if (v > 0.95) v = 1
    alphaBigF[i] = v
  }

  // 合成：RGB保留原图像素；alpha = mask * 255（uint8）
  const alpha8 = new Uint8ClampedArray(w0 * h0)
  for (let i = 0; i < alpha8.length; i++) alpha8[i] = Math.round(Math.max(0, Math.min(1, alphaBigF[i])) * 255)
  blurAlpha(alpha8, w0, h0, 2)

  const outRgba = new Uint8ClampedArray(w0 * h0 * 4)
  for (let i = 0, p4 = 0, pSrc = 0; i < w0 * h0; i++, p4 += 4, pSrc += 4) {
    outRgba[p4] = rgba[pSrc]
    outRgba[p4 + 1] = rgba[pSrc + 1]
    outRgba[p4 + 2] = rgba[pSrc + 2]
    outRgba[p4 + 3] = alpha8[i]
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

function resizeRgbaToFixed(src: Uint8ClampedArray, w0: number, h0: number, tw: number, th: number) {
  const out = new Uint8ClampedArray(tw * th * 4)
  for (let y = 0; y < th; y++) {
    const syf = (y + 0.5) * h0 / th - 0.5
    const sy0 = Math.max(0, Math.floor(syf))
    const sy1 = Math.min(h0 - 1, sy0 + 1)
    const wy = syf - sy0
    for (let x = 0; x < tw; x++) {
      const sxf = (x + 0.5) * w0 / tw - 0.5
      const sx0 = Math.max(0, Math.floor(sxf))
      const sx1 = Math.min(w0 - 1, sx0 + 1)
      const wx = sxf - sx0
      const i00 = (sy0 * w0 + sx0) * 4
      const i01 = (sy0 * w0 + sx1) * 4
      const i10 = (sy1 * w0 + sx0) * 4
      const i11 = (sy1 * w0 + sx1) * 4
      const di = (y * tw + x) * 4
      for (let c = 0; c < 4; c++) {
        const v00 = src[i00 + c], v01 = src[i01 + c], v10 = src[i10 + c], v11 = src[i11 + c]
        const v0 = v00 * (1 - wx) + v01 * wx
        const v1 = v10 * (1 - wx) + v11 * wx
        out[di + c] = Math.round(v0 * (1 - wy) + v1 * wy)
      }
    }
  }
  return out
}

function resizeAndPadToSquare(src: Uint8ClampedArray, w0: number, h0: number, target: number) {
  const scale = Math.min(1, target / Math.max(w0, h0))
  const w1 = Math.max(1, Math.round(w0 * scale))
  const h1 = Math.max(1, Math.round(h0 * scale))
  const padLeft = Math.floor((target - w1) / 2)
  const padTop = Math.floor((target - h1) / 2)
  const tmp = resizeRgbaToFixed(src, w0, h0, w1, h1)
  const out = new Uint8ClampedArray(target * target * 4)
  for (let i = 0; i < out.length; i++) out[i] = 0
  for (let y = 0; y < h1; y++) {
    for (let x = 0; x < w1; x++) {
      const si = (y * w1 + x) * 4
      const di = ((padTop + y) * target + (padLeft + x)) * 4
      out[di] = tmp[si]
      out[di + 1] = tmp[si + 1]
      out[di + 2] = tmp[si + 2]
      out[di + 3] = 255
    }
  }
  return { rgba: out, w1, h1, padLeft, padTop }
}

function cropFloat(src: Float32Array, sw: number, sh: number, x: number, y: number, w: number, h: number) {
  const out = new Float32Array(w * h)
  for (let yy = 0; yy < h; yy++) {
    const sy = y + yy
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx
      out[yy * w + xx] = src[sy * sw + sx]
    }
  }
  return out
}

function scaleAlphaBilinear(src: Float32Array, sw: number, sh: number, dw: number, dh: number) {
  const out = new Float32Array(dw * dh)
  for (let y = 0; y < dh; y++) {
    const syf = (y + 0.5) * sh / dh - 0.5
    const sy0 = Math.max(0, Math.floor(syf))
    const sy1 = Math.min(sh - 1, sy0 + 1)
    const wy = syf - sy0
    for (let x = 0; x < dw; x++) {
      const sxf = (x + 0.5) * sw / dw - 0.5
      const sx0 = Math.max(0, Math.floor(sxf))
      const sx1 = Math.min(sw - 1, sx0 + 1)
      const wx = sxf - sx0
      const i00 = sy0 * sw + sx0
      const i01 = sy0 * sw + sx1
      const i10 = sy1 * sw + sx0
      const i11 = sy1 * sw + sx1
      const v0 = src[i00] * (1 - wx) + src[i01] * wx
      const v1 = src[i10] * (1 - wx) + src[i11] * wx
      out[y * dw + x] = v0 * (1 - wy) + v1 * wy
    }
  }
  return out
}

async function quickSelfTest(s: ort.InferenceSession) {
  const w = 64, h = 64, target = 1024
  const img = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < img.length; i += 4) { img[i] = 128; img[i + 1] = 128; img[i + 2] = 128; img[i + 3] = 255 }
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]
  const boxed = resizeAndPadToSquare(img, w, h, target)
  const chw = new Float32Array(1 * 3 * target * target)
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const idx = y * target + x
      const i = idx * 4
      const r = boxed.rgba[i] / 255
      const g = boxed.rgba[i + 1] / 255
      const b = boxed.rgba[i + 2] / 255
      chw[0 * target * target + idx] = (r - mean[0]) / std[0]
      chw[1 * target * target + idx] = (g - mean[1]) / std[1]
      chw[2 * target * target + idx] = (b - mean[2]) / std[2]
    }
  }
  const inputName = s.inputNames ? s.inputNames[0] : 'input'
  const feeds: any = {}
  feeds[inputName] = new ort.Tensor('float32', chw, [1, 3, target, target])
  await s.run(feeds)
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

function refineAlpha(alpha: Uint8ClampedArray, w: number, h: number, opts: { morphRadius: number, featherRadius: number, threshold?: number }) {
  const bin = new Uint8ClampedArray(alpha.length)
  const t = typeof opts.threshold === 'number' ? Math.max(0, Math.min(255, Math.round(opts.threshold))) : 128
  for (let i = 0; i < alpha.length; i++) bin[i] = alpha[i] >= t ? 255 : 0
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

function close(src: Uint8ClampedArray, w: number, h: number, r: number) {
  return erode(dilate(src, w, h, r), w, h, r)
}

function computeOtsuThreshold(alpha: Uint8ClampedArray) {
  const hist = new Uint32Array(256)
  let total = 0
  for (let i = 0; i < alpha.length; i++) { const v = alpha[i]; hist[v]++; total++ }
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, wF = 0
  let maxVar = -1, t = 128
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (wB === 0) continue
    wF = total - wB
    if (wF === 0) break
    sumB += i * hist[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) { maxVar = between; t = i }
  }
  return Math.max(32, Math.min(224, t))
}

function largestComponent(bin: Uint8ClampedArray, w: number, h: number) {
  const visited = new Uint8Array(bin.length)
  const stackX = new Int32Array(bin.length)
  const stackY = new Int32Array(bin.length)
  let bestCount = 0, bestMask: Uint8ClampedArray | null = null
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (visited[idx] || bin[idx] === 0) continue
      let top = 0, count = 0
      const mask = new Uint8ClampedArray(bin.length)
      stackX[top] = x; stackY[top] = y; top++
      visited[idx] = 1
      while (top > 0) {
        top--
        const cx = stackX[top], cy = stackY[top]
        const cidx = cy * w + cx
        if (mask[cidx] === 255) continue
        mask[cidx] = 255
        count++
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = cx + dx, ny = cy + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            const nidx = ny * w + nx
            if (visited[nidx]) continue
            if (bin[nidx] === 0) continue
            visited[nidx] = 1
            stackX[top] = nx; stackY[top] = ny; top++
          }
        }
      }
      if (count > bestCount) { bestCount = count; bestMask = mask }
    }
  }
  if (!bestMask) return bin
  return bestMask
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

async function getModelBytesCached(update?: Update): Promise<Uint8Array> {
  const candidates = [
    'https://huggingface.co/briaai/RMBG-1.4/resolve/main/model.onnx'
  ]
  for (const url of candidates) {
    try {
      const cached = await idbGet(url)
      if (cached && cached.byteLength > 0) {
        console.log('segment model url =', url)
        console.log('segment model size =', cached.byteLength, 'bytes')
        return cached
      }
      console.log('segment model url =', url)
      const buf = await downloadAsUint8Array(url, update)
      console.log('segment model size =', buf.byteLength, 'bytes')
      await idbPut(url, buf)
      return buf
    } catch (e) {}
  }
  update?.('error', undefined, '模型下载失败或不可用')
  throw new Error('model_not_found')
}
