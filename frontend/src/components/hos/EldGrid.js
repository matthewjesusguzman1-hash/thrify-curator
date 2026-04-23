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
 */
export function EldGrid({ entries, compact = false, highlightMinute = null, onMinuteClick = null, markedMinute = null }) {
  const HOUR_W = compact ? 20 : 28;
  const ROW_H = compact ? 26 : 32;
  const LABEL_W = compact ? 62 : 74;
  const TOTAL_W = compact ? 50 : 58;
  const HEADER_H = compact ? 18 : 22;
  const HOURS = 24;
  const gridW = HOURS * HOUR_W;
  const svgW = LABEL_W + gridW + TOTAL_W;
  const svgH = HEADER_H + 4 * ROW_H + 12;

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

  return (
    <div className="overflow-x-auto -mx-1 rounded-lg border border-[#CBD5E1] bg-white">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block"
        onClick={handleSvgClick}
        style={{ cursor: onMinuteClick ? "crosshair" : "default" }}
      >
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
              <rect x={LABEL_W + gridW + 2} y={y + 4} width={TOTAL_W - 6} height={ROW_H - 8} fill="#FFFFFF" stroke="#CBD5E1" />
              <text x={LABEL_W + gridW + TOTAL_W / 2} y={y + ROW_H / 2 + 3.5} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="700" fill="#1E293B" fontFamily="monospace">
                {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
              </text>
            </g>
          );
        })}

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
            <text x={xForMin(markedMinute)} y={svgH - 1} textAnchor="middle" fontSize={compact ? "9" : "10"} fontWeight="700" fill="#D4AF37">your pick · {minToHm(markedMinute)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
