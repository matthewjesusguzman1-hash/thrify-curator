import { hmToMin, padDay, STATUS_META, minToHm } from "../../lib/hosRules";

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
export function EldGrid({ entries, compact = false, highlightMinute = null, onMinuteClick = null, markedMinute = null, brackets = [], shade = [], selectableIndices = [], selectedIndices = [], onEntryClick = null, blockMarks = {}, shiftMarkers = [] }) {
  const HOUR_W = compact ? 20 : 28;
  const ROW_H = compact ? 26 : 32;
  const LABEL_W = compact ? 62 : 74;
  const TOTAL_W = compact ? 66 : 76;
  const HEADER_H = compact ? 18 : 22;
  const HOURS = 24;
  const BRACKET_H = brackets && brackets.length > 0 ? 26 : 0;
  const maxLabelRow = shiftMarkers.reduce((mx, m) => Math.max(mx, m.labelRow || 0), 0);
  const MARKER_LABEL_H = shiftMarkers && shiftMarkers.length > 0 ? 14 + maxLabelRow * 12 : 0;
  const gridW = HOURS * HOUR_W;
  const svgW = LABEL_W + gridW + TOTAL_W;
  const svgH = BRACKET_H + HEADER_H + 4 * ROW_H + 12 + MARKER_LABEL_H;

  const ROWS = ["OFF", "SB", "D", "OD"].map((k) => STATUS_META[k]);
  const rowIdx = (k) => ROWS.findIndex((r) => r.key === k);
  const rowY = (k) => HEADER_H + rowIdx(k) * ROW_H + ROW_H / 2;
  const xFor = (hm) => LABEL_W + (hmToMin(hm) / 60) * HOUR_W;
  const xForMin = (m) => LABEL_W + (m / 60) * HOUR_W;

  const padded = padDay(entries);
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

  const totalHm = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  const totalAll = totals.OFF + totals.SB + totals.D + totals.OD;

  return (
    <div className="rounded-lg border border-[#CBD5E1] bg-white">
      <div className="overflow-x-auto -mx-1">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block"
        onClick={handleSvgClick}
        style={{ cursor: onMinuteClick ? "crosshair" : "default" }}
      >
        {/* Brackets above the grid — call out spans the rule cares about */}
        {brackets.map((b, i) => {
          const x1 = xForMin(b.startMin);
          const x2 = xForMin(b.endMin);
          const color = b.color || "#002855";
          const barY = BRACKET_H - 10;
          return (
            <g key={`br${i}`}>
              <line x1={x1} y1={barY} x2={x2} y2={barY} stroke={color} strokeWidth="1.8" />
              <line x1={x1} y1={barY} x2={x1} y2={BRACKET_H - 1} stroke={color} strokeWidth="1.8" />
              <line x1={x2} y1={barY} x2={x2} y2={BRACKET_H - 1} stroke={color} strokeWidth="1.8" />
              {b.label && (
                <text x={(x1 + x2) / 2} y={barY - 4} textAnchor="middle" fontSize={compact ? "8.5" : "9.5"} fontWeight="700" fill={color} fontFamily="sans-serif">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}

        <g transform={`translate(0, ${BRACKET_H})`}>
        {/* Shaded spans — soft column overlay across all duty rows */}
        {shade.map((s, i) => {
          const x = xForMin(s.startMin);
          const w = Math.max(0, xForMin(s.endMin) - x);
          return (
            <rect key={`sh${i}`} x={x} y={HEADER_H} width={w} height={4 * ROW_H} fill={s.color || "#D4AF37"} opacity="0.16" />
          );
        })}
        {/* Hour labels */}
        {Array.from({ length: HOURS + 1 }).map((_, h) => {
          const x = LABEL_W + h * HOUR_W;
          const label = h === 0 ? "Mid" : h === 12 ? "Noon" : h === 24 ? "" : (h > 12 ? h - 12 : h);
          return (
            <text key={`h${h}`} x={x} y={12} textAnchor="middle" fontSize={compact ? "8" : "9"} fill="#475569" fontFamily="sans-serif">{label}</text>
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
          const fill = mark === "correct" ? "#10B981" :
                       mark === "wrong"   ? "#DC2626" :
                       mark === "missed"  ? "#F59E0B" :
                       selected           ? "#2563EB" : "transparent";
          const fillOpacity = mark ? 0.45 : (selected ? 0.35 : 0);
          const strokeColor = mark === "correct" ? "#059669" :
                              mark === "wrong"   ? "#B91C1C" :
                              mark === "missed"  ? "#D97706" :
                              selected           ? "#1D4ED8" : "#002855";
          const strokeW = mark || selected ? 2.2 : 1.2;
          const strokeOpacity = mark || selected ? 1 : 0.55;
          return (
            <g key={`sel${idx}`} style={{ cursor: onEntryClick && !mark ? "pointer" : "default" }}
               onClick={(ev) => { if (onEntryClick && !mark) { ev.stopPropagation(); onEntryClick(idx); } }}>
              <rect x={x + 1} y={y + 2} width={Math.max(0, w - 2)} height={ROW_H - 4}
                fill={fill} fillOpacity={fillOpacity}
                stroke={strokeColor} strokeWidth={strokeW} strokeOpacity={strokeOpacity}
                strokeDasharray={!mark && !selected ? "3 2" : ""} rx={3} />
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
          const labelRow = sm.labelRow || 0;
          const labelY = HEADER_H + 4 * ROW_H + 22 + labelRow * 12;
          const flagText = isEnd ? "END" : isContinues ? "CONTINUES" : "START";
          const flagW = compact ? (flagText === "CONTINUES" ? 60 : 36) : (flagText === "CONTINUES" ? 74 : 44);
          const flagH = compact ? 11 : 13;
          // Position: END opens to the LEFT of the line; START/CONTINUES opens to the RIGHT.
          // Clamp inside the grid so badges at 00:00 or 24:00 don't overflow.
          let badgeX = isEnd ? x - flagW : x;
          if (badgeX < LABEL_W) badgeX = LABEL_W;
          if (badgeX + flagW > LABEL_W + gridW) badgeX = LABEL_W + gridW - flagW;
          return (
            <g key={`shift${i}`} data-testid={`shift-marker-${sm.kind || i}`}>
              <line x1={x} y1={HEADER_H - 1} x2={x} y2={HEADER_H + 4 * ROW_H + 4} stroke={color} strokeWidth="2" strokeDasharray="5 3" />
              <rect x={badgeX} y={HEADER_H - flagH - 2} width={flagW} height={flagH} rx={2} fill={color} />
              <text x={badgeX + flagW / 2} y={HEADER_H - 4} textAnchor="middle" fontSize={compact ? "8.5" : "9.5"} fontWeight="800" fill="#FFFFFF" fontFamily="sans-serif" letterSpacing="0.3">{flagText}</text>
              <text x={x} y={labelY} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="700" fill={color}>{sm.label || `${isEnd ? "Shift end" : isContinues ? "Continues" : "Shift start"} · ${minToHm(sm.min)}`}</text>
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
