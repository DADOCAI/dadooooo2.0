from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import Response, JSONResponse
from rembg import remove, new_session
import onnxruntime as ort
import numpy as np
from PIL import Image, ImageFilter
import io
import os
import requests

# FastAPI app
app = FastAPI()

# -----------------------------
# BRIA RMBG-1.4 (ONNX, CPU)
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
RMBG_ONNX_PATH = os.path.join(MODEL_DIR, "rmbg-v1.4.onnx")
RMBG_ONNX_URL = (
    "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx"
)


def ensure_rmbg_model():
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(RMBG_ONNX_PATH):
        resp = requests.get(RMBG_ONNX_URL, timeout=120)
        resp.raise_for_status()
        with open(RMBG_ONNX_PATH, "wb") as f:
            f.write(resp.content)


def rmbg_session_init():
    ensure_rmbg_model()
    return ort.InferenceSession(
        RMBG_ONNX_PATH, providers=["CPUExecutionProvider"]
    )


def run_rmbg_onnx(image_bytes: bytes, edge_smoothing: bool, sess: ort.InferenceSession) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    orig_w, orig_h = img.size

    # preprocess: resize -> [1,3,1024,1024], normalize to [-0.5, 0.5]
    img_resized = img.resize((1024, 1024), Image.BILINEAR)
    arr = np.array(img_resized).astype(np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)  # CHW
    arr = arr - 0.5
    inp = arr[np.newaxis, ...]  # NCHW

    input_name = sess.get_inputs()[0].name
    out = sess.run(None, {input_name: inp})[0]

    # postprocess: pick single-channel mask, scale to original size, normalize [0,255]
    if out.ndim == 4:  # [N,C,H,W]
        mask = out[0, 0]
    elif out.ndim == 3:  # [N,H,W]
        mask = out[0]
    else:
        raise RuntimeError(f"Unexpected RMBG output shape: {out.shape}")

    # min-max normalize to 0..255
    mask = mask - mask.min()
    mx = mask.max()
    if mx > 0:
        mask = mask / mx
    mask = (mask * 255).astype(np.uint8)

    mask_img = Image.fromarray(mask).resize((orig_w, orig_h), Image.BILINEAR)
    if edge_smoothing:
        mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=1.5))

    # compose RGBA
    rgba = img.copy()
    rgba.putalpha(mask_img)
    buf = io.BytesIO()
    rgba.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


# Initialize sessions once
session_precise = rmbg_session_init()  # BRIA RMBG-1.4 via ONNXRuntime (CPU)
session_fast = new_session("u2net")  # U2Net via rembg (CPU)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/cutout")
async def cutout(
    file: UploadFile = File(...),
    mode: str = Form("precise"),
    edge_smoothing: bool = Form(False),
):
    """
    Remove background using the selected model.
    - mode: 'precise' -> BRIA RMBG-1.4 (ONNXRuntime), 'fast' -> U2Net (rembg)
    - edge_smoothing: enables edge blur for better hair/edge quality
    Returns: PNG bytes with transparent background
    """
    try:
        data = await file.read()
        if mode == "precise":
            result_bytes = run_rmbg_onnx(data, edge_smoothing, session_precise)
        else:
            result_bytes = remove(data, session=session_fast, alpha_matting=edge_smoothing)
        return Response(content=result_bytes, media_type="image/png")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})