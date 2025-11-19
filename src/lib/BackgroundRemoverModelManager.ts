import * as ort from 'onnxruntime-web'

type Stage = 'downloading' | 'loading' | 'ready' | 'error'
type Update = (stage: Stage, progress?: number, errorMessage?: string) => void
type Backend = 'webgpu' | 'wasm-simd' | 'wasm' | 'fast'

const DB_NAME = 'dadoooo-models-idb'
const STORE = 'models'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<Uint8Array | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const st = tx.objectStore(STORE)
    const req = st.get(key)
    req.onsuccess = () => {
      const v = req.result
      resolve(v ? new Uint8Array(v) : undefined)
    }
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, val: Uint8Array): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const st = tx.objectStore(STORE)
    const req = st.put(val, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function download(url: string, update?: Update): Promise<Uint8Array> {
  const resp = await fetch(url, { mode: 'cors' })
  if (!resp.ok) throw new Error('http_' + resp.status)
  const total = Number(resp.headers.get('content-length') || 0)
  if (resp.body && total > 0 && typeof ReadableStream !== 'undefined') {
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
    return new Uint8Array(await resp.arrayBuffer())
  }
}

async function getBytesWithCache(key: string, urls: string[], update?: Update): Promise<Uint8Array> {
  const hit = await idbGet(key)
  if (hit && hit.length > 0) return hit
  for (const u of urls) {
    try {
      const buf = await download(u, update)
      await idbSet(key, buf)
      return buf
    } catch {}
  }
  throw new Error('model_not_found')
}

async function createSession(modelBytes: Uint8Array, update?: Update): Promise<{ s: ort.InferenceSession, be: Backend }> {
  const env: any = (ort as any).env
  env.wasm = env.wasm || {}
  env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/'
  env.wasm.numThreads = Math.max(1, Math.min(4, (navigator as any).hardwareConcurrency || 2))
  try {
    if (typeof (navigator as any).gpu !== 'undefined') {
      update?.('loading', undefined)
      const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['webgpu'] })
      return { s, be: 'webgpu' }
    }
  } catch {}
  try {
    env.wasm.simd = true
    update?.('loading', undefined)
    const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] })
    return { s, be: 'wasm-simd' }
  } catch {}
  env.wasm.simd = false
  update?.('loading', undefined)
  const s = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] })
  return { s, be: 'wasm' }
}

function chwU2Net(img: ImageData, target: number) {
  const src = document.createElement('canvas')
  src.width = img.width
  src.height = img.height
  src.getContext('2d')!.putImageData(img, 0, 0)
  const c = document.createElement('canvas')
  c.width = target
  c.height = target
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, target, target)
  const scale = Math.min(target / img.width, target / img.height)
  const nw = Math.max(1, Math.round(img.width * scale))
  const nh = Math.max(1, Math.round(img.height * scale))
  const ox = Math.floor((target - nw) / 2)
  const oy = Math.floor((target - nh) / 2)
  ctx.drawImage(src, ox, oy, nw, nh)
  const d = ctx.getImageData(0, 0, target, target).data
  const out = new Float32Array(1 * 3 * target * target)
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const idx = y * target + x
      const i = idx * 4
      out[0 * target * target + idx] = d[i] / 255
      out[1 * target * target + idx] = d[i + 1] / 255
      out[2 * target * target + idx] = d[i + 2] / 255
    }
  }
  return { data: out, target, srcW: img.width, srcH: img.height }
}

function chwMODNet(img: ImageData, target: number) {
  const src = document.createElement('canvas')
  src.width = img.width
  src.height = img.height
  src.getContext('2d')!.putImageData(img, 0, 0)
  const c = document.createElement('canvas')
  c.width = target
  c.height = target
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, target, target)
  const scale = Math.min(target / img.width, target / img.height)
  const nw = Math.max(1, Math.round(img.width * scale))
  const nh = Math.max(1, Math.round(img.height * scale))
  const ox = Math.floor((target - nw) / 2)
  const oy = Math.floor((target - nh) / 2)
  ctx.drawImage(src, ox, oy, nw, nh)
  const d = ctx.getImageData(0, 0, target, target).data
  const out = new Float32Array(1 * 3 * target * target)
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const idx = y * target + x
      const i = idx * 4
      const r = d[i] / 255
      const g = d[i + 1] / 255
      const b = d[i + 2] / 255
      out[0 * target * target + idx] = (r - 0.5) / 0.5
      out[1 * target * target + idx] = (g - 0.5) / 0.5
      out[2 * target * target + idx] = (b - 0.5) / 0.5
    }
  }
  return { data: out, target, srcW: img.width, srcH: img.height }
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

function refineAlpha(alpha: Uint8ClampedArray, w: number, h: number) {
  blurAlpha(alpha, w, h, 2)
  return alpha
}

class BackgroundRemoverModelManager {
  private u2Bytes?: Uint8Array
  private modBytes?: Uint8Array
  private u2Session?: ort.InferenceSession
  private modSession?: ort.InferenceSession
  private creating?: Promise<void>
  private lastBackend?: Backend
  private update?: Update
  private u2Backend?: Backend
  private modBackend?: Backend

  async preload(update?: Update) {
    if (this.creating) return this.creating
    this.update = update
    const u2Urls = [
      '/models/u2netp.onnx',
      '/models/u2net.onnx',
      'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
      'https://huggingface.co/jilijeanlouis/test-u2net/resolve/main/u2netp.onnx'
    ]
    const modUrls = [
      '/models/modnet.onnx',
      'https://huggingface.co/gradio/Modnet/resolve/main/modnet.onnx'
    ]
    this.creating = (async () => {
      try {
        update?.('downloading', 0)
        this.u2Bytes = await getBytesWithCache('u2net', u2Urls, update)
      } catch {}
      try {
        update?.('downloading', 0)
        this.modBytes = await getBytesWithCache('modnet', modUrls, update)
      } catch {}
      if (this.u2Bytes) {
        const { s, be } = await createSession(this.u2Bytes, update)
        this.u2Session = s
        this.u2Backend = be
        this.lastBackend = be
      }
      if (this.modBytes && !this.modSession) {
        const { s, be } = await createSession(this.modBytes, update)
        this.modSession = s
        this.modBackend = be
      }
      update?.('ready', 1)
    })()
    return this.creating
  }

  getBackend() { return this.lastBackend }

  async runPrecise(img: ImageData): Promise<ImageData> {
    try {
      if (!this.u2Session) await this.preload(this.update)
      if (!this.u2Session) throw new Error('no_u2net')
      const prep = chwU2Net(img, 320)
      const input = new ort.Tensor('float32', prep.data, [1, 3, prep.target, prep.target])
      const feeds: any = {}
      const name = this.u2Session!.inputNames ? this.u2Session!.inputNames[0] : 'input'
      feeds[name] = input
      const res = await this.u2Session!.run(feeds)
      let outName = this.u2Session!.outputNames && this.u2Session!.outputNames.length ? this.u2Session!.outputNames[0] : Object.keys(res)[0]
      const names = this.u2Session!.outputNames && this.u2Session!.outputNames.length ? this.u2Session!.outputNames : Object.keys(res)
      for (const n of names) {
        const arr = (res as any)[n].data
        if (arr && arr.length === prep.target * prep.target) { outName = n; break }
      }
      const out = (res as any)[outName].data as Float32Array | Uint8Array
      const mSmall = new Uint8ClampedArray(prep.target * prep.target)
      for (let i = 0; i < mSmall.length; i++) mSmall[i] = Math.max(0, Math.min(255, Math.round((out as any)[i] * 255)))
      const mCanvas = document.createElement('canvas')
      mCanvas.width = prep.target
      mCanvas.height = prep.target
      const mctx = mCanvas.getContext('2d')!
      const mid = mctx.createImageData(prep.target, prep.target)
      for (let i = 0, p2 = 0; i < mSmall.length; i++, p2 += 4) mid.data[p2 + 3] = mSmall[i]
      mctx.putImageData(mid, 0, 0)
      const big = document.createElement('canvas')
      big.width = prep.srcW
      big.height = prep.srcH
      big.getContext('2d')!.drawImage(mCanvas, 0, 0, prep.srcW, prep.srcH)
      const bigData = big.getContext('2d')!.getImageData(0, 0, prep.srcW, prep.srcH).data
      const alpha = new Uint8ClampedArray(prep.srcW * prep.srcH)
      for (let i = 0, p3 = 0; i < alpha.length; i++, p3 += 4) alpha[i] = bigData[p3 + 3]
      const refined = refineAlpha(alpha, prep.srcW, prep.srcH)
      const outId = new ImageData(prep.srcW, prep.srcH)
      for (let i = 0, p4 = 0; i < prep.srcW * prep.srcH; i++, p4 += 4) {
        outId.data[p4] = img.data[p4]
        outId.data[p4 + 1] = img.data[p4 + 1]
        outId.data[p4 + 2] = img.data[p4 + 2]
        outId.data[p4 + 3] = refined[i]
      }
      this.lastBackend = this.u2Backend
      return outId
    } catch {
      return this.runFast(img)
    }
  }

  async runFast(img: ImageData): Promise<ImageData> {
    try {
      if (!this.modSession) await this.preload(this.update)
      if (!this.modSession) throw new Error('no_modnet')
      const prep = chwMODNet(img, 256)
      const input = new ort.Tensor('float32', prep.data, [1, 3, prep.target, prep.target])
      const feeds: any = {}
      const name = this.modSession!.inputNames ? this.modSession!.inputNames[0] : 'input'
      feeds[name] = input
      const res = await this.modSession!.run(feeds)
      const keys = Object.keys(res)
      let outName = keys[0]
      for (const k of keys) {
        const arr = (res as any)[k].data
        if (arr && arr.length === prep.target * prep.target) { outName = k; break }
      }
      const out = (res as any)[outName].data as Float32Array | Uint8Array
      const mSmall = new Uint8ClampedArray(prep.target * prep.target)
      for (let i = 0; i < mSmall.length; i++) mSmall[i] = Math.max(0, Math.min(255, Math.round(((out as any)[i] as number) * 255)))
      const mCanvas = document.createElement('canvas')
      mCanvas.width = prep.target
      mCanvas.height = prep.target
      const mctx = mCanvas.getContext('2d')!
      const mid = mctx.createImageData(prep.target, prep.target)
      for (let i = 0, p2 = 0; i < mSmall.length; i++, p2 += 4) mid.data[p2 + 3] = mSmall[i]
      mctx.putImageData(mid, 0, 0)
      const big = document.createElement('canvas')
      big.width = prep.srcW
      big.height = prep.srcH
      big.getContext('2d')!.drawImage(mCanvas, 0, 0, prep.srcW, prep.srcH)
      const bigData = big.getContext('2d')!.getImageData(0, 0, prep.srcW, prep.srcH).data
      const alpha = new Uint8ClampedArray(prep.srcW * prep.srcH)
      for (let i = 0, p3 = 0; i < alpha.length; i++, p3 += 4) alpha[i] = bigData[p3 + 3]
      const refined = refineAlpha(alpha, prep.srcW, prep.srcH)
      const outId = new ImageData(prep.srcW, prep.srcH)
      for (let i = 0, p4 = 0; i < prep.srcW * prep.srcH; i++, p4 += 4) {
        outId.data[p4] = img.data[p4]
        outId.data[p4 + 1] = img.data[p4 + 1]
        outId.data[p4 + 2] = img.data[p4 + 2]
        outId.data[p4 + 3] = refined[i]
      }
      this.lastBackend = this.modBackend
      return outId
    } catch {
      const out = new ImageData(img.width, img.height)
      out.data.set(img.data)
      for (let i = 0; i < img.width * img.height; i++) out.data[i * 4 + 3] = 255
      this.lastBackend = 'fast'
      return out
    }
  }
}

const ModelManager = new BackgroundRemoverModelManager()
export default ModelManager
export { BackgroundRemoverModelManager }