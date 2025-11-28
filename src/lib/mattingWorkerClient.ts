let worker: Worker | null = null
let jobCounter = 1
type Listener = (stage: 'downloading' | 'loading' | 'ready' | 'error', progress?: number, errorMessage?: string) => void

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/mattingWorker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

export async function ensureWorkerReady(onUpdate?: Listener) {
  const w = getWorker()
  return new Promise<void>((resolve) => {
    const handleMessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (msg && msg.type === 'progress') {
        onUpdate?.(msg.stage, msg.progress, msg.errorMessage)
        if (msg.stage === 'ready') { w.removeEventListener('message', handleMessage); resolve() }
        if (msg.stage === 'error') { w.removeEventListener('message', handleMessage); resolve() }
      }
    }
    w.addEventListener('message', handleMessage)
    w.postMessage({ type: 'init', jobId: 0 })
  })
}

export async function runMattingInWorker(imageData: ImageData): Promise<ImageData> {
  const w = getWorker()
  const jobId = jobCounter++
  const rgba = new Uint8ClampedArray(imageData.data) // copy
  return new Promise<ImageData>((resolve, reject) => {
    const onMessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (!msg) return
      if (msg.type === 'result' && msg.jobId === jobId) {
        w.removeEventListener('message', onMessage)
        const out = new ImageData(msg.width, msg.height)
        out.data.set(new Uint8ClampedArray(msg.data))
        resolve(out)
      } else if (msg.type === 'error' && msg.jobId === jobId) {
        w.removeEventListener('message', onMessage)
        reject(new Error(msg.errorMessage || 'error'))
      }
    }
    w.addEventListener('message', onMessage)
    w.postMessage({ type: 'matting', jobId, width: imageData.width, height: imageData.height, data: rgba }, [rgba.buffer])
  })
}

export async function runFastPreviewInWorker(imageData: ImageData): Promise<ImageData> {
  const w = getWorker()
  const jobId = jobCounter++
  const rgba = new Uint8ClampedArray(imageData.data) // copy
  return new Promise<ImageData>((resolve, reject) => {
    const onMessage = (ev: MessageEvent<any>) => {
      const msg = ev.data
      if (!msg) return
      if (msg.type === 'result' && msg.jobId === jobId) {
        w.removeEventListener('message', onMessage)
        const out = new ImageData(msg.width, msg.height)
        out.data.set(new Uint8ClampedArray(msg.data))
        resolve(out)
      } else if (msg.type === 'error' && msg.jobId === jobId) {
        w.removeEventListener('message', onMessage)
        reject(new Error(msg.errorMessage || 'error'))
      }
    }
    w.addEventListener('message', onMessage)
    w.postMessage({ type: 'fast', jobId, width: imageData.width, height: imageData.height, data: rgba }, [rgba.buffer])
  })
}

