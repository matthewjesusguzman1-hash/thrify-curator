"""
Re-crop the 24 ELP signs from the higher-quality PNG reference, without
aggressive upscaling so the original pixel sharpness is preserved. Apply only
a mild unsharp pass to bring back any remaining edge softness.
"""
from PIL import Image, ImageFilter
import numpy as np
import os

SRC = "/tmp/attach_b_v2.png"
OUT = "/app/frontend/public/elp-signs"
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert("RGB")
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
# In this PNG the title text is too thin to register as its own row, so all
# detected runs are sign rows. Keep them all.
print(f"{len(y_runs)} sign rows detected (expected 6)")

MARGIN = 12  # generous breathing room so no sign border ever clips
sid = 1
for ri, (y0, y1) in enumerate(y_runs):
    band = ink[y0:y1]
    col_density = band.sum(axis=0)
    x_runs = runs(col_density > ((y1 - y0) * 0.05), min_gap=20, min_len=40)
    if len(x_runs) != 4:
        print(f"⚠ Row {ri+1}: detected {len(x_runs)} columns")
    for x0, x1 in x_runs:
        cell = ink[y0:y1, x0:x1]
        row_w = cell.sum(axis=1)
        thresh = max(2, int((x1 - x0) * 0.10))
        keep_rows = np.where(row_w >= thresh)[0]
        if len(keep_rows) == 0:
            cy0, cy1 = 0, y1 - y0
            bottom_safe = MARGIN
        else:
            cy0 = keep_rows[0]; cy1 = keep_rows[-1] + 1
            # Detect the gap between sign body and the caption numeral.
            gaps = np.where(np.diff(keep_rows) > 4)[0]
            if len(gaps):
                gap_idx = gaps[-1]
                body_end = keep_rows[gap_idx] + 1
                caption_start = keep_rows[gap_idx + 1]
                cy1 = body_end
                # Bottom margin is whichever is smaller: standard MARGIN or
                # half the gap to the caption (so the caption never enters).
                bottom_safe = max(0, min(MARGIN, (caption_start - body_end) // 2))
            else:
                bottom_safe = MARGIN
        col_h = cell.sum(axis=0)
        keep_cols = np.where(col_h >= 2)[0]
        cx0 = keep_cols[0] if len(keep_cols) else 0
        cx1 = keep_cols[-1] + 1 if len(keep_cols) else (x1 - x0)

        # The caption numeral often sits BELOW the detected row band — outside
        # `cell`. Peek at the source pixels in the column range immediately
        # below the band and clip the bottom margin so the caption is never
        # included.
        abs_body_end = y0 + cy1
        look_ahead = ink[abs_body_end : min(H, abs_body_end + MARGIN + 4),
                         x0 + cx0 : x0 + cx1]
        if look_ahead.size > 0:
            # Caption numerals are narrow (1-2 digits, ~5-15 ink pixels per
            # row). Use a low absolute threshold so they trigger detection
            # even when the column range is much wider than the caption.
            caption_rows_below = look_ahead.sum(axis=1) >= 4
            if caption_rows_below.any():
                first_caption_offset = int(np.where(caption_rows_below)[0][0])
                # Keep 1 px clear above the caption.
                bottom_safe = max(0, min(bottom_safe, first_caption_offset - 1))

        L = max(0, x0 + cx0 - MARGIN)
        T = max(0, y0 + cy0 - MARGIN)
        R = min(W, x0 + cx1 + MARGIN)
        B = min(H, y0 + cy1 + bottom_safe)
        crop = src.crop((L, T, R, B))
        # Mild unsharp ONLY (no upscale) — keeps original PNG sharpness.
        crop = crop.filter(ImageFilter.UnsharpMask(radius=0.8, percent=80, threshold=2))
        path = f"{OUT}/sign-{sid}.png"
        crop.save(path, "PNG", optimize=True)
        print(f"#{sid:2d} -> {crop.size[0]}x{crop.size[1]}")
        sid += 1
        if sid > 24: break
    if sid > 24: break

print(f"Done. {sid - 1} signs in {OUT}")
