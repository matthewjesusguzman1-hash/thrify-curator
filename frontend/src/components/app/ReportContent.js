import { CheckCircle2, XCircle } from "lucide-react";
import { DevicePhoto } from "./DevicePhoto";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function effectiveWll(td) {
  if (td.defective) return 0;
  return td.method === "direct" ? td.wll * 0.5 : td.wll;
}

function calcMinByLength(l, w, b) {
  if (l <= 0) return 0;
  if (b) return Math.ceil(l / 10);
  if (l <= 5 && w <= 1100) return 1;
  if (l <= 10) return 2;
  return 2 + Math.ceil((l - 10) / 10);
}

// Inline SVG WLL gauge for PDF rendering
function PDFGauge({ pct, size = 72, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const display = Math.min(Math.max(pct, 0), 100);
  const offset = circ - (display / 100) * circ;
  const c = size / 2;
  const color = pct >= 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, color }}>{Math.round(pct)}%</span>
        <span style={{ fontSize: 7, color: "#94A3B8", fontWeight: 700, letterSpacing: 1.5, marginTop: 2 }}>WLL</span>
      </div>
    </div>
  );
}

// Inline count dots (active/defective/missing)
function PDFCountDots({ tiedowns = [], required = 0 }) {
  const active = tiedowns.filter((t) => !t.defective).length;
  const missing = Math.max(0, required - active);
  const dots = [];
  tiedowns.forEach((td, i) => {
    dots.push(
      td.defective ? (
        <div key={`t${i}`} style={{ width: 18, height: 18, borderRadius: 9, background: "#fee2e2", border: "2px solid #f87171", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#DC2626", fontWeight: 900 }}>✕</div>
      ) : (
        <div key={`t${i}`} style={{ width: 18, height: 18, borderRadius: 9, background: "#10B981", border: "2px solid #059669", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 900 }}>✓</div>
      )
    );
  });
  for (let i = 0; i < missing; i++) {
    dots.push(<div key={`m${i}`} style={{ width: 18, height: 18, borderRadius: 9, border: "2px dashed #CBD5E1" }} />);
  }
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{dots}</div>;
}

// Uniform 4-stat row — same width / centered text
function StatCell({ label, value, valueColor = "#002855", sub }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, background: "#f8fafc", padding: "6px 4px", borderRadius: 4, border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 42 }}>
      <span style={{ color: "#94A3B8", fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1 }}>{label}</span>
      <strong style={{ color: valueColor, fontSize: 12, marginTop: 3, lineHeight: 1 }}>{value}</strong>
      {sub && <span style={{ color: "#94A3B8", fontSize: 7, marginTop: 2, lineHeight: 1 }}>{sub}</span>}
    </div>
  );
}

export function TieDownReportContent({ articles }) {
  const now = new Date().toLocaleString();
  return (
    <div>
      {/* Header */}
      <div data-pdf-section="header" style={{ background: "#002855", color: "white", padding: "10px 14px", borderRadius: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: "bold", margin: 0 }}>Tie-Down Assessment Report</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{now} | {articles.length} article(s) | 49 CFR 393</div>
      </div>

      {articles.map((a, ai) => {
        const w = parseFloat(a.cargoWeight) || 0;
        const l = parseFloat(a.cargoLength) || 0;
        if (w <= 0 && a.tiedowns.length === 0) return null;
        const min = calcMinByLength(l, w, a.hasBlocking);
        const reqWLL = w * 0.5;
        const totWLL = a.tiedowns.reduce((s, td) => s + effectiveWll(td), 0);
        const active = a.tiedowns.filter((t) => !t.defective).length;
        const defective = a.tiedowns.filter((t) => t.defective).length;
        const wllOk = w > 0 && totWLL >= reqWLL;
        const countOk = w > 0 && active >= min;
        const allOk = wllOk && countOk;
        const pct = reqWLL > 0 ? (totWLL / reqWLL) * 100 : 0;

        return (
          <div key={a.id} data-pdf-section={`article-${ai}`} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 10 }}>
            {/* Article title + status inline */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#002855" }}>Article {ai + 1}: {a.label}</span>
              <span style={{ background: allOk ? "#ecfdf5" : "#fef2f2", border: `1px solid ${allOk ? "#a7f3d0" : "#fecaca"}`, color: allOk ? "#10B981" : "#DC2626", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold", display: "inline-block" }}>
                {allOk ? "COMPLIANT" : "NOT COMPLIANT"}
              </span>
            </div>

            {/* WLL gauge + count dots */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: 8 }}>
              <PDFGauge pct={pct} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Tie-Down Count</div>
                <div style={{ fontSize: 12, color: wllOk && countOk ? "#002855" : "#DC2626", fontWeight: 900, marginBottom: 6 }}>
                  {active} <span style={{ color: "#94A3B8", fontSize: 10 }}>/ {min} min</span>
                </div>
                <PDFCountDots tiedowns={a.tiedowns} required={min} />
                <div style={{ fontSize: 9, color: "#64748B", marginTop: 4 }}>
                  Total Eff. WLL: <strong style={{ color: "#002855" }}>{totWLL.toLocaleString()} / {reqWLL.toLocaleString()} lbs</strong>
                </div>
              </div>
            </div>

            {/* Uniform stat row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <StatCell label="Weight" value={`${w.toLocaleString()} lbs`} />
              <StatCell label="Length" value={`${l} ft`} />
              <StatCell label="Req. WLL" value={reqWLL.toLocaleString()} />
              <StatCell label="Min Tie-Downs" value={min} sub={`393.110${a.hasBlocking ? "c" : "b"}`} />
            </div>

            {defective > 0 && (
              <div style={{ fontSize: 10, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 4, padding: "3px 8px", marginBottom: 6 }}>
                {defective} defective excluded
              </div>
            )}

            {/* Tie-down table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontSize: 9, color: "#64748B" }}>#</th>
                  <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Tie-Down</th>
                  <th style={{ padding: "4px 6px", textAlign: "center", fontSize: 9, color: "#64748B" }}>Method</th>
                  <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Rated</th>
                  <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Eff.</th>
                </tr>
              </thead>
              <tbody>
                {a.tiedowns.map((td, i) => {
                  const eff = effectiveWll(td);
                  return (
                    <tr key={td.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "3px 6px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 9, background: td.defective ? "#fee2e2" : "#002855", color: td.defective ? "#DC2626" : "white", fontSize: 10, fontWeight: 900, textDecoration: td.defective ? "line-through" : "none" }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ padding: "3px 6px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{td.type}</td>
                      <td style={{ padding: "3px 6px", textAlign: "center" }}>
                        <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: "bold", display: "inline-block" }}>
                          {td.defective ? "DEF" : td.method === "indirect" ? "IND" : "DIR"}
                        </span>
                      </td>
                      <td style={{ padding: "3px 6px", textAlign: "right", color: td.defective ? "#999" : "#334155" }}>{td.wll.toLocaleString()}</td>
                      <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{eff.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #002855" }}>
                  <td colSpan={4} style={{ padding: "4px 6px", fontWeight: "bold", color: "#002855", fontSize: 11 }}>Total Eff. WLL</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: "bold", fontSize: 13, color: pct >= 100 ? "#10B981" : "#EF4444" }}>{totWLL.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            {a.photos?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {a.photos.map((ph) => (
                  <DevicePhoto key={ph.photo_id} photoId={ph.photo_id} alt="" className="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd", display: "inline-block" }} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div data-pdf-footer="true" style={{ fontSize: 9, color: "#94A3B8", fontStyle: "italic", marginTop: 4 }}>
        49 CFR 393.102/104/110 — DIR: 50% WLL, IND: 100% WLL, Req. agg. WLL: 50% of cargo weight
      </div>
    </div>
  );
}

export function InspectionReportContent({ inspection }) {
  if (!inspection) return null;
  const now = new Date().toLocaleString();
  return (
    <div>
      <div data-pdf-section="insp-header" style={{ background: "#002855", color: "white", padding: "10px 14px", borderRadius: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: "bold" }}>{inspection.title || "Inspection Report"}</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Created: {inspection.created_at?.slice(0, 16).replace("T", " ")} | Exported: {now}</div>
      </div>

      {inspection.notes && (
        <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, marginBottom: 10, fontSize: 12, color: "#334155" }}>
          <strong>Notes:</strong> {inspection.notes}
        </div>
      )}

      {inspection.items?.length > 0 && (
        <div data-pdf-section="violations" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#002855", marginBottom: 6, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Violations ({inspection.items.length})
          </div>
          {inspection.items.map((item, idx) => (
            <div key={item.id || idx} style={{ border: "1px solid #eee", borderRadius: 4, padding: 8, marginBottom: 4, pageBreakInside: "avoid" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: "bold", color: "#002855" }}>{item.regulatory_reference}</span>
                {item.oos_value === "Y" && <span style={{ background: "#DC2626", color: "white", padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: "bold" }}>OOS</span>}
                <span style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 3, fontSize: 9, color: "#64748B" }}>{item.violation_class}</span>
              </div>
              <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.4 }}>{item.violation_text}</p>
              {item.notes && <p style={{ fontSize: 10, color: "#64748B", margin: "3px 0 0", fontStyle: "italic" }}>Note: {item.notes}</p>}
              {item.photos?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {item.photos.map((ph) => (
                    <DevicePhoto key={ph.photo_id} photoId={ph.photo_id} alt="" className="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd", display: "inline-block" }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inspection.tiedown_assessments?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#002855", marginBottom: 6, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Tie-Down Assessments ({inspection.tiedown_assessments.length})
          </div>
          {inspection.tiedown_assessments.map((a, ai) => {
            const pct = a.required_wll > 0 ? (a.total_effective_wll / a.required_wll) * 100 : 0;
            const active = (a.tiedowns || []).filter((t) => !t.defective).length;
            const defective = (a.tiedowns || []).filter((t) => t.defective).length;
            return (
              <div key={a.assessment_id || ai} data-pdf-section={`assessment-${ai}`} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong style={{ fontSize: 13, color: "#002855" }}>Assessment {ai + 1}</strong>
                  <span style={{ background: a.compliant ? "#ecfdf5" : "#fef2f2", border: `1px solid ${a.compliant ? "#a7f3d0" : "#fecaca"}`, color: a.compliant ? "#10B981" : "#DC2626", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold", display: "inline-block" }}>
                    {a.compliant ? "COMPLIANT" : "NOT COMPLIANT"}
                  </span>
                </div>

                {/* Gauge + count dots */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: 8 }}>
                  <PDFGauge pct={pct} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Tie-Down Count</div>
                    <div style={{ fontSize: 12, color: a.compliant ? "#002855" : "#DC2626", fontWeight: 900, marginBottom: 6 }}>
                      {active} <span style={{ color: "#94A3B8", fontSize: 10 }}>/ {a.min_tiedowns || 0} min</span>
                    </div>
                    <PDFCountDots tiedowns={a.tiedowns || []} required={a.min_tiedowns || 0} />
                    <div style={{ fontSize: 9, color: "#64748B", marginTop: 4 }}>
                      Total Eff. WLL: <strong style={{ color: "#002855" }}>{a.total_effective_wll?.toLocaleString() || 0} / {a.required_wll?.toLocaleString() || 0} lbs</strong>
                    </div>
                  </div>
                </div>

                {/* Uniform 4-stat row */}
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <StatCell label="Weight" value={`${a.cargo_weight?.toLocaleString() || 0} lbs`} />
                  <StatCell label="Length" value={`${a.cargo_length || 0} ft`} />
                  <StatCell label="Req. WLL" value={a.required_wll?.toLocaleString() || 0} />
                  <StatCell label="Min Tie-Downs" value={a.min_tiedowns || 0} />
                </div>

                {defective > 0 && (
                  <div style={{ fontSize: 10, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 4, padding: "3px 8px", marginBottom: 6 }}>
                    {defective} defective excluded
                  </div>
                )}

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "4px 6px", textAlign: "center", fontSize: 9, color: "#64748B" }}>#</th>
                      <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Tie-Down</th>
                      <th style={{ padding: "4px 6px", textAlign: "center", fontSize: 9, color: "#64748B" }}>Method</th>
                      <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Rated</th>
                      <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Eff.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.tiedowns?.map((td, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "3px 6px", textAlign: "center" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 9, background: td.defective ? "#fee2e2" : "#002855", color: td.defective ? "#DC2626" : "white", fontSize: 10, fontWeight: 900, textDecoration: td.defective ? "line-through" : "none" }}>
                            {i + 1}
                          </span>
                        </td>
                        <td style={{ padding: "3px 6px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{td.type}</td>
                        <td style={{ padding: "3px 6px", textAlign: "center" }}>
                          <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: "bold", display: "inline-block" }}>
                            {td.defective ? "DEF" : td.method === "indirect" ? "IND" : "DIR"}
                          </span>
                        </td>
                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{td.wll?.toLocaleString()}</td>
                        <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{td.effective_wll?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {a.photos?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {a.photos.map((ph) => (
                      <DevicePhoto key={ph.photo_id} photoId={ph.photo_id} alt="" className="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd", display: "inline-block" }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HOS Recaps */}
      {inspection.hos_assessments?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#002855", marginBottom: 6, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Hours of Service ({inspection.hos_assessments.length})
          </div>
          {inspection.hos_assessments.map((h, hi) => (
            <div key={h.assessment_id || hi} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: "bold", color: "#002855" }}>
                  HOS Recap {hi + 1} · {h.rule_type === "passenger" ? "Passenger 60/7" : "Property 70/8"}
                </span>
                <span style={{ background: h.is_oos ? "#fef2f2" : "#ecfdf5", border: `1px solid ${h.is_oos ? "#fecaca" : "#a7f3d0"}`, color: h.is_oos ? "#DC2626" : "#10B981", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>
                  {h.is_oos ? "OUT OF SERVICE" : "WITHIN LIMIT"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <StatCell label="Total" value={`${h.total_hours?.toFixed(1) || 0} / ${h.limit_hours || 0}`} valueColor={h.is_oos ? "#DC2626" : "#002855"} />
                <StatCell label={h.is_oos ? "Over By" : "Available"} value={h.is_oos ? `+${h.over_by?.toFixed(1) || 0} hr` : `${((h.limit_hours || 0) - (h.total_hours || 0)).toFixed(1)} hr`} valueColor={h.is_oos ? "#DC2626" : "#10B981"} />
                <StatCell label="Rest Needed" value={h.recommend_restart ? "34-hr Restart" : (h.oos_duration != null ? `${h.oos_duration.toFixed(1)} hr` : "—")} />
              </div>

              {h.days?.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 6 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "3px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Day</th>
                      <th style={{ padding: "3px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Date</th>
                      <th style={{ padding: "3px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Drive</th>
                      <th style={{ padding: "3px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>On-Duty</th>
                      <th style={{ padding: "3px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.days.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "3px 6px", fontWeight: "bold", color: "#334155" }}>{d.day_label || "—"}</td>
                        <td style={{ padding: "3px 6px", color: "#64748B" }}>{d.date || "—"}</td>
                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{d.drive ? Number(d.drive).toFixed(1) : "—"}</td>
                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{d.on_duty ? Number(d.on_duty).toFixed(1) : "—"}</td>
                        <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: "bold", color: "#002855" }}>{d.total ? Number(d.total).toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {h.recovery_steps?.length > 0 && (
                <div style={{ fontSize: 10, color: "#475569", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 4, padding: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: "#002855", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Recovery Logic</div>
                  {h.recovery_steps.map((s, si) => (
                    <div key={si} style={{ marginBottom: 3 }}>
                      <strong style={{ color: "#002855" }}>{s.step_num}.</strong> {s.description}
                      <div style={{ fontSize: 9, color: "#64748B", marginLeft: 12 }}>
                        OOS: <strong style={{ color: "#002855" }}>{Number(s.oos_hours).toFixed(1)} hr</strong>
                        {" · "}Total: <strong style={{ color: s.passes ? "#10B981" : "#DC2626" }}>{Number(s.running_total).toFixed(1)} hr</strong>
                        {s.available != null && <> · Available: <strong style={{ color: s.passes ? "#10B981" : "#DC2626" }}>{s.passes ? Number(s.available).toFixed(1) : "0"} hr</strong></>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Weight Assessments (structured) */}
      {inspection.weight_assessments?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#002855", marginBottom: 6, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Weight Assessments ({inspection.weight_assessments.length})
          </div>
          {inspection.weight_assessments.map((a, ai) => {
            const isOver = a.gross_max && a.gross_weight > a.gross_max;
            const hasViolations = a.violation_count > 0;
            // Recompute tolerance at render time: only applies when EXACTLY one
            // group/axle/tandem overage exists and we're in Bridge Formula mode.
            // Gross weight and interior bridge are NEVER subject to the 5% tolerance
            // and are NOT counted toward the one-violation threshold.
            let _overCount = 0;
            let _toleranceSavedOne = false;
            (a.group_violations || []).forEach((v) => {
              if (v.max && v.actual > v.max) {
                _overCount++;
                if (v.actual <= v.max * 1.05) _toleranceSavedOne = true;
              }
              if (v.tandemCheck && v.tandemCheck.actual > v.tandemCheck.max) {
                _overCount++;
                if (v.tandemCheck.actual <= v.tandemCheck.max * 1.05) _toleranceSavedOne = true;
              }
              (v.axleOverages || []).forEach((ao) => {
                if ((ao.actual || 0) > (ao.max || 0)) {
                  _overCount++;
                  if (ao.actual <= ao.max * 1.05) _toleranceSavedOne = true;
                }
              });
              (v.tandemSubsetChecks || []).forEach((t) => {
                if (t.over) {
                  _overCount++;
                  if (t.actual <= t.max * 1.05) _toleranceSavedOne = true;
                }
              });
            });
            // Tolerance is "applied" only if eligible (1 overage, not custom) AND
            // that overage was actually forgiven (within 5%).
            const toleranceEligible = !a.is_custom && _overCount === 1;
            const toleranceApplies = toleranceEligible && _toleranceSavedOne;
            return (
              <div key={a.assessment_id || ai} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: "bold", color: "#002855" }}>
                    Weight Report {ai + 1} · {a.mode_label || (a.is_custom ? "Custom" : "Bridge Formula")}
                    {!a.is_custom && <span style={{ marginLeft: 6, fontSize: 10, color: "#92570D" }}>{a.is_interstate ? "INTERSTATE" : "NON-INTERSTATE"}</span>}
                  </span>
                  <span style={{ background: hasViolations ? "#fef2f2" : "#ecfdf5", border: `1px solid ${hasViolations ? "#fecaca" : "#a7f3d0"}`, color: hasViolations ? "#DC2626" : "#10B981", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>
                    {hasViolations ? `${a.violation_count} VIOLATION${a.violation_count === 1 ? "" : "S"}` : "COMPLIANT"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <StatCell label="Gross Weight" value={`${a.gross_weight?.toLocaleString() || 0} lbs`} valueColor={isOver ? "#DC2626" : "#002855"} />
                  <StatCell label="Gross Max" value={a.gross_max ? `${a.gross_max.toLocaleString()} lbs` : "—"} />
                  <StatCell label="Axles" value={a.total_axles || 0} />
                </div>

                {a.groups?.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 6 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "3px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Group</th>
                        <th style={{ padding: "3px 6px", textAlign: "center", fontSize: 9, color: "#64748B" }}>Axles</th>
                        <th style={{ padding: "3px 6px", textAlign: "center", fontSize: 9, color: "#64748B" }}>Dist</th>
                        <th style={{ padding: "3px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.groups.map((g, gi) => {
                        const axles = (parseInt(g.axles) || 0) + (g.dummyAxle ? 1 : 0);
                        const distStr = g.distFt ? `${g.distFt}'` : "—";
                        const actual = g.useGroup
                          ? (g.groupWeight ? Number(g.groupWeight) : 0)
                          : (g.weights || []).reduce((s, w) => s + (Number(w) || 0), 0);
                        return (
                          <tr key={gi} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "3px 6px", color: "#334155" }}>
                              <strong style={{ color: "#002855" }}>A{gi + 1}</strong>{g.label ? ` · ${g.label}` : ` · ${g.preset || "Group"}`}
                              {g.dummyAxle && <span style={{ color: "#D4AF37", marginLeft: 4 }}>+dummy</span>}
                            </td>
                            <td style={{ padding: "3px 6px", textAlign: "center" }}>{axles || "—"}</td>
                            <td style={{ padding: "3px 6px", textAlign: "center" }}>{distStr}</td>
                            <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: "bold", color: "#002855" }}>{actual > 0 ? actual.toLocaleString() : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {a.overall_dist_ft && (
                      <tfoot>
                        <tr style={{ borderTop: "2px solid #002855", background: "#f8fafc" }}>
                          <td style={{ padding: "4px 6px", fontWeight: "bold", color: "#002855" }}>Overall</td>
                          <td style={{ padding: "4px 6px", textAlign: "center", color: "#475569" }}>{a.total_axles}</td>
                          <td style={{ padding: "4px 6px", textAlign: "center", color: "#475569" }}>{a.overall_dist_ft}'</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: "bold", fontSize: 12, color: isOver ? "#DC2626" : "#002855" }}>{a.gross_weight?.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}

                {/* Calculation Details — mirrors the live Bridge Chart section */}
                {(a.group_violations?.length > 0 || (a.interior && a.interior.enabled)) && a.gross_weight > 0 && (() => {
                  const axleStart = (idx) => {
                    if (Array.isArray(a.axle_numbers) && a.axle_numbers[idx]?.start) return a.axle_numbers[idx].start;
                    let s = 1;
                    for (let k = 0; k < idx; k++) {
                      const gk = a.groups?.[k] || {};
                      s += (parseInt(gk.axles) || 0) + (gk.dummyAxle ? 1 : 0);
                    }
                    return s;
                  };
                  const grossSrcLabel = a.gross_source || (a.is_custom ? "Custom" : (a.overall_dist_ft && a.total_axles >= 2 ? `Bridge (${a.overall_dist_ft}ft, ${a.total_axles}ax)` : "Bridge formula"));
                  return (
                    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 6, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ background: "#F8FAFC", padding: "4px 10px", fontSize: 9, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #E2E8F0" }}>
                        Calculation Details
                        {toleranceApplies && <span style={{ color: "#D4AF37", marginLeft: 6, textTransform: "none" }}>· 5% tolerance applied</span>}
                      </div>
                      {a.group_violations?.map((v, i) => {
                        const g = a.groups?.[i] || {};
                        const baseN = v.baseN || (parseInt(g.axles) || 0);
                        const baseW = g.useGroup
                          ? (parseInt(g.groupWeight) || 0)
                          : (g.weights || []).slice(0, baseN).reduce((s, w) => s + (parseInt(w) || 0), 0);
                        const di = v.dummy || {};
                        const overVal = v.max && v.actual > v.max ? v.actual - v.max : 0;
                        const withinTol5 = v.max && v.actual > v.max && v.actual <= Math.round(v.max * 1.05) && toleranceApplies;
                        const start = axleStart(i);
                        const parts = [];
                        if (g.useGroup) parts.push(`${baseW.toLocaleString()} (combined)`);
                        else (g.weights || []).slice(0, baseN).forEach((w, k) => parts.push(`A${start + k}=${(parseInt(w) || 0).toLocaleString()}`));
                        if (di.hasDummy && di.dummyWeight > 0) parts.push(`A${start + baseN}(dummy)=${di.dummyWeight.toLocaleString()}`);
                        const sum = baseW + (di.dummyWeight || 0);
                        return (
                          <div key={i} style={{ padding: "5px 10px", fontSize: 10, lineHeight: 1.45, borderTop: i > 0 ? "1px solid #F1F5F9" : "none" }}>
                            <p style={{ fontWeight: 700, color: "#002855", margin: "0 0 1px 0" }}>{v.label || `A${i + 1}`} <span style={{ fontWeight: 400, color: "#94A3B8" }}>· {baseN} axle{baseN > 1 ? "s" : ""}{di.hasDummy ? " + 1 dummy" : ""}</span></p>
                            <p style={{ color: "#475569", fontFamily: "monospace", margin: 0 }}>{parts.join(" + ")} = <strong>{sum.toLocaleString()} lbs</strong></p>
                            {di.hasDummy && di.dummyWeight > 0 && (
                              <p style={{ marginTop: 2, color: di.disregarded ? "#16A34A" : "#DC2626" }}>
                                Dummy discount check: {di.dummyWeight.toLocaleString()} meets 8,000? <strong>{di.dummyWeight >= 8000 ? "YES" : "NO"}</strong> · {di.dummyWeight.toLocaleString()} meets 8% of {a.gross_weight.toLocaleString()} ({Math.round(a.gross_weight * 0.08).toLocaleString()})? <strong>{di.dummyWeight >= a.gross_weight * 0.08 ? "YES" : "NO"}</strong> → {di.disregarded ? "DISREGARDED (neither threshold met)" : "COUNTS (at least one threshold met)"}
                              </p>
                            )}
                            {v.max ? (
                              <p style={{ marginTop: 2, fontFamily: "monospace", color: overVal > 0 ? (withinTol5 ? "#F97316" : "#DC2626") : "#16A34A" }}>
                                {v.source}: {sum.toLocaleString()} {overVal > 0 ? "exceeds" : "within"} {v.max.toLocaleString()} → <strong>{overVal > 0 ? `+${overVal.toLocaleString()} OVER${withinTol5 ? ` (within 5% tol ${Math.round(v.max * 1.05).toLocaleString()})` : ""}` : "LEGAL"}</strong>
                              </p>
                            ) : (
                              <p style={{ marginTop: 2, color: "#94A3B8", fontStyle: "italic" }}>No max rule applied (enter distance or set Custom).</p>
                            )}
                            {v.tandemCheck && (
                              <p style={{ marginTop: 2, fontFamily: "monospace", color: v.tandemCheck.actual > v.tandemCheck.max ? "#DC2626" : "#16A34A" }}>
                                {v.tandemCheck.source}: {v.tandemCheck.actual.toLocaleString()} {v.tandemCheck.actual > v.tandemCheck.max ? "exceeds" : "within"} {v.tandemCheck.max.toLocaleString()} → <strong>{v.tandemCheck.actual > v.tandemCheck.max ? `+${(v.tandemCheck.actual - v.tandemCheck.max).toLocaleString()} OVER` : "LEGAL"}</strong>
                              </p>
                            )}
                            {v.axleOverages?.map(o => (
                              <p key={`axle-${o.axleNum}`} style={{ marginTop: 2, fontFamily: "monospace", color: "#DC2626" }}>
                                Single axle rule (A{o.axleNum}{o.isDummy ? " dummy" : ""}): {o.weight.toLocaleString()} exceeds {o.max.toLocaleString()} → <strong>+{o.over.toLocaleString()} OVER</strong>
                              </p>
                            ))}
                            {v.tandemSubsetChecks?.filter(t => t.over).map(t => (
                              <p key={`tsub-${t.pairIndex}`} style={{ marginTop: 2, fontFamily: "monospace", color: "#DC2626" }}>
                                Tandem subset {t.label}: {t.actual.toLocaleString()} exceeds {t.max.toLocaleString()}{t.distFt ? ` (Bridge at ${t.distFt}ft)` : " (Standard 34,000)"} → <strong>+{t.overBy.toLocaleString()} OVER</strong>
                              </p>
                            ))}
                          </div>
                        );
                      })}
                      <div style={{ padding: "5px 10px", fontSize: 10, background: "#F8FAFC", borderTop: "1px solid #F1F5F9" }}>
                        <p style={{ fontWeight: 700, color: "#002855", margin: "0 0 1px 0" }}>Gross Weight</p>
                        <p style={{ color: "#475569", fontFamily: "monospace", margin: 0 }}>
                          {a.group_violations?.map((v, i) => `${v.label || `A${i + 1}`}=${(v.actual || 0).toLocaleString()}`).join(" + ")} = <strong>{a.gross_weight.toLocaleString()} lbs</strong>
                        </p>
                        {a.gross_max ? (
                          <p style={{ marginTop: 2, fontFamily: "monospace", color: a.gross_weight > a.gross_max ? "#DC2626" : "#16A34A" }}>
                            {grossSrcLabel}: {a.gross_weight.toLocaleString()} {a.gross_weight > a.gross_max ? "exceeds" : "within"} {a.gross_max.toLocaleString()} → <strong>{a.gross_weight > a.gross_max ? `+${(a.gross_weight - a.gross_max).toLocaleString()} OVER (no tolerance on gross)` : "LEGAL"}</strong>
                          </p>
                        ) : (
                          <p style={{ marginTop: 2, color: "#94A3B8", fontStyle: "italic" }}>No gross max recorded.</p>
                        )}
                      </div>
                      {a.interior?.enabled && (
                        <div style={{ padding: "5px 10px", fontSize: 10, borderTop: "1px solid #F1F5F9" }}>
                          <p style={{ fontWeight: 700, color: "#002855", margin: "0 0 1px 0" }}>Interior Bridge <span style={{ fontWeight: 400, color: "#94A3B8" }}>· A{a.interior.startAxleNum} → A{a.interior.endAxleNum} ({a.interior.axleCount} axles)</span></p>
                          <p style={{ color: "#475569", fontFamily: "monospace", margin: 0 }}>
                            Gross {a.gross_weight.toLocaleString()} − A{a.interior.startAxleNum - 1} ({(a.interior.a1Weight || 0).toLocaleString()}) = <strong>{(a.interior.actual || 0).toLocaleString()} lbs</strong>
                          </p>
                          {a.interior.max ? (
                            <p style={{ marginTop: 2, fontFamily: "monospace", color: a.interior.over ? "#DC2626" : "#16A34A" }}>
                              {a.interior.source}: {(a.interior.actual || 0).toLocaleString()} {a.interior.over ? "exceeds" : "within"} {a.interior.max.toLocaleString()} → <strong>{a.interior.over ? `+${(a.interior.overBy || 0).toLocaleString()} OVER` : "LEGAL"}</strong>
                            </p>
                          ) : (
                            <p style={{ marginTop: 2, color: "#94A3B8", fontStyle: "italic" }}>No bridge data for {a.interior.distFt}ft / {a.interior.axleCount} axles.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {a.truck_diagram_svg && (
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 4, padding: 6, overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: a.truck_diagram_svg }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Additional Photos hidden pre-launch — agency review pending. */}
      {false && (inspection.general_photos || []).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#002855", marginBottom: 6, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Additional Photos ({inspection.general_photos.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {inspection.general_photos.map((ph) => (
              <DevicePhoto key={ph.photo_id} photoId={ph.photo_id} alt="" className="" style={{ width: 260, maxWidth: "100%", borderRadius: 4, border: "1px solid #ddd", display: "block" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export function HosReportContent({ snapshot }) {
  if (!snapshot) return null;
  const {
    ruleType, limitHours, dayCount, days, grandTotal, isOos, overBy,
    hoursLeftToday, recoverySteps, oosDuration, recommendRestart,
  } = snapshot;
  const now = new Date().toLocaleString();
  const ruleLabel = ruleType === "passenger" ? "Passenger · 60 hr / 7 day" : "Property · 70 hr / 8 day";

  return (
    <div>
      <div data-pdf-section="header" style={{ background: "#002855", color: "white", padding: "10px 14px", borderRadius: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: "bold" }}>Hours of Service — 60/70 Hour Rule</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{now} &nbsp;|&nbsp; {ruleLabel} &nbsp;|&nbsp; Limit: {limitHours} hr / {dayCount} days</div>
      </div>

      {/* Totals banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, border: `1px solid ${isOos ? "#fecaca" : "#a7f3d0"}`, background: isOos ? "#fef2f2" : "#ecfdf5", padding: "8px 12px", borderRadius: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: "bold" }}>Total Hours ({dayCount} days)</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: isOos ? "#DC2626" : "#002855" }}>
            {grandTotal?.toFixed(2)} <span style={{ fontSize: 12, color: "#64748B" }}>/ {limitHours}</span>
          </div>
        </div>
        <span style={{ background: isOos ? "#DC2626" : "#10B981", color: "white", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: "bold" }}>
          {isOos ? `OUT OF SERVICE · +${overBy?.toFixed(2)} hr` : "WITHIN LIMIT"}
        </span>
      </div>

      {/* Daily grid */}
      <div style={{ fontSize: 12, fontWeight: "bold", color: "#002855", marginBottom: 4, borderBottom: "2px solid #D4AF37", paddingBottom: 3 }}>
        Daily Log ({dayCount} days)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Day</th>
            <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Date</th>
            <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Drive</th>
            <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>On-Duty</th>
            <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {days?.map((d, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "3px 6px", fontWeight: "bold", color: "#334155" }}>{d.dayLabel || "—"}</td>
              <td style={{ padding: "3px 6px", color: "#64748B" }}>{d.date || "—"}</td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>{d.drive ? Number(d.drive).toFixed(2) : "—"}</td>
              <td style={{ padding: "3px 6px", textAlign: "right" }}>{d.onDuty ? Number(d.onDuty).toFixed(2) : "—"}</td>
              <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: "bold", color: "#002855" }}>{d.total ? Number(d.total).toFixed(2) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #002855", background: "#f8fafc" }}>
            <td colSpan={4} style={{ padding: "4px 6px", fontWeight: "bold", color: "#002855", fontSize: 11 }}>Total ({dayCount} days)</td>
            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: "bold", fontSize: 13, color: isOos ? "#DC2626" : "#10B981" }}>{grandTotal?.toFixed(2)} hr</td>
          </tr>
        </tfoot>
      </table>

      {/* Recovery logic (only if OOS) */}
      {isOos && recoverySteps?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#002855", marginBottom: 4, borderBottom: "2px solid #D4AF37", paddingBottom: 3 }}>
            Recovery Logic
          </div>
          {hoursLeftToday != null && (
            <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 6px 0" }}>
              Hours remaining in today's log at stop: <strong style={{ color: "#002855" }}>{Number(hoursLeftToday).toFixed(2)} hr</strong>
            </p>
          )}
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recoverySteps.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 11, lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 9, background: s.passes ? "#10B981" : "#CBD5E1", color: "white", fontSize: 10, fontWeight: "bold", textAlign: "center", lineHeight: "18px" }}>{s.stepNum}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#334155" }}>{s.description}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                    OOS: <strong style={{ color: "#002855" }}>{Number(s.oosHours).toFixed(2)} hr</strong>
                    {s.gained != null && <>
                      <span style={{ margin: "0 6px", color: "#CBD5E1" }}>·</span>
                      Removed from calculation: <strong style={{ color: "#475569" }}>−{Number(s.gained).toFixed(2)} hr</strong>
                    </>}
                    <span style={{ margin: "0 6px", color: "#CBD5E1" }}>·</span>
                    Total: <strong style={{ color: s.passes ? "#002855" : "#DC2626" }}>{Number(s.runningTotal).toFixed(2)} hr</strong>
                    {s.available != null && <>
                      <span style={{ margin: "0 6px", color: "#CBD5E1" }}>·</span>
                      Available: <strong style={{ color: s.passes ? (s.available < 2 ? "#F59E0B" : "#10B981") : "#DC2626" }}>{s.passes ? Number(s.available).toFixed(2) : "0.00"} hr</strong>
                    </>}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {recommendRestart ? (
            <div style={{ border: "1px solid #F59E0B", background: "#FFFBEB", borderRadius: 4, padding: "6px 10px", marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5 }}>Recommendation: 34-Hour Restart</div>
              <p style={{ fontSize: 11, color: "#78350F", margin: "2px 0 0" }}>Driver must take <strong>34 consecutive hours off duty</strong> to fully reset the {limitHours}-hour clock.</p>
            </div>
          ) : (
            <div style={{ border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 4, padding: "6px 10px", marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: "#065F46", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Total OOS Duration: {oosDuration != null ? Number(oosDuration).toFixed(2) : "—"} hr
              </div>
              <p style={{ fontSize: 11, color: "#065F46", margin: "2px 0 0" }}>After this rest, the driver's {dayCount}-day total will be below the {limitHours}-hour limit.</p>
            </div>
          )}
        </div>
      )}

      <div data-pdf-footer="true" style={{ fontSize: 9, color: "#94A3B8", fontStyle: "italic", marginTop: 12 }}>
        49 CFR 395.3 — 60/70-hour rule. Recovery logic per FMCSA rolling-window interpretation.
      </div>
    </div>
  );
}
