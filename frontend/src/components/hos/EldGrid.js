import { hmToMin, padDay, STATUS_META, minToHm } from "../../lib/hosRules";
import { useEffect, useRef } from "react";

/**
 * EldGrid — roadside-accurate ELD log grid (4 rows × 24 hrs with qtr-hour ticks,
 * stepped duty-status trace, and totals column).
 *
 * Props:
 *   entries           Array<{status, start, end}>  duty status entries, any order
 *   compact           bool — smaller dims for dashboard drills
 *   highlightMinute   number | null — overlay a red vertical marker at this minute
 *   onMinuteClick     (minute) => void — enables tap-to-mark interactive mode
 *   markedMinute      number | null — user-placed flag (different color than highlight)
 *   brackets          Array<{startMin, endMin, label?, color?}> — pairs of corner
 *                     brackets drawn ABOVE the grid to call out a counted span
 *                     (e.g. the 14-hr window, 8-hr driving block, on-duty segment)
 *   shade             Array<{startMin, endMin, color?}> — soft column shading
 *                     across all rows to accent a region of the log
 *   selectableIndices Array<int> — entry indices the user may click to select
 *                     (shown with a subtle hover outline)
 *   selectedIndices   Array<int> — currently selected entry indices
 *   onEntryClick      (idx) => void — callback when a selectable block is tapped
 *   blockMarks        { [idx]: 'correct' | 'wrong' | 'missed' } — reveal state
 *   shiftMarkers      Array<{min, label, color?, kind?, labelRow?}> — vertical
 *                     dashed markers (e.g. "SHIFT START", "SHIFT END") drawn
 *                     across the duty rows with a labeled flag below the grid.
 *                     kind: 'start' | 'end' | 'continues'.
 *                     labelRow: 0 | 1 — stack label on row 0 (default) or row 1
 *                     (prevents text overlap when two markers share a minute).
 */
/** Like padDay() but stops padding at `truncateMin` instead of 24:00 — used
 *  for in-progress days (e.g. a roadside inspection moment) where there are
 *  no log entries yet past the inspection time. */
function padDayUpTo(entries, truncateMin) {
  const out = [];
  const sorted = [...entries].sort((a, b) => hmToMin(a.start) - hmToMin(b.start));
  let cursor = 0;
  for (const e of sorted) {
    const s = hmToMin(e.start);
    if (s >= truncateMin) break;
    if (s > cursor) out.push({ status: "OFF", start: minToHm(cursor), end: minToHm(s) });
    const eMin = Math.min(hmToMin(e.end), truncateMin);
    out.push({ ...e, end: minToHm(eMin) });
    cursor = eMin;
    if (cursor >= truncateMin) break;
  }
  // Don't pad past truncateMin — the rest of the day is "future" / not logged.
  return out;
}

export function EldGrid({ entries, compact = false, highlightMinute = null, onMinuteClick = null, markedMinute = null, brackets = [], shade = [], selectableIndices = [], selectedIndices = [], onEntryClick = null, blockMarks = {}, shiftMarkers = [], onMarkerDrag = null, truncateAtMin = null }) {
  // Dimensions match the original Split Sleeper Trainer grid the user is
  // accustomed to. The SVG renders at NATURAL pixel size (width={svgW},
  // height={svgH}); the wrapper has overflow-x-auto so narrow phones get a
  // horizontal scroll instead of a shrunken grid.
  const HOUR_W = compact ? 20 : 28;
  const ROW_H = compact ? 26 : 32;
  const LABEL_W = compact ? 62 : 74;
  const TOTAL_W = compact ? 66 : 76;
  const HEADER_H = compact ? 18 : 22;
  const HOURS = 24;

  // Assign each bracket to a label row, pushing colliding labels down to a
  // second (or third) row so two narrow adjacent brackets — e.g. "2.5h OFF ✓"
  // next to "Counted · 0.5h D" — never overlap into unreadable mush.
  const BRACKET_FONT = compact ? 8.5 : 9.5;
  const BRACKET_ROW_H = compact ? 11 : 12;
  const bracketRows = (() => {
    if (!brackets || brackets.length === 0) return [];
    // Approx label width: average glyph ≈ 0.55 × font-size, plus 8px padding.
    const labelSpan = (b) => {
      const w = (b.label || "").length * BRACKET_FONT * 0.55 + 8;
      const cx = LABEL_W + ((b.startMin + b.endMin) / 2 / 60) * HOUR_W;
      return { cx, left: cx - w / 2, right: cx + w / 2 };
    };
    const rowEnds = []; // rightmost label-right per row
    return brackets.map((b) => {
      const { left, right } = labelSpan(b);
      let row = 0;
      while (row < rowEnds.length && rowEnds[row] > left) row++;
      rowEnds[row] = right;
      return row;
    });
  })();
  const bracketRowCount = bracketRows.length ? Math.max(...bracketRows) + 1 : 0;
  // Bracket band height: base bar (14) + one row of label (BRACKET_ROW_H) per
  // extra stacked row beyond the first. First row labels still sit above the
  // bar like before; additional rows stack above that.
  const BRACKET_H = bracketRowCount > 0 ? 14 + bracketRowCount * BRACKET_ROW_H : 0;
  // Flag band — sits ABOVE the hour-numbers header so the START/END chips
  // never cover the time labels (00, 01, 02, ...). Reserved only when there
  // are actually shift markers to draw.
  const FLAG_BAND_H = shiftMarkers && shiftMarkers.length > 0 ? 18 : 0;

  // Auto-stack the post-grid labels: respect each marker's preferred labelRow,
  // but if its label horizontally collides with another already on that row,
  // push it down one row at a time until it fits.
  const SHIFT_LABEL_FONT = compact ? 9 : 10;
  const shiftLabelRows = (() => {
    if (!shiftMarkers || shiftMarkers.length === 0) return [];
    const rowEnds = {}; // row -> rightmost x already used
    return shiftMarkers.map((sm) => {
      const txt = sm.label || "";
      const w = txt.length * SHIFT_LABEL_FONT * 0.55 + 8;
      const cx = LABEL_W + (sm.min / 60) * HOUR_W;
      const left = cx - w / 2;
      const right = cx + w / 2;
      let row = sm.labelRow || 0;
      while ((rowEnds[row] !== undefined) && rowEnds[row] > left) row++;
      rowEnds[row] = right;
      return row;
    });
  })();
  const maxLabelRow = shiftLabelRows.length ? Math.max(...shiftLabelRows) : 0;
  const MARKER_LABEL_H = shiftMarkers && shiftMarkers.length > 0 ? 14 + maxLabelRow * 12 : 0;
  const gridW = HOURS * HOUR_W;
  const svgW = LABEL_W + gridW + TOTAL_W;
  const svgH = BRACKET_H + FLAG_BAND_H + HEADER_H + 4 * ROW_H + 12 + MARKER_LABEL_H;

  const ROWS = ["OFF", "SB", "D", "OD"].map((k) => STATUS_META[k]);
  const rowIdx = (k) => ROWS.findIndex((r) => r.key === k);
  const rowY = (k) => HEADER_H + rowIdx(k) * ROW_H + ROW_H / 2;
  const xFor = (hm) => LABEL_W + (hmToMin(hm) / 60) * HOUR_W;
  const xForMin = (m) => LABEL_W + (m / 60) * HOUR_W;

  // For truncated days (in-progress, e.g. roadside-inspection moment) only
  // pad up to the truncation minute. Entries past that point should remain
  // visually empty (overlaid with a hatched "in progress" stripe).
  const padded = (truncateAtMin !== null && truncateAtMin !== undefined)
    ? padDayUpTo(entries, truncateAtMin)
    : padDay(entries);
  const totals = { OFF: 0, SB: 0, D: 0, OD: 0 };
  for (const e of padded) {
    const d = hmToMin(e.end) - hmToMin(e.start);
    if (d > 0 && totals[e.status] !== undefined) totals[e.status] += d;
  }

  // Stepped trace
  const pts = [];
  padded.forEach((e, i) => {
    const y = rowY(e.status);
    pts.push([xFor(e.start), y]);
    pts.push([xFor(e.end), y]);
    if (i < padded.length - 1) pts.push([xFor(e.end), rowY(padded[i + 1].status)]);
  });
  const traceStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const handleSvgClick = (ev) => {
    if (!onMinuteClick) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const scale = svgW / rect.width;
    const x = (ev.clientX - rect.left) * scale - LABEL_W;
    if (x < 0 || x > gridW) return;
    // Snap to nearest 15-min
    const min = Math.round((x / HOUR_W) * 4) * 15;
    const clamped = Math.max(0, Math.min(24 * 60, min));
    onMinuteClick(clamped);
  };

  // Drag support for shift markers flagged with draggable:true. We snap to
  // 15-min intervals so the markers move in tidy quarter-hour steps, matching
  // the scenario examples (which are all on 15-min boundaries).
  const handleMarkerPointerMove = (ev, sm) => {
    if (!onMarkerDrag) return;
    const svg = ev.currentTarget.ownerSVGElement || ev.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scale = svgW / rect.width;
    const x = (ev.clientX - rect.left) * scale - LABEL_W;
    const min = Math.round((x / HOUR_W) * 4) * 15;
    const clamped = Math.max(0, Math.min(24 * 60, min));
    onMarkerDrag(sm.kind, sm.markerId, clamped);
  };

  const totalHm = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  const totalAll = totals.OFF + totals.SB + totals.D + totals.OD;

  const hasDraggable = shiftMarkers.some((m) => m.draggable) && !!onMarkerDrag;

  // While a marker is being dragged we attach a non-passive document-level
  // touchmove listener that calls preventDefault — this is what actually
  // stops mobile browsers (especially iOS Safari) from translating a
  // horizontal drag inside the SVG into a vertical page scroll. React's
  // onTouchMove is forced passive and can't preventDefault on its own.
  const draggingRef = useRef(false);
  useEffect(() => {
    if (!hasDraggable) return undefined;
    const block = (ev) => {
      if (draggingRef.current) ev.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [hasDraggable]);

  return (
    <div className="rounded-lg border border-[#CBD5E1] bg-white">
      {/* Natural-pixel grid (matches the original Split Sleeper Trainer size).
          maxWidth:100% + height:auto on the SVG itself means: on wide screens
          (container >= svgW), it renders at natural 822×162 — exactly the
          trainer's size; on narrower screens it scales down proportionally so
          nothing ever runs off the page. No horizontal scroll. */}
      <div className="px-1">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block"
        style={{
          maxWidth: "100%",
          height: "auto",
          cursor: onMinuteClick && !hasDraggable ? "crosshair" : "default",
          touchAction: hasDraggable ? "none" : "auto",
        }}
        onClick={hasDraggable ? undefined : handleSvgClick}
      >
        {/* Brackets above the grid — call out spans the rule cares about.
         * `bracketRows[i]` tells us which vertical row to place the label on
         * so adjacent narrow brackets don't collide. Row 0 sits just above
         * the bar; row 1/2 stack above that. */}
        {brackets.map((b, i) => {
          const x1 = xForMin(b.startMin);
          const x2 = xForMin(b.endMin);
          const color = b.color || "#002855";
          const barY = BRACKET_H - 4; // bar hugs the bottom of the band
          const row = bracketRows[i] || 0;
          const labelY = barY - 6 - row * BRACKET_ROW_H;
          return (
            <g key={`br${i}`}>
              <line x1={x1} y1={barY} x2={x2} y2={barY} stroke={color} strokeWidth="1.8" />
              <line x1={x1} y1={barY} x2={x1} y2={BRACKET_H - 1} stroke={color} strokeWidth="1.8" />
              <line x1={x2} y1={barY} x2={x2} y2={BRACKET_H - 1} stroke={color} strokeWidth="1.8" />
              {b.label && (
                <text x={(x1 + x2) / 2} y={labelY} textAnchor="middle" fontSize={BRACKET_FONT} fontWeight="700" fill={color} fontFamily="sans-serif">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}

        <g transform={`translate(0, ${BRACKET_H + FLAG_BAND_H})`}>
        {/* Shaded spans — soft column overlay across all duty rows */}
        {shade.map((s, i) => {
          const x = xForMin(s.startMin);
          const w = Math.max(0, xForMin(s.endMin) - x);
          return (
            <rect key={`sh${i}`} x={x} y={HEADER_H} width={w} height={4 * ROW_H} fill={s.color || "#D4AF37"} opacity="0.16" />
          );
        })}
        {/* Hour labels — military time (00-23). Hide 24 to prevent crowding the
         * right edge; the 23 label suffices to convey end-of-day. */}
        {Array.from({ length: HOURS + 1 }).map((_, h) => {
          const x = LABEL_W + h * HOUR_W;
          const label = h === 24 ? "" : String(h).padStart(2, "0");
          return (
            <text key={`h${h}`} x={x} y={12} textAnchor="middle" fontSize={compact ? "8" : "9"} fill="#475569" fontFamily="sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{label}</text>
          );
        })}

        {/* Row backgrounds + labels + totals */}
        {ROWS.map((r, i) => {
          const y = HEADER_H + i * ROW_H;
          const tm = totals[r.key];
          const h = Math.floor(tm / 60), m = tm % 60;
          return (
            <g key={r.key}>
              <rect x={LABEL_W} y={y} width={gridW} height={ROW_H} fill={r.color} />
              <text x={LABEL_W - 6} y={y + ROW_H / 2 + 3.5} textAnchor="end" fontSize={compact ? "9" : "10"} fontWeight="700" fill="#1E293B">
                {compact ? r.short : r.label}
              </text>
              <rect x={LABEL_W + gridW + 2} y={y + 3} width={TOTAL_W - 6} height={ROW_H - 6} fill="#FFFFFF" stroke="#CBD5E1" rx={2} />
              <text x={LABEL_W + gridW + TOTAL_W / 2} y={y + ROW_H / 2 + 4} textAnchor="middle" fontSize={compact ? "12" : "13"} fontWeight="700" fill="#002855" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" data-testid={`svg-total-${r.key}`}>
                {`${h}:${String(m).padStart(2, "0")}`}
              </text>
            </g>
          );
        })}

        {/* TOTAL column header */}
        <text x={LABEL_W + gridW + TOTAL_W / 2} y={HEADER_H - 6} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="800" fill="#002855" fontFamily="sans-serif">TOTAL</text>

        {/* In-progress overlay — for truncated days (e.g. roadside-inspection
            moment), stripe the unfilled portion of the day so it visually
            reads "no log entries past this minute". A vertical "now" line
            marks the inspection moment. */}
        {(truncateAtMin !== null && truncateAtMin !== undefined) && (() => {
          const xCut = xForMin(truncateAtMin);
          const xRight = LABEL_W + gridW;
          const w = Math.max(0, xRight - xCut);
          return (
            <g key="truncate-overlay">
              <defs>
                <pattern id="truncate-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="#94A3B8" fillOpacity="0.22" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#64748B" strokeWidth="1.2" strokeOpacity="0.55" />
                </pattern>
              </defs>
              <rect x={xCut} y={HEADER_H} width={w} height={4 * ROW_H} fill="url(#truncate-stripes)" />
              <line x1={xCut} y1={HEADER_H - 2} x2={xCut} y2={HEADER_H + 4 * ROW_H + 4} stroke="#0EA5E9" strokeWidth="1.6" strokeDasharray="3 2" />
              <rect x={xCut + 2} y={HEADER_H - 14} width={compact ? 78 : 96} height={12} rx={2} fill="#0EA5E9" />
              <text x={xCut + (compact ? 41 : 50)} y={HEADER_H - 4} textAnchor="middle" fontSize={compact ? "8.5" : "9.5"} fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif">INSPECTION · {minToHm(truncateAtMin)}</text>
            </g>
          );
        })()}

        {/* Hour gridlines */}
        {Array.from({ length: HOURS + 1 }).map((_, h) => {
          const x = LABEL_W + h * HOUR_W;
          return (
            <line key={`g${h}`} x1={x} y1={HEADER_H} x2={x} y2={HEADER_H + 4 * ROW_H} stroke="#1E293B" strokeWidth={h % 6 === 0 ? 0.8 : 0.35} opacity="0.55" />
          );
        })}

        {/* Quarter-hour ticks */}
        {Array.from({ length: HOURS }).map((_, h) => {
          const baseX = LABEL_W + h * HOUR_W;
          return ROWS.map((r, ri) => {
            const topY = HEADER_H + ri * ROW_H;
            return [1, 2, 3].map((q) => {
              const x = baseX + (HOUR_W / 4) * q;
              const len = q === 2 ? 5 : 3;
              return <line key={`t${h}-${ri}-${q}`} x1={x} y1={topY} x2={x} y2={topY + len} stroke="#1E293B" strokeWidth={0.5} opacity="0.6" />;
            });
          });
        })}

        {/* Trace */}
        {pts.length > 0 && (
          <polyline points={traceStr} fill="none" stroke="#002855" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
        )}

        {/* Selectable entry overlays — clickable rects over rest blocks */}
        {selectableIndices.length > 0 && entries.map((e, idx) => {
          if (!selectableIndices.includes(idx)) return null;
          const x = xFor(e.start);
          const w = xFor(e.end) - x;
          if (w <= 0) return null;
          const y = HEADER_H + rowIdx(e.status) * ROW_H;
          const selected = selectedIndices.includes(idx);
          const mark = blockMarks[idx];
          // Before user interaction, NO outline is drawn — the grid reads as a
          // normal roadside log. On tap, the block gets a solid selected fill.
          // After submission, blockMarks drive correct/wrong/missed reveal.
          const fill = mark === "correct" ? "#10B981" :
                       mark === "wrong"   ? "#DC2626" :
                       mark === "missed"  ? "#F59E0B" :
                       selected           ? "#2563EB" : "transparent";
          const fillOpacity = mark ? 0.45 : (selected ? 0.35 : 0);
          const strokeColor = mark === "correct" ? "#059669" :
                              mark === "wrong"   ? "#B91C1C" :
                              mark === "missed"  ? "#D97706" :
                              selected           ? "#1D4ED8" : "transparent";
          const strokeW = mark || selected ? 2.2 : 0;
          const strokeOpacity = mark || selected ? 1 : 0;
          return (
            <g key={`sel${idx}`} data-testid={`eld-entry-${idx}`} style={{ cursor: onEntryClick && !mark ? "pointer" : "default" }}
               onClick={(ev) => { if (onEntryClick && !mark) { ev.stopPropagation(); onEntryClick(idx); } }}>
              <rect x={x + 1} y={y + 2} width={Math.max(0, w - 2)} height={ROW_H - 4}
                fill={fill} fillOpacity={fillOpacity}
                stroke={strokeColor} strokeWidth={strokeW} strokeOpacity={strokeOpacity}
                rx={3} />
              {mark && (
                <text x={x + w / 2} y={y + ROW_H / 2 + 3.5} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="800" fill="#FFFFFF">
                  {mark === "correct" ? "✓" : mark === "wrong" ? "✕" : "!"}
                </text>
              )}
            </g>
          );
        })}

        {/* Shift boundary markers — unified rectangular badges + dashed bar */}
        {shiftMarkers.map((sm, i) => {
          const x = xForMin(sm.min);
          const isEnd = sm.kind === "end";
          const isContinues = sm.kind === "continues";
          const color = sm.color || (isEnd ? "#DC2626" : isContinues ? "#F59E0B" : "#10B981");
          const labelRow = shiftLabelRows[i] || 0;
          const labelY = HEADER_H + 4 * ROW_H + 22 + labelRow * 12;
          const flagText = isEnd ? "END" : isContinues ? "CONTINUES" : "START";
          const flagW = compact ? (flagText === "CONTINUES" ? 60 : 36) : (flagText === "CONTINUES" ? 74 : 44);
          const flagH = compact ? 11 : 13;
          // Flag chip sits ABOVE the hour-numbers header so it never covers
          // the time labels. y is negative inside the translated group, mapped
          // into the FLAG_BAND_H band reserved at the top of the SVG.
          const flagY = -(FLAG_BAND_H - 2);
          // Position: END opens to the LEFT of the line; START/CONTINUES opens to the RIGHT.
          // Clamp inside the grid so badges at 00:00 or 24:00 don't overflow.
          let badgeX = isEnd ? x - flagW : x;
          if (badgeX < LABEL_W) badgeX = LABEL_W;
          if (badgeX + flagW > LABEL_W + gridW) badgeX = LABEL_W + gridW - flagW;
          // Label alignment: clamp to 'start' for markers near the left edge,
          // 'end' for markers near the right edge, 'middle' otherwise — prevents
          // long pre-split labels at x=0 from clipping past the SVG bounds.
          const labelAnchor = sm.min < 60 ? "start" : (sm.min >= 23 * 60 ? "end" : "middle");
          return (
            <g key={`shift${i}`} data-testid={`shift-marker-${sm.kind || i}`}>
              {/* Dashed line spans from the flag chip (above the header) all
                  the way down through the duty rows. */}
              <line x1={x} y1={flagY + flagH} x2={x} y2={HEADER_H + 4 * ROW_H + 4} stroke={color} strokeWidth="2" strokeDasharray="5 3" />
              <rect x={badgeX} y={flagY} width={flagW} height={flagH} rx={2} fill={color} />
              <text x={badgeX + flagW / 2} y={flagY + flagH - 3} textAnchor="middle" fontSize={compact ? "8.5" : "9.5"} fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif" letterSpacing="0.3">{flagText}</text>
              <text x={x} y={labelY} textAnchor={labelAnchor} fontSize={compact ? "9" : "10"} fontWeight="700" fill={color}>{sm.label || `${isEnd ? "Shift end" : isContinues ? "Continues" : "Shift start"} · ${minToHm(sm.min)}`}</text>
              {/* Drag handle — wide invisible hit rect around the line. Shown
                  only when sm.draggable and onMarkerDrag are set, giving the
                  inspector a generous ~20px-wide zone to grab on mobile. */}
              {sm.draggable && onMarkerDrag && (
                <>
                  {/* visible grip circle on the header so the draggable state is obvious */}
                  <circle cx={x} cy={HEADER_H + 4 * ROW_H + 4} r={compact ? 5.5 : 7} fill={color} stroke="#FFFFFF" strokeWidth="2" />
                  {/* Generous hit zone (±22px) with a subtle tint so the inspector
                      can SEE the target and still tap anywhere on the column.
                      touch-action:none + pointer-events:all + explicit preventDefault
                      on touchstart/touchmove keeps the browser from stealing the
                      gesture as a page scroll. */}
                  <rect
                    x={x - 22}
                    y={flagY}
                    width={44}
                    height={HEADER_H + 4 * ROW_H + 14 - flagY}
                    fill={color}
                    fillOpacity="0.06"
                    stroke={color}
                    strokeOpacity="0.25"
                    strokeDasharray="2 3"
                    style={{ cursor: "ew-resize", touchAction: "none", pointerEvents: "all" }}
                    onPointerDown={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      draggingRef.current = true;
                      ev.currentTarget.setPointerCapture(ev.pointerId);
                      handleMarkerPointerMove(ev, sm);
                    }}
                    onPointerMove={(ev) => {
                      if (!ev.currentTarget.hasPointerCapture?.(ev.pointerId)) return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      handleMarkerPointerMove(ev, sm);
                    }}
                    onPointerUp={(ev) => {
                      draggingRef.current = false;
                      ev.currentTarget.releasePointerCapture?.(ev.pointerId);
                    }}
                    onPointerCancel={() => { draggingRef.current = false; }}
                    onTouchStart={(ev) => ev.preventDefault()}
                    onTouchMove={(ev) => ev.preventDefault()}
                    data-testid={`shift-marker-drag-${sm.kind || i}`}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Correct-answer highlight (red) */}
        {highlightMinute !== null && highlightMinute !== undefined && (
          <g>
            <line x1={xForMin(highlightMinute)} y1={HEADER_H - 2} x2={xForMin(highlightMinute)} y2={HEADER_H + 4 * ROW_H + 2} stroke="#DC2626" strokeWidth="2.5" strokeDasharray="4 3" />
            <text x={xForMin(highlightMinute)} y={HEADER_H - 5} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="700" fill="#DC2626">{minToHm(highlightMinute)} · violation</text>
          </g>
        )}

        {/* User-placed marker (gold) */}
        {markedMinute !== null && markedMinute !== undefined && markedMinute !== highlightMinute && (
          <g>
            <line x1={xForMin(markedMinute)} y1={HEADER_H - 2} x2={xForMin(markedMinute)} y2={HEADER_H + 4 * ROW_H + 2} stroke="#D4AF37" strokeWidth="2.5" />
            <text x={xForMin(markedMinute)} y={4 * ROW_H + HEADER_H + 11} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="700" fill="#D4AF37">your pick · {minToHm(markedMinute)}</text>
          </g>
        )}
        </g>
      </svg>
      </div>
      {/* Totals strip — always visible without horizontal scroll */}
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 justify-between" data-testid="eld-totals">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {ROWS.map((r) => (
            <div key={r.key} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide">{r.short}</span>
              <span className="text-[11px] font-mono font-bold text-[#002855]" data-testid={`total-${r.key}`}>{totalHm(totals[r.key])}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Total</span>
          <span className="text-[11px] font-mono font-bold text-[#002855]" data-testid="total-day">{totalHm(totalAll)}</span>
        </div>
      </div>
    </div>
  );
}
