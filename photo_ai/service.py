import os
from typing import Optional, Dict
import subprocess
import uuid
import tempfile
import io
import hashlib
import threading
import urllib.request
import urllib.parse
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from PIL import Image
from PIL import ImageFile
from PIL import UnidentifiedImageError

app = FastAPI()
@app.get("/health")
def health():
    return {"ok": True}

ImageFile.LOAD_TRUNCATED_IMAGES = False

def run_realesrgan(input_path: str, output_path: str) -> None:
    script = os.environ.get("REALESRGAN_SCRIPT", "").strip() or "inference_realesrgan.py"
    model = os.environ.get("REALESRGAN_MODEL", "RealESRGAN_x4plus")
    if script and not os.path.exists(script):
        raise RuntimeError(f"REALESRGAN_SCRIPT_NOT_FOUND: {script}")
    cmd = [
        os.environ.get("PYTHON_BIN", "python"),
        script,
        "-n",
        model,
        "-i",
        input_path,
        "-o",
        output_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout or "realesrgan_failed").strip())


def get_max_upload_bytes() -> int:
    try:
        mb = int(os.environ.get("PHOTO_AI_MAX_UPLOAD_MB", "20"))
    except Exception:
        mb = 20
    mb = max(1, min(200, mb))
    return mb * 1024 * 1024


def get_max_pixels() -> int:
    try:
        px = int(os.environ.get("PHOTO_AI_MAX_PIXELS", "20000000"))
    except Exception:
        px = 20000000
    return max(1_000_000, min(120_000_000, px))


def parse_bool(v: str) -> bool:
    s = (v or "").strip().lower()
    return s in {"1", "true", "yes", "y", "on"}


def inspect_image(raw: bytes) -> None:
    if len(raw) > get_max_upload_bytes():
        raise HTTPException(status_code=413, detail="FILE_TOO_LARGE")
    Image.MAX_IMAGE_PIXELS = get_max_pixels()
    try:
        with Image.open(io.BytesIO(raw)) as im:
            im.verify()
    except UnidentifiedImageError:
        raise HTTPException(status_code=415, detail="UNSUPPORTED_FORMAT")
    except Image.DecompressionBombError:
        raise HTTPException(status_code=413, detail="IMAGE_TOO_LARGE")


def _safe_model_url_for_name(name: str) -> str:
    n = (name or "").strip()
    if n == "RealESRGAN_x4plus":
        return "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
    if n == "RealESRGAN_x4plus_anime_6B":
        return "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus_anime_6B.pth"
    if n == "RealESRGAN_x2plus":
        return "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth"
    raise RuntimeError(f"REALESRGAN_MODEL_NOT_SUPPORTED: {n or ''}".strip())


def _download_file_https(url: str, dest_path: str, sha256_hex: Optional[str]) -> None:
    u = urllib.parse.urlparse(url)
    if u.scheme != "https":
        raise RuntimeError("WEIGHTS_URL_NOT_HTTPS")
    host = (u.hostname or "").lower()
    if host not in {"github.com", "objects.githubusercontent.com", "raw.githubusercontent.com"}:
        raise RuntimeError(f"WEIGHTS_HOST_NOT_ALLOWED: {host}")

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    tmp_path = dest_path + f".tmp_{uuid.uuid4().hex}"
    max_bytes = 250 * 1024 * 1024

    h = hashlib.sha256()
    got = 0
    with urllib.request.urlopen(url, timeout=60) as r:
        with open(tmp_path, "wb") as w:
            while True:
                chunk = r.read(1024 * 1024)
                if not chunk:
                    break
                got += len(chunk)
                if got > max_bytes:
                    raise RuntimeError("WEIGHTS_TOO_LARGE")
                if sha256_hex:
                    h.update(chunk)
                w.write(chunk)

    if sha256_hex:
        digest = h.hexdigest().lower()
        if digest != sha256_hex.lower():
            raise RuntimeError("WEIGHTS_SHA256_MISMATCH")

    try:
        os.replace(tmp_path, dest_path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


_upsampler_lock = threading.Lock()
_upsampler_cache: Dict[str, object] = {}


def _build_upsampler():
    model_name = os.environ.get("REALESRGAN_MODEL", "RealESRGAN_x4plus").strip()
    model_path_env = os.environ.get("REALESRGAN_MODEL_PATH", "").strip()
    weights_dir = os.environ.get("REALESRGAN_WEIGHTS_DIR", "").strip()
    auto_download = parse_bool(os.environ.get("REALESRGAN_AUTO_DOWNLOAD", ""))
    expected_sha256 = os.environ.get("REALESRGAN_MODEL_SHA256", "").strip() or None

    try:
        tile = int(os.environ.get("REALESRGAN_TILE", "0"))
    except Exception:
        tile = 0
    tile = max(0, min(2048, tile))

    if model_path_env:
        model_path = model_path_env
    else:
        if not weights_dir:
            weights_dir = os.path.join(os.path.dirname(__file__), "weights")
        filename = f"{model_name}.pth"
        model_path = os.path.join(weights_dir, filename)
        if not os.path.exists(model_path):
            if not auto_download:
                raise RuntimeError(f"REALESRGAN_WEIGHTS_NOT_FOUND: {model_path}")
            url = _safe_model_url_for_name(model_name)
            _download_file_https(url, model_path, expected_sha256)

    if not os.path.exists(model_path):
        raise RuntimeError(f"REALESRGAN_WEIGHTS_NOT_FOUND: {model_path}")

    import torch
    import cv2
    from realesrgan import RealESRGANer
    from realesrgan.archs.rrdbnet_arch import RRDBNet
    from realesrgan.archs.srvgg_arch import SRVGGNetCompact

    device = "cuda" if torch.cuda.is_available() else "cpu"
    half = bool(torch.cuda.is_available())

    if model_name == "RealESRGAN_x4plus":
        scale = 4
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    elif model_name == "RealESRGAN_x4plus_anime_6B":
        scale = 4
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=6, num_grow_ch=32, scale=4)
    elif model_name == "RealESRGAN_x2plus":
        scale = 2
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
    elif model_name == "realesr-animevideov3":
        scale = 4
        model = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=16, upscale=4, act_type="prelu")
    else:
        raise RuntimeError(f"REALESRGAN_MODEL_NOT_SUPPORTED: {model_name}")

    upsampler = RealESRGANer(
        scale=scale,
        model_path=model_path,
        model=model,
        tile=tile,
        tile_pad=10,
        pre_pad=0,
        half=half,
        device=device,
    )
    return upsampler


def get_upsampler():
    key = "|".join([
        os.environ.get("REALESRGAN_MODEL", "RealESRGAN_x4plus").strip(),
        os.environ.get("REALESRGAN_MODEL_PATH", "").strip(),
        os.environ.get("REALESRGAN_WEIGHTS_DIR", "").strip(),
        os.environ.get("REALESRGAN_TILE", "0").strip(),
        os.environ.get("REALESRGAN_AUTO_DOWNLOAD", "").strip().lower(),
    ])
    with _upsampler_lock:
        if key in _upsampler_cache:
            return _upsampler_cache[key]
        up = _build_upsampler()
        _upsampler_cache[key] = up
        return up


def run_realesrgan_bytes(raw: bytes) -> bytes:
    import cv2
    import numpy as np

    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError("DECODE_FAILED")

    upsampler = get_upsampler()
    out, _ = upsampler.enhance(img, outscale=None)
    ok, enc = cv2.imencode(".png", out)
    if not ok:
        raise RuntimeError("ENCODE_FAILED")
    return enc.tobytes()


@app.post("/upscale")
async def upscale(file: UploadFile = File(...)):
    ct = (file.content_type or "").lower().strip()
    if ct not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=415, detail="UNSUPPORTED_FORMAT")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="EMPTY_FILE")
    inspect_image(raw)

    ext = "png"
    if ct == "image/jpeg":
        ext = "jpg"
    elif ct == "image/webp":
        ext = "webp"

    base = tempfile.gettempdir()
    input_path = os.path.join(base, f"input_{uuid.uuid4()}.{ext}")
    output_path = os.path.join(base, f"output_{uuid.uuid4()}.png")
    try:
        script = os.environ.get("REALESRGAN_SCRIPT", "").strip()
        if script:
            with open(input_path, "wb") as f:
                f.write(raw)
            run_realesrgan(input_path, output_path)
            if not os.path.exists(output_path):
                raise HTTPException(status_code=502, detail="NO_OUTPUT")
            with open(output_path, "rb") as f:
                out = f.read()
        else:
            out = run_realesrgan_bytes(raw)
        if not out:
            raise HTTPException(status_code=502, detail="EMPTY_OUTPUT")
        return Response(content=out, media_type="image/png", headers={"Cache-Control": "no-store"})
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "REALESRGAN_WEIGHTS_NOT_FOUND" in msg or "REALESRGAN_MODEL_NOT_SUPPORTED" in msg:
            raise HTTPException(status_code=503, detail=msg)
        if "REALESRGAN_SCRIPT_NOT_FOUND" in msg:
            raise HTTPException(status_code=503, detail=msg)
        raise HTTPException(status_code=500, detail=msg)
    finally:
        try:
            if os.path.exists(input_path):
                os.remove(input_path)
        except Exception:
            pass
        try:
            if os.path.exists(output_path):
                os.remove(output_path)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "7861"))
    uvicorn.run("service:app", host=host, port=port, reload=False)
