import { CheckCircle2, XCircle } from "lucide-react";

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

export function TieDownReportContent({ articles }) {
  const now = new Date().toLocaleString();
  return (
    <div>
      {/* Header */}
      <div style={{ background: "#002855", color: "white", padding: "14px 18px", borderRadius: 8, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>Tie-Down Assessment Report</h1>
        <p style={{ margin: "3px 0 0", fontSize: 11, opacity: 0.7 }}>{now} | {articles.length} article(s) | 49 CFR 393 Subpart I</p>
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
        const pct = reqWLL > 0 ? Math.round((totWLL / reqWLL) * 100) : 0;
        const barColor = pct >= 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

        return (
          <div key={a.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: "bold", color: "#002855", margin: "0 0 10px" }}>Article {ai + 1}: {a.label}</h2>

            {/* Cargo stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { label: "Weight", val: `${w.toLocaleString()} lbs` },
                { label: "Length", val: `${l} ft` },
                { label: "Req WLL", val: reqWLL.toLocaleString() },
                { label: `Min (${a.hasBlocking ? "393.110c" : "393.110b"})`, val: min },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, background: "#f8fafc", padding: "6px 8px", borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#94A3B8", textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: "bold", color: "#002855" }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* WLL bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span>Aggregate WLL</span>
                <strong style={{ color: pct >= 100 ? "#10B981" : "#EF4444" }}>{totWLL.toLocaleString()} / {reqWLL.toLocaleString()} ({pct}%)</strong>
              </div>
              <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 4 }} />
              </div>
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, marginBottom: 10, background: allOk ? "#ecfdf5" : "#fef2f2", border: `1px solid ${allOk ? "#a7f3d0" : "#fecaca"}` }}>
              {allOk ? <CheckCircle2 className="w-4 h-4 text-emerald-600" style={{ flexShrink: 0 }} /> : <XCircle className="w-4 h-4 text-red-500" style={{ flexShrink: 0 }} />}
              <span style={{ fontWeight: "bold", fontSize: 12, color: allOk ? "#10B981" : "#DC2626" }}>
                {allOk ? "COMPLIANT" : "NOT COMPLIANT"} — Active: {active}/{min} min | WLL: {pct}%
              </span>
            </div>

            {defective > 0 && (
              <div style={{ fontSize: 11, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                {defective} defective tie-down(s) excluded
              </div>
            )}

            {/* Tie-down table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "5px 6px", textAlign: "left", fontSize: 10, color: "#64748B" }}>#</th>
                  <th style={{ padding: "5px 6px", textAlign: "left", fontSize: 10, color: "#64748B" }}>Tie-Down</th>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontSize: 10, color: "#64748B" }}>Method</th>
                  <th style={{ padding: "5px 6px", textAlign: "right", fontSize: 10, color: "#64748B" }}>Rated</th>
                  <th style={{ padding: "5px 6px", textAlign: "right", fontSize: 10, color: "#64748B" }}>Effective</th>
                </tr>
              </thead>
              <tbody>
                {a.tiedowns.map((td, i) => {
                  const eff = effectiveWll(td);
                  return (
                    <tr key={td.id || i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "5px 6px", color: td.defective ? "#DC2626" : "#334155", fontWeight: "bold", textDecoration: td.defective ? "line-through" : "none" }}>{i + 1}</td>
                      <td style={{ padding: "5px 6px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{td.type}</td>
                      <td style={{ padding: "5px 6px", textAlign: "center" }}>
                        <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: "bold" }}>
                          {td.defective ? "DEF" : td.method === "indirect" ? "IND 100%" : "DIR 50%"}
                        </span>
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "right", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{td.wll.toLocaleString()}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{eff.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #002855" }}>
                  <td colSpan={4} style={{ padding: "6px", fontWeight: "bold", color: "#002855" }}>Total Effective WLL</td>
                  <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: 14, color: pct >= 100 ? "#10B981" : "#EF4444" }}>{totWLL.toLocaleString()} lbs</td>
                </tr>
              </tfoot>
            </table>

            {/* Photos */}
            {a.photos?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 10, fontWeight: "bold", color: "#64748B", marginBottom: 4 }}>Photos ({a.photos.length})</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {a.photos.map((ph) => (
                    <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} crossOrigin="anonymous" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ fontSize: 9, color: "#94A3B8", fontStyle: "italic", marginTop: 8 }}>
        Per 49 CFR 393.102/104/110 — Direct: 50% WLL, Indirect: 100% WLL, Required aggregate WLL: 50% of cargo weight
      </p>
    </div>
  );
}

export function InspectionReportContent({ inspection }) {
  if (!inspection) return null;
  const now = new Date().toLocaleString();
  return (
    <div>
      {/* Header */}
      <div style={{ background: "#002855", color: "white", padding: "14px 18px", borderRadius: 8, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>{inspection.title || "Inspection Report"}</h1>
        <p style={{ margin: "3px 0 0", fontSize: 11, opacity: 0.7 }}>Created: {inspection.created_at?.slice(0, 16).replace("T", " ")} | Exported: {now}</p>
      </div>

      {/* Notes */}
      {inspection.notes && (
        <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#334155" }}>
          <strong>Notes:</strong> {inspection.notes}
        </div>
      )}

      {/* Violations */}
      {inspection.items?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: "bold", color: "#002855", marginBottom: 8, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Violations ({inspection.items.length})
          </h2>
          {inspection.items.map((item, idx) => (
            <div key={item.id || idx} style={{ border: "1px solid #eee", borderRadius: 6, padding: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: "bold", color: "#002855" }}>{item.regulatory_reference}</span>
                {item.oos_value === "Y" && <span style={{ background: "#DC2626", color: "white", padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: "bold" }}>OOS</span>}
                <span style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, fontSize: 9 }}>{item.violation_class}</span>
              </div>
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{item.violation_text}</p>
              {item.notes && <p style={{ fontSize: 10, color: "#64748B", margin: "4px 0 0", fontStyle: "italic" }}>Note: {item.notes}</p>}
              {item.photos?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {item.photos.map((ph) => (
                    <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }} crossOrigin="anonymous" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tie-down assessments */}
      {inspection.tiedown_assessments?.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: "bold", color: "#002855", marginBottom: 8, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Tie-Down Assessments ({inspection.tiedown_assessments.length})
          </h2>
          {inspection.tiedown_assessments.map((a, ai) => {
            const pct = a.required_wll > 0 ? Math.round((a.total_effective_wll / a.required_wll) * 100) : 0;
            return (
              <div key={a.assessment_id || ai} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: 12, color: "#002855" }}>Assessment {ai + 1}</strong>
                  <span style={{ background: a.compliant ? "#ecfdf5" : "#fef2f2", border: `1px solid ${a.compliant ? "#a7f3d0" : "#fecaca"}`, color: a.compliant ? "#10B981" : "#DC2626", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>
                    {a.compliant ? "COMPLIANT" : "NOT COMPLIANT"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[
                    { label: "Weight", val: `${a.cargo_weight?.toLocaleString()} lbs` },
                    { label: "Length", val: `${a.cargo_length} ft` },
                    { label: "Eff. WLL", val: `${a.total_effective_wll?.toLocaleString()} (${pct}%)` },
                    { label: "Min", val: a.min_tiedowns },
                  ].map((s) => (
                    <div key={s.label} style={{ flex: 1, background: "#f8fafc", padding: "4px 6px", borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "#94A3B8", textTransform: "uppercase" }}>{s.label}</div>
                      <div style={{ fontSize: 12, fontWeight: "bold", color: "#002855" }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "4px 5px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Tie-Down</th>
                      <th style={{ padding: "4px 5px", textAlign: "center", fontSize: 9, color: "#64748B" }}>Method</th>
                      <th style={{ padding: "4px 5px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Rated</th>
                      <th style={{ padding: "4px 5px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Effective</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.tiedowns?.map((td, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "4px 5px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{i + 1}. {td.type}</td>
                        <td style={{ padding: "4px 5px", textAlign: "center" }}>
                          <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "1px 4px", borderRadius: 3, fontSize: 8, fontWeight: "bold" }}>
                            {td.defective ? "DEF" : td.method === "indirect" ? "IND 100%" : "DIR 50%"}
                          </span>
                        </td>
                        <td style={{ padding: "4px 5px", textAlign: "right" }}>{td.wll?.toLocaleString()}</td>
                        <td style={{ padding: "4px 5px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{td.effective_wll?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {a.photos?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {a.photos.map((ph) => (
                      <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }} crossOrigin="anonymous" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
