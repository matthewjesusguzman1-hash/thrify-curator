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
      {/* Header — its own PDF section */}
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
        const pct = reqWLL > 0 ? Math.round((totWLL / reqWLL) * 100) : 0;
        const barColor = pct >= 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

        return (
          <div key={a.id} data-pdf-section={`article-${ai}`} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 10 }}>
            {/* Article title + status inline */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#002855" }}>Article {ai + 1}: {a.label}</span>
              <span style={{ background: allOk ? "#ecfdf5" : "#fef2f2", border: `1px solid ${allOk ? "#a7f3d0" : "#fecaca"}`, color: allOk ? "#10B981" : "#DC2626", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold", display: "inline-block" }}>
                {allOk ? "COMPLIANT" : "NOT COMPLIANT"}
              </span>
            </div>

            {/* Compact stats — single row */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, fontSize: 11 }}>
              <div style={{ background: "#f8fafc", padding: "4px 8px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                <span style={{ color: "#94A3B8", fontSize: 9 }}>WEIGHT </span>
                <strong style={{ color: "#002855" }}>{w.toLocaleString()} lbs</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "4px 8px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                <span style={{ color: "#94A3B8", fontSize: 9 }}>LENGTH </span>
                <strong style={{ color: "#002855" }}>{l} ft</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "4px 8px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                <span style={{ color: "#94A3B8", fontSize: 9 }}>REQ WLL </span>
                <strong style={{ color: "#002855" }}>{reqWLL.toLocaleString()}</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "4px 8px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                <span style={{ color: "#94A3B8", fontSize: 9 }}>MIN </span>
                <strong style={{ color: "#002855" }}>{min}</strong>
                <span style={{ color: "#94A3B8", fontSize: 8 }}> (393.110{a.hasBlocking ? "c" : "b"})</span>
              </div>
            </div>

            {/* WLL bar — compact */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: "#64748B" }}>WLL: {totWLL.toLocaleString()} / {reqWLL.toLocaleString()} ({pct}%)</span>
                <span style={{ color: "#64748B" }}>Active: {active}/{min} min</span>
              </div>
              <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 3 }} />
              </div>
            </div>

            {defective > 0 && (
              <div style={{ fontSize: 10, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 4, padding: "3px 8px", marginBottom: 6 }}>
                {defective} defective excluded
              </div>
            )}

            {/* Tie-down table — compact */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: "#64748B" }}>#</th>
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
                      <td style={{ padding: "3px 6px", fontWeight: "bold", color: td.defective ? "#DC2626" : "#334155" }}>{i + 1}</td>
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
                  <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }} crossOrigin="anonymous" />
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
                    <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }} crossOrigin="anonymous" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inspection.tiedown_assessments?.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#002855", marginBottom: 6, borderBottom: "2px solid #D4AF37", paddingBottom: 4 }}>
            Tie-Down Assessments ({inspection.tiedown_assessments.length})
          </div>
          {inspection.tiedown_assessments.map((a, ai) => {
            const pct = a.required_wll > 0 ? Math.round((a.total_effective_wll / a.required_wll) * 100) : 0;
            return (
              <div key={a.assessment_id || ai} data-pdf-section={`assessment-${ai}`} style={{ border: "1px solid #ddd", borderRadius: 4, padding: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong style={{ fontSize: 12, color: "#002855" }}>Assessment {ai + 1}</strong>
                  <span style={{ background: a.compliant ? "#ecfdf5" : "#fef2f2", border: `1px solid ${a.compliant ? "#a7f3d0" : "#fecaca"}`, color: a.compliant ? "#10B981" : "#DC2626", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: "bold", display: "inline-block" }}>
                    {a.compliant ? "COMPLIANT" : "NOT COMPLIANT"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 11 }}>
                  <div style={{ background: "#f8fafc", padding: "3px 6px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                    <span style={{ color: "#94A3B8", fontSize: 8 }}>WT </span><strong style={{ color: "#002855" }}>{a.cargo_weight?.toLocaleString()}</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "3px 6px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                    <span style={{ color: "#94A3B8", fontSize: 8 }}>LEN </span><strong style={{ color: "#002855" }}>{a.cargo_length} ft</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "3px 6px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                    <span style={{ color: "#94A3B8", fontSize: 8 }}>WLL </span><strong style={{ color: pct >= 100 ? "#10B981" : "#EF4444" }}>{pct}%</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "3px 6px", borderRadius: 4, flex: 1, textAlign: "center" }}>
                    <span style={{ color: "#94A3B8", fontSize: 8 }}>MIN </span><strong style={{ color: "#002855" }}>{a.min_tiedowns}</strong>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "3px 5px", textAlign: "left", fontSize: 9, color: "#64748B" }}>Tie-Down</th>
                      <th style={{ padding: "3px 5px", textAlign: "center", fontSize: 9, color: "#64748B" }}>Method</th>
                      <th style={{ padding: "3px 5px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Rated</th>
                      <th style={{ padding: "3px 5px", textAlign: "right", fontSize: 9, color: "#64748B" }}>Eff.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.tiedowns?.map((td, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "3px 5px", textDecoration: td.defective ? "line-through" : "none", color: td.defective ? "#999" : "#334155" }}>{i + 1}. {td.type}</td>
                        <td style={{ padding: "3px 5px", textAlign: "center" }}>
                          <span style={{ background: td.defective ? "#DC2626" : td.method === "indirect" ? "#10B981" : "#002855", color: "white", padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: "bold", display: "inline-block" }}>
                            {td.defective ? "DEF" : td.method === "indirect" ? "IND" : "DIR"}
                          </span>
                        </td>
                        <td style={{ padding: "3px 5px", textAlign: "right" }}>{td.wll?.toLocaleString()}</td>
                        <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: "bold", color: td.defective ? "#DC2626" : "#002855" }}>{td.effective_wll?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {a.photos?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {a.photos.map((ph) => (
                      <img key={ph.photo_id} src={`${API}/files/${ph.storage_path}`} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }} crossOrigin="anonymous" />
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
