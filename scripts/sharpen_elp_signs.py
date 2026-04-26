"""
Sharpen + upscale the 24 cropped ELP signs so they don't look fuzzy when the
viewer renders them at 300px+ or fullscreen on a phone.

Pipeline:
  1. Load the source crop.
  2. Upscale 2× with LANCZOS resampling (high-quality, preserves edges).
  3. Apply a moderate UnsharpMask to bring back edge contrast lost in the
     original JPEG compression and the upscale.
  4. Save back to the same path as PNG (lossless).
"""
from PIL import Image, ImageFilter
import os, glob

SIGN_DIR = "/app/frontend/public/elp-signs"
files = sorted(glob.glob(f"{SIGN_DIR}/sign-*.png"))

for f in files:
    im = Image.open(f).convert("RGB")
    w, h = im.size
    # 2× upscale with high-quality resampling
    im = im.resize((w * 2, h * 2), Image.LANCZOS)
    # Unsharp mask: radius 1.2, strong percent, low threshold for clean edges
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=140, threshold=2))
    im.save(f, "PNG", optimize=True)
    print(f"{os.path.basename(f)} -> {im.size[0]}x{im.size[1]}")

print(f"\nDone. {len(files)} signs sharpened in {SIGN_DIR}")
