"""
Auto-detect each of the 24 signs in the agency Attachment B chart by
projecting non-background pixels onto the X and Y axes, then segmenting
runs of non-background.

Approach:
  1. Convert to grayscale and binarize: any pixel sufficiently darker than
     near-white (i.e. anywhere a sign element is drawn) becomes "ink".
  2. Sum ink pixels along Y to find horizontal stripes of content (rows of
     signs). Six rows expected, plus a header "Attachment B" stripe at top.
  3. For each row, sum ink along X within that band to find columns
     containing signs (4 expected per row).
  4. Bounding box for each sign = intersection of row band + column band,
     trimmed to the actual ink extent.
  5. Add a small white margin (~6 px) around each sign to keep the border
     visible, save as sign-{N}.png.
"""
from PIL import Image
import numpy as np
import os

SRC = "/tmp/attach_b.jpeg"
OUT = "/app/frontend/public/elp-signs"
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert("RGB")
W, H = src.size
arr = np.array(src.convert("L"))      # grayscale
# Treat anything < 230 as "ink" (sign element / colored fill / black border).
ink = (arr < 230).astype(np.uint8)

def runs(mask, min_gap=6, min_len=20):
    """Return list of (start, end) runs of consecutive True values."""
    out = []
    inside = False
    s = 0
    for i, v in enumerate(mask):
        if v and not inside:
            inside = True; s = i
        elif not v and inside:
            inside = False
            if i - s >= min_len: out.append((s, i))
    if inside and len(mask) - s >= min_len:
        out.append((s, len(mask)))
    # Merge runs separated by < min_gap
    merged = []
    for r in out:
        if merged and r[0] - merged[-1][1] < min_gap:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)
    return merged

# Sum ink along X for each Y → identify horizontal sign rows.
row_density = ink.sum(axis=1)
row_mask = row_density > (W * 0.02)         # row contains at least 2% ink
y_runs = runs(row_mask, min_gap=15, min_len=40)

# The first detected band IS the title "Attachment B…" header (very thin
# ~25-30 px). Detect it by height and drop it; everything else is a sign row.
if y_runs and (y_runs[0][1] - y_runs[0][0]) < 60:
    header = y_runs[0]
    print(f"Header band {header} (h={header[1]-header[0]}) — dropped.")
    y_runs = y_runs[1:]
else:
    print("No thin header band detected — keeping all rows.")
print(f"Detected {len(y_runs)} sign rows (expected 6):")
for r in y_runs: print(" ", r, " h=", r[1]-r[0])

if len(y_runs) != 6:
    print("⚠ Row detection off — keeping but may need manual adjust.")

# For each row, find 4 columns of signs.
sign_id = 1
crops = []
for ri, (y0, y1) in enumerate(y_runs):
    band = ink[y0:y1]
    col_density = band.sum(axis=0)
    col_mask = col_density > ((y1 - y0) * 0.05)
    x_runs = runs(col_mask, min_gap=20, min_len=40)
    if len(x_runs) != 4:
        print(f"⚠ Row {ri+1}: detected {len(x_runs)} columns (expected 4): {x_runs}")
    # Take exactly 4 widest if more, else what we have.
    for x0, x1 in x_runs:
        # Tight crop around actual ink in the cell.
        cell = ink[y0:y1, x0:x1]
        # Trim caption (small numerals at the bottom of each cell): find rows
        # in the cell that have substantial ink and ignore the bottom-most
        # narrow stripe (caption numbers are short, < ~8% of the cell width).
        row_w = cell.sum(axis=1)
        thresh = max(2, int((x1 - x0) * 0.10))
        keep_rows = np.where(row_w >= thresh)[0]
        if len(keep_rows) == 0:
            cy0, cy1 = 0, y1 - y0
        else:
            cy0 = keep_rows[0]; cy1 = keep_rows[-1] + 1
            # If there is a gap > 6 px at the bottom (between sign body and
            # caption), drop the post-gap segment.
            gaps = np.where(np.diff(keep_rows) > 6)[0]
            if len(gaps):
                cy1 = keep_rows[gaps[-1]] + 1
        # Trim left/right to ink as well
        col_h = cell.sum(axis=0)
        keep_cols = np.where(col_h >= 2)[0]
        cx0 = keep_cols[0] if len(keep_cols) else 0
        cx1 = keep_cols[-1] + 1 if len(keep_cols) else (x1 - x0)
        # Add 6 px white margin
        margin = 6
        L = max(0, x0 + cx0 - margin)
        T = max(0, y0 + cy0 - margin)
        R = min(W, x0 + cx1 + margin)
        B = min(H, y0 + cy1 + margin)
        crops.append((sign_id, L, T, R, B))
        sign_id += 1
    if sign_id > 24:
        break

print(f"\nTotal crops: {len(crops)}")
for sid, L, T, R, B in crops:
    crop = src.crop((L, T, R, B))
    path = f"{OUT}/sign-{sid}.png"
    crop.save(path, "PNG", optimize=True)
    print(f"#{sid:2d} -> {crop.size[0]}x{crop.size[1]} from ({L},{T},{R},{B})")
