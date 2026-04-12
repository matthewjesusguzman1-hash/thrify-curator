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

function StatBox({ label, val }) {
  return (
    <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, textAlign: "center", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: "bold", color: "#002855", marginTop: 2 }}>{val}</div>
    </div>
  );
}

export function TieDownReportContent({ articles }) {
  const now = new Date().toLocaleString();
  return (
    <div>
      <div style={{ background: "#002855", color: "white", padding: "16px 20px", borderRadius: 8, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>Tie-Down Assessment Report</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>{now} | {articles.length} article(s) | 49 CFR 393 Subpart I</p>
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
          <div key={a.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: "bold", color: "#002855", margin: "0 0 12px" }}>Article {ai + 1}: {a.label}</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <StatBox label="Weight" val={`${w.toLocaleString()} lbs`} />
              <StatBox label="Length" val={`${l} ft`} />
              <StatBox label="Required WLL" val={`${reqWLL.toLocaleString()} lbs`} />
              <StatBox label={`Min (393.110${a.hasBlocking ? "c" : "b"})`} val={min} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#64748B" }}>Aggregate WLL</span>
                <strong style={{ color: pct >= 100 ? "#10B981" : "#EF4444" }}>{totWLL.toLocaleString()} / {reqWLL.toLocaleString()} ({pct}%)</strong>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 4 }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, marginBottom: 14, background: allOk ? "#ecfdf5" : "#fef2f2", border: `1px solid ${allOk ? "#a7f3d0" : "#fecaca"}` }}>
              {allOk ? <CheckCircle2 style={{ width: 20, height: 20, color: "#10B981", flexShrink: 0 }} /> : <XCircle style={{ width: 20, height: 20, color: "#DC2626", flexShrink: 0 }} />}
              <div>
                <div style={{ fontWeight: "bold", fontSize: 14, color: allOk ? "#10B981" : "#DC2626" }}>
                  {allOk ? "COMPLIANT" : "NOT COMPLIANT"}
                </div>
                <div style={{ fontSize: 12, color: allOk ? "#059669" : "#B91C1C", marginTop: 2 }}>
                  Active: {active}/{min} min | WLL: {pct}%
                </div>
              </div>
            </div>

            {defective > 0 && (
              <div style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
                {defective} defective tie-down(s) excluded
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 10 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: 11, color: "#64748B", fontWeight: 600 }}>#</th>
                  <th style={{ padding: "8px", textAlign: "left", fontSize: 11, color: "#64748B", fontWeight: 600 }}>Tie-Down</th>
                  <th style={{ padding: "8px", textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: 600 }}>Method</th>
                  <th style={{ padding: "8px", textAlign: "right", fontSize: 11, color: "#64748B", fontWeight: 600 }}>Rated</th>
                  <th style={{ padding: "8px", textAlign: "right", fontSize: 11, color: "#64748B", fontWeight: 600 }}>Effective</th>
                </tr>
              </thead>
              <tbody>
                {a.tiedowns.map((td, i) => {
                  const eff = effectiveWll(td);
                  return (
                    <tr key={td.id || i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px", color: td.defective ? "#DC2626" : "#334155", fontWeight: "bold" }}>{i + 1}</td>
                      <td style={{ padding: "8px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{td.type}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: "bold", display: "inline-block", lineHeight: "1.4" }}>
                          {td.defective ? "DEF" : td.method === "indirect" ? "IND 100%" : "DIR 50%"}
                        </span>
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", color: td.defective ? "#999" : "#334155" }}>{td.wll.toLocaleString()}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{eff.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #002855" }}>
                  <td colSpan={4} style={{ padding: "10px 8px", fontWeight: "bold", color: "#002855", fontSize: 14 }}>Total Effective WLL</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "bold", fontSize: 16, color: pct >= 100 ? "#10B981" : "#EF4444" }}>{totWLL.toLocaleString()} lbs</td>
                </tr>
              </tfoot>
            </table>

            {a.photos?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, fontWeight: "bold", color: "#64748B", marginBottom: 6 }}>Photos ({a.photos.length})</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {a.photos.map((ph) => (
                    <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} crossOrigin="anonymous" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ fontSize: 10, color: "#94A3B8", fontStyle: "italic", marginTop: 10 }}>
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
      <div style={{ background: "#002855", color: "white", padding: "16px 20px", borderRadius: 8, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>{inspection.title || "Inspection Report"}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>Created: {inspection.created_at?.slice(0, 16).replace("T", " ")} | Exported: {now}</p>
      </div>

      {inspection.notes && (
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14, color: "#334155" }}>
          <strong>Notes:</strong> {inspection.notes}
        </div>
      )}

      {inspection.items?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: "bold", color: "#002855", marginBottom: 10, borderBottom: "2px solid #D4AF37", paddingBottom: 6 }}>
            Violations ({inspection.items.length})
          </h2>
          {inspection.items.map((item, idx) => (
            <div key={item.id || idx} style={{ border: "1px solid #eee", borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: "bold", color: "#002855" }}>{item.regulatory_reference}</span>
                {item.oos_value === "Y" && <span style={{ background: "#DC2626", color: "white", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>OOS</span>}
                <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, fontSize: 10, color: "#64748B" }}>{item.violation_class}</span>
              </div>
              <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>{item.violation_text}</p>
              {item.notes && <p style={{ fontSize: 12, color: "#64748B", margin: "6px 0 0", fontStyle: "italic" }}>Note: {item.notes}</p>}
              {item.photos?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {item.photos.map((ph) => (
                    <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} crossOrigin="anonymous" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inspection.tiedown_assessments?.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: "bold", color: "#002855", marginBottom: 10, borderBottom: "2px solid #D4AF37", paddingBottom: 6 }}>
            Tie-Down Assessments ({inspection.tiedown_assessments.length})
          </h2>
          {inspection.tiedown_assessments.map((a, ai) => {
            const pct = a.required_wll > 0 ? Math.round((a.total_effective_wll / a.required_wll) * 100) : 0;
            return (
              <div key={a.assessment_id || ai} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <strong style={{ fontSize: 14, color: "#002855" }}>Assessment {ai + 1}</strong>
                  <span style={{ background: a.compliant ? "#ecfdf5" : "#fef2f2", border: `1px solid ${a.compliant ? "#a7f3d0" : "#fecaca"}`, color: a.compliant ? "#10B981" : "#DC2626", padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: "bold", display: "inline-block", lineHeight: "1.4" }}>
                    {a.compliant ? "COMPLIANT" : "NOT COMPLIANT"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <StatBox label="Weight" val={`${a.cargo_weight?.toLocaleString()} lbs`} />
                  <StatBox label="Length" val={`${a.cargo_length} ft`} />
                  <StatBox label="Eff. WLL" val={`${a.total_effective_wll?.toLocaleString()} (${pct}%)`} />
                  <StatBox label="Min" val={a.min_tiedowns} />
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "8px", textAlign: "left", fontSize: 11, color: "#64748B" }}>Tie-Down</th>
                      <th style={{ padding: "8px", textAlign: "center", fontSize: 11, color: "#64748B" }}>Method</th>
                      <th style={{ padding: "8px", textAlign: "right", fontSize: 11, color: "#64748B" }}>Rated</th>
                      <th style={{ padding: "8px", textAlign: "right", fontSize: 11, color: "#64748B" }}>Effective</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.tiedowns?.map((td, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{i + 1}. {td.type}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: "bold", display: "inline-block", lineHeight: "1.4" }}>
                            {td.defective ? "DEF" : td.method === "indirect" ? "IND 100%" : "DIR 50%"}
                          </span>
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>{td.wll?.toLocaleString()}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{td.effective_wll?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {a.photos?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {a.photos.map((ph) => (
                      <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} crossOrigin="anonymous" />
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
