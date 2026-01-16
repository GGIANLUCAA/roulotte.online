import gradio as gr
import subprocess
import uuid
import os
import tempfile


def upscale(image):
    base = tempfile.gettempdir()
    input_path = os.path.join(base, f"input_{uuid.uuid4()}.png")
    output_path = os.path.join(base, f"output_{uuid.uuid4()}.png")
    image.save(input_path)
    script = os.environ.get("REALESRGAN_SCRIPT", "inference_realesrgan.py")
    model = os.environ.get("REALESRGAN_MODEL", "RealESRGAN_x4plus")
    subprocess.run(
        ["python", script, "-n", model, "-i", input_path, "-o", output_path],
        check=True,
    )
    return output_path


gr.Interface(
    fn=upscale,
    inputs=gr.Image(type="pil"),
    outputs=gr.Image(),
    title="AI Migliora Foto Roulotte",
).launch()
