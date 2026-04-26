"""
4× upscale + strong unsharp + larger margin so signs are crisp at fullscreen
640px display size with no further browser upscaling.
"""
from PIL import Image, ImageFilter
import os, glob

# Re-derive the crops from the original chart at 4× the original resolution
# so the saved PNGs are roughly 600-800px wide (no more browser upscaling).

SRC_PATH = "/tmp/attach_b.jpeg"
OUT = "/app/frontend/public/elp-signs"

# Same auto-detect crop boxes from auto_crop_elp_signs.py — cached here.
import numpy as np
src = Image.open(SRC_PATH).convert("RGB")
W, H = src.size
arr = np.array(src.convert("L"))
ink = (arr < 230).astype(np.uint8)

def runs(mask, min_gap=6, min_len=20):
    out = []; inside = False; s = 0
    for i, v in enumerate(mask):
        if v and not inside: inside = True; s = i
        elif not v and inside:
            inside = False
            if i - s >= min_len: out.append((s, i))
    if inside and len(mask) - s >= min_len: out.append((s, len(mask)))
    merged = []
    for r in out:
        if merged and r[0] - merged[-1][1] < min_gap:
            merged[-1] = (merged[-1][0], r[1])
        else: merged.append(r)
    return merged

row_density = ink.sum(axis=1)
y_runs = runs(row_density > (W * 0.02), min_gap=15, min_len=40)
if y_runs and (y_runs[0][1] - y_runs[0][0]) < 60: y_runs = y_runs[1:]
print(f"{len(y_runs)} sign rows detected")

MARGIN = 10  # bigger white border so nothing looks cut off
sid = 1
for ri, (y0, y1) in enumerate(y_runs):
    band = ink[y0:y1]
    col_density = band.sum(axis=0)
    x_runs = runs(col_density > ((y1 - y0) * 0.05), min_gap=20, min_len=40)
    for x0, x1 in x_runs:
        cell = ink[y0:y1, x0:x1]
        row_w = cell.sum(axis=1)
        thresh = max(2, int((x1 - x0) * 0.10))
        keep_rows = np.where(row_w >= thresh)[0]
        if len(keep_rows) == 0:
            cy0, cy1 = 0, y1 - y0
        else:
            cy0 = keep_rows[0]; cy1 = keep_rows[-1] + 1
            gaps = np.where(np.diff(keep_rows) > 6)[0]
            if len(gaps): cy1 = keep_rows[gaps[-1]] + 1
        col_h = cell.sum(axis=0)
        keep_cols = np.where(col_h >= 2)[0]
        cx0 = keep_cols[0] if len(keep_cols) else 0
        cx1 = keep_cols[-1] + 1 if len(keep_cols) else (x1 - x0)
        L = max(0, x0 + cx0 - MARGIN)
        T = max(0, y0 + cy0 - MARGIN)
        R = min(W, x0 + cx1 + MARGIN)
        B = min(H, y0 + cy1 + MARGIN)
        crop = src.crop((L, T, R, B))
        # 4× upscale with high-quality LANCZOS resampling.
        crop = crop.resize((crop.size[0] * 4, crop.size[1] * 4), Image.LANCZOS)
        # Strong unsharp mask to compensate JPEG softness + interpolation blur.
        crop = crop.filter(ImageFilter.UnsharpMask(radius=1.8, percent=200, threshold=2))
        # A second mild pass tightens the edges further.
        crop = crop.filter(ImageFilter.UnsharpMask(radius=0.7, percent=80, threshold=1))
        path = f"{OUT}/sign-{sid}.png"
        crop.save(path, "PNG", optimize=True)
        print(f"#{sid:2d} -> {crop.size[0]}x{crop.size[1]}")
        sid += 1
        if sid > 24: break
    if sid > 24: break

print(f"Done. {sid - 1} signs at 4× resolution in {OUT}")
