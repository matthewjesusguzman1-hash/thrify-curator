import React from "react";
import { CheckCircle2, AlertTriangle, Scale } from "lucide-react";

/**
 * WeightReportPrintable
 * Dedicated printable / downloadable Weight Report layout. Unlike the on-screen
 * Record Weights UI (which is optimized for editing), this layout is designed
 * for an 8.5x11-style "field report" shareable image — fixed 900px wide,
 * compact 2-column data blocks, a clean violations table, and the diagram
 * anchored at the bottom. Rendered off-screen during html2canvas capture.
 */
export default function WeightReportPrintable({
  groups,
  record,
  overallDistFt,
  isCustom,
  isInterstate,
  diagramSvgMarkup,
  badge,
  now = new Date(),
  photos = [],
  axleNumbers = [],
}) {
  const fmt = (n) => (n != null ? Number(n).toLocaleString() : "—");
  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  // Flatten all violations from record
  const violations = [];
  record.groupViolations?.forEach((v) => {
    if (v.max && v.actual > v.max) {
      violations.push({ label: `${v.label} (${v.source || "Group"})`, actual: v.actual, max: v.max, over: v.actual - v.max });
    }
    v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max && violations.push({
      label: `${v.label} · ${v.tandemCheck.source}`, actual: v.tandemCheck.actual, max: v.tandemCheck.max, over: v.tandemCheck.actual - v.tandemCheck.max,
    });
    v.axleOverages?.forEach((o) => violations.push({
      label: `Single axle A${o.axleNum}${o.isDummy ? " dummy" : ""}`, actual: o.weight, max: o.max, over: o.over,
    }));
    v.tandemSubsetChecks?.filter((t) => t.over).forEach((t) => violations.push({
      label: `${v.label} · Tandem subset ${t.label}`, actual: t.actual, max: t.max, over: t.overBy,
    }));
  });
  if (record.grossMax && record.gross > record.grossMax) {
    violations.push({ label: `Gross (${record.grossSource})`, actual: record.gross, max: record.grossMax, over: record.gross - record.grossMax });
  }
  if (record.interior?.over) {
    violations.push({
      label: `Interior Bridge A${record.interior.startAxleNum}-A${record.interior.endAxleNum}`,
      actual: record.interior.actual, max: record.interior.max, over: record.interior.overBy,
    });
  }

  const grossOver = record.gross > 0 && record.grossMax && record.gross > record.grossMax;
  const allLegal = violations.length === 0;

  return (
    <div
      style={{
        width: "900px",
        background: "#FFFFFF",
        color: "#0F172A",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
      }}
      data-testid="weight-report-printable"
    >
      {/* HEADER */}
      <div style={{ borderBottom: "3px solid #002855", paddingBottom: "12px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#D4AF37", fontWeight: 700, textTransform: "uppercase" }}>Inspection Navigator</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#002855", marginTop: "4px" }}>Weight Report</div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
            {isCustom ? "Custom / Permit" : `Bridge Formula · ${isInterstate ? "Interstate (80,000 cap)" : "Non-interstate"}`}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", color: "#64748B" }}>
          <div>{dateStr} · {timeStr}</div>
          {badge && <div>Badge {badge}</div>}
        </div>
      </div>

      {/* BIG STATUS PILL */}
      <div style={{
        background: allLegal ? "#F0FDF4" : "#FEE2E2",
        border: `2px solid ${allLegal ? "#16A34A" : "#DC2626"}`,
        borderRadius: "12px",
        padding: "14px 18px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {allLegal ? <CheckCircle2 size={28} color="#16A34A" /> : <AlertTriangle size={28} color="#DC2626" />}
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: allLegal ? "#15803D" : "#991B1B" }}>
              {allLegal ? "ALL WEIGHTS LEGAL" : `${violations.length} VIOLATION${violations.length !== 1 ? "S" : ""}`}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
              Gross {fmt(record.gross)} lbs{record.grossMax ? ` / ${fmt(record.grossMax)} max` : ""}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Gross</div>
          <div style={{ fontSize: "32px", fontWeight: 900, color: grossOver ? "#DC2626" : "#002855", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
            {fmt(record.gross)}
          </div>
        </div>
      </div>

      {/* TWO-COLUMN: Groups summary (left) + Key Stats (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ background: "#002855", color: "#FFFFFF", padding: "8px 12px", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>Axle Groups</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", color: "#64748B", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>Group</th>
                <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>Axles</th>
                <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>Dist</th>
                <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>Weight</th>
                <th style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>Max</th>
                <th style={{ textAlign: "center", padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, gi) => {
                const viol = record.groupViolations?.[gi];
                if (!viol) return null;
                const over = viol.max && viol.actual > viol.max;
                const tandemOver = viol.tandemCheck && viol.tandemCheck.actual > viol.tandemCheck.max;
                const axleOver = viol.axleOverages?.length > 0;
                const tsubOver = viol.tandemSubsetChecks?.some((t) => t.over);
                const isOver = over || tandemOver || axleOver || tsubOver;
                const an = axleNumbers[gi] || {};
                const axLabel = an.start === an.end ? `A${an.start}` : `A${an.start}-${an.end}`;
                return (
                  <tr key={gi} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#002855" }}>{g.label || axLabel}</td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>{axLabel}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748B", fontFamily: "ui-monospace, monospace" }}>
                      {viol.distRound ? `${viol.distRound} ft` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: isOver ? "#DC2626" : "#0F172A" }}>
                      {fmt(viol.actual)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "ui-monospace, monospace", color: "#64748B" }}>
                      {viol.max ? fmt(viol.max) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {isOver ? (
                        <span style={{ color: "#DC2626", fontWeight: 900, fontSize: "11px" }}>+{fmt(isOver ? (over ? viol.actual - viol.max : tandemOver ? viol.tandemCheck.actual - viol.tandemCheck.max : tsubOver ? viol.tandemSubsetChecks.filter(t=>t.over).reduce((s,t)=>s+t.overBy,0) : viol.axleOverages.reduce((s,o)=>s+o.over,0)) : 0)}</span>
                      ) : (
                        <span style={{ color: "#16A34A", fontWeight: 700, fontSize: "11px" }}>✓ Legal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ background: "#002855", color: "#FFFFFF", padding: "8px 12px", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>Configuration</div>
          <div style={{ padding: "10px 14px", fontSize: "12px", lineHeight: "1.8" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748B" }}>Total axles</span>
              <span style={{ fontWeight: 700 }}>{record.totalAxles}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748B" }}>Overall distance</span>
              <span style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{overallDistFt ? `${overallDistFt} ft` : "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748B" }}>Gross actual</span>
              <span style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace", color: grossOver ? "#DC2626" : "#0F172A" }}>{fmt(record.gross)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748B" }}>Gross max</span>
              <span style={{ fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{record.grossMax ? fmt(record.grossMax) : "—"}</span>
            </div>
            {record.grossSource && (
              <div style={{ color: "#94A3B8", fontSize: "10px", marginTop: "2px", fontStyle: "italic" }}>{record.grossSource}</div>
            )}
            {record.interior?.enabled && (
              <>
                <div style={{ borderTop: "1px solid #F1F5F9", margin: "8px 0", paddingTop: "6px", fontSize: "10px", color: "#94A3B8", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase" }}>Interior Bridge</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>A{record.interior.startAxleNum}–A{record.interior.endAxleNum}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: record.interior.over ? "#DC2626" : "#0F172A" }}>
                    {fmt(record.interior.actual)} {record.interior.max ? `/ ${fmt(record.interior.max)}` : ""}
                  </span>
                </div>
                {record.interior.distFt && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Distance</span>
                    <span style={{ fontFamily: "ui-monospace, monospace" }}>{record.interior.distFt} ft</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* VIOLATIONS TABLE */}
      {violations.length > 0 && (
        <div style={{ border: "2px solid #DC2626", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ background: "#DC2626", color: "#FFFFFF", padding: "8px 12px", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} /> Violations ({violations.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ textAlign: "left", padding: "6px 12px", borderBottom: "1px solid #FEE2E2" }}>Violation</th>
                <th style={{ textAlign: "right", padding: "6px 12px", borderBottom: "1px solid #FEE2E2" }}>Actual</th>
                <th style={{ textAlign: "right", padding: "6px 12px", borderBottom: "1px solid #FEE2E2" }}>Max</th>
                <th style={{ textAlign: "right", padding: "6px 12px", borderBottom: "1px solid #FEE2E2" }}>Over By</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0F172A" }}>{v.label}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "ui-monospace, monospace", color: "#DC2626", fontWeight: 700 }}>{fmt(v.actual)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "ui-monospace, monospace", color: "#64748B" }}>{fmt(v.max)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "ui-monospace, monospace", color: "#DC2626", fontWeight: 900 }}>+{fmt(v.over)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DIAGRAM */}
      {diagramSvgMarkup && (
        <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ background: "#002855", color: "#FFFFFF", padding: "8px 12px", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
            <Scale size={14} color="#D4AF37" /> Truck Diagram
          </div>
          <div style={{ background: "#0F172A", padding: "8px" }} dangerouslySetInnerHTML={{ __html: diagramSvgMarkup }} />
        </div>
      )}

      {/* PHOTOS */}
      {photos.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Photos ({photos.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {photos.slice(0, 8).map((p, i) => (
              <img key={p.id || i} src={p.url} alt="" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "6px", border: "1px solid #E2E8F0" }} />
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "10px", marginTop: "16px", fontSize: "10px", color: "#94A3B8", textAlign: "center" }}>
        Generated by Inspection Navigator · {dateStr} · Not an official DOT document
      </div>
    </div>
  );
}
