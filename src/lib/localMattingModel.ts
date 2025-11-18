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
  c.getContext('2d')!.drawImage(srcCanvas, 0, 0, target, target)
  const d = c.getContext('2d')!.getImageData(0, 0, target, target).data
  const chw = new Float32Array(1 * 3 * target * target)
  let p = 0
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const i = (y * target + x) * 4
      chw[p + 0 * target * target] = d[i] / 255
      chw[p + 1 * target * target] = d[i + 1] / 255
      chw[p + 2 * target * target] = d[i + 2] / 255
      p++
    }
  }
  const inputName = session.inputNames ? session.inputNames[0] : 'input'
  const feeds: any = {}
  feeds[inputName] = new ort.Tensor('float32', chw, [1, 3, target, target])
  const results = await session.run(feeds)
  const outName = session.outputNames ? session.outputNames[0] : Object.keys(results)[0]
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
  const outId = new ImageData(w0, h0)
  for (let i = 0, p3 = 0; i < w0 * h0; i++, p3 += 4) {
    outId.data[p3] = imageData.data[p3]
    outId.data[p3 + 1] = imageData.data[p3 + 1]
    outId.data[p3 + 2] = imageData.data[p3 + 2]
    outId.data[p3 + 3] = bigData[p3 + 3]
  }
  return outId
}