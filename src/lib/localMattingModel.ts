import * as ort from 'onnxruntime-web'

let session: ort.InferenceSession | null = null
let creating: Promise<ort.InferenceSession> | null = null

type Update = (stage: 'downloading' | 'loading' | 'ready' | 'error', progress?: number, errorMessage?: string) => void

export async function ensureModelLoaded(update?: Update) {
  if (session) return session
  if (creating) return creating
  const url = '/models/u2net.onnx'
  const eps = ['webgpu', 'webgl', 'wasm']
  update?.('downloading', 0)
  creating = (async () => {
    for (const ep of eps) {
      try {
        update?.('loading', undefined)
        const s = await ort.InferenceSession.create(url, { executionProviders: [ep] })
        console.log('onnx session created', { ep })
        session = s
        update?.('ready', 1)
        return s
      } catch (e) {}
    }
    const err = 'unsupported'
    update?.('error', undefined, err)
    throw new Error(err)
  })()
  return creating
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