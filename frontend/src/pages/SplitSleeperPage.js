import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Layers, Target } from "lucide-react";
import { EldGrid } from "../components/hos/EldGrid";
import { SPLIT_LEARN_SCENARIOS } from "../lib/hosScenarios";
import { CfrText } from "../lib/cfrLinks";

/**
 * SplitSleeperPage — Learn-only walkthrough of valid vs invalid pairings.
 * Green brackets mark qualifying rest periods, gold brackets show the hours
 * that still count against the 11 and 14. The interactive Practice flow that
 * used to live on a second tab here was consolidated into the unified
 * /hours-of-service/practice page (Split Sleeper category) so all practice
 * scenarios share one home and one runner — the inspector doesn't need to
 * remember where each kind of drill lives.
 */
export default function SplitSleeperPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-10" data-testid="split-sleeper-page">
      <header className="bg-[#002855] text-white sticky top-0 z-30 border-b border-[#D4AF37]/30">
        <div className="max-w-[900px] mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <h1 className="text-sm font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Split Sleeper Trainer</h1>
              <p className="text-[10px] text-white/50">Property-carrying · <a href="https://www.ecfr.gov/current/title-49/section-395.1" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:decoration-solid hover:text-[#D4AF37]" data-testid="cfr-link">49 CFR §395.1(g)(1)(ii)</a></p>
            </div>
          </div>
          <button
            onClick={() => navigate("/hours-of-service/practice")}
            className="ml-auto flex items-center gap-1 rounded-md bg-[#D4AF37] text-[#002855] hover:bg-[#E0BE50] px-2.5 py-1.5 text-[11px] font-bold transition-colors"
            data-testid="goto-practice-btn"
          >
            <Target className="w-3.5 h-3.5" /> Practice
          </button>
        </div>
      </header>
      <main className="max-w-[900px] mx-auto px-3 py-4 space-y-3">
        <LearnTab />
      </main>
    </div>
  );
}

/* ────────────────────────── Learn Tab ────────────────────────── */

/** Combined rationale + detail text shown beneath each scenario's ELD grid.
 *  Merges the short "why this pair" intro with the long mechanics walkthrough
 *  into one unified block — a bold gold-inked lead line followed by the
 *  breakdown, so inspectors get the headline then the math without
 *  re-reading overlapping information. */
function ScenarioExplanation({ note, description, small }) {
  // If there's no "why this pair" note, just render the description as plain prose.
  if (!note) {
    return (
      <p className={`${small ? "text-[12px]" : "text-[12.5px]"} text-[#334155] leading-relaxed`}>
        <CfrText text={description} />
      </p>
    );
  }
  return (
    <div className={`${small ? "text-[12px]" : "text-[12.5px]"} text-[#334155] leading-relaxed space-y-2`}>
      <p className="text-[#713F12] bg-[#FFFBEB] border-l-[3px] border-[#D4AF37] rounded-r-md px-2.5 py-1.5">
        <span className="font-black uppercase tracking-widest text-[9.5px] text-[#D4AF37] mr-1.5">Why this pair</span>
        <CfrText text={note} />
      </p>
      <p><CfrText text={description} /></p>
    </div>
  );
}

function LearnTab() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
        <p className="text-[12.5px] text-[#334155] leading-relaxed">
          A split-sleeper pairing is the <span className="font-bold">equivalent of a 10-hour reset</span> taken as two rest periods instead of one. Per <a href="https://www.ecfr.gov/current/title-49/section-395.1" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:decoration-solid hover:text-[#D4AF37]" data-testid="cfr-link">49 CFR §395.1(g)(1)(ii)</a>: <span className="font-bold">≥7 consecutive hours in the Sleeper Berth</span> paired with <span className="font-bold">≥2 consecutive hours in the Sleeper Berth or Off Duty</span>, combined totaling <span className="font-bold">≥10 hrs</span>, in <span className="font-bold">any order</span>. Examples: 7+3, 8+2, 7.5+2.5 — all qualify.
        </p>
        <p className="text-[12.5px] text-[#334155] leading-relaxed mt-2">
          The wall-clock does <span className="font-bold">NOT</span> pause. Per §395.1(g)(1)(ii)(E), the time spent inside qualifying rest periods is <span className="font-bold text-[#10B981]">excluded from the 11-hr and 14-hr calculations</span> — in other words, those rest hours simply don't count toward either limit. Hours in <span className="font-bold text-[#D4AF37]">driving or on-duty segments</span> still count toward both.
        </p>
      </div>

      {/* CVSA enforcement principle — taught up front so inspectors see it
       * before any specific example, and also so they know every example
       * selected the pairing that most benefits the driver. */}
      <div
        className="rounded-md bg-[#002855] text-white px-3 py-2.5 shadow-sm border-l-[3px] border-[#D4AF37]"
        data-testid="roadside-principle"
      >
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center gap-1 bg-[#D4AF37] text-[#002855] text-[9.5px] font-black uppercase tracking-widest rounded-sm px-1.5 py-[2px] flex-shrink-0 mt-[2px]">
            <Target className="w-2.5 h-2.5" strokeWidth={3} /> Roadside
          </span>
          <div className="text-[13px] leading-snug space-y-1">
            <p className="font-bold">Any valid pair defends the driver.</p>
            <p className="text-white/90">
              A driver can pair <span className="font-bold">any two qualifying rest periods</span> on the log. If a violation exists under the straight 14-hr or 11-hr rule, look for <span className="font-bold">any</span> legitimate split combination (≥7h SB + ≥2h SB/OFF, combined ≥10h) that would cover it. If at least one valid pair makes the violation go away, the driver is compliant — you don't have to pick the single "best" pair to cite, just verify one exists. See <span className="font-bold text-[#D4AF37]">Example 1</span> for a worked case.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-1">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#10B981]" /><p className="text-[10.5px] text-[#475569] font-bold">Excluded from 11 &amp; 14</p></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#D4AF37]" /><p className="text-[10.5px] text-[#475569] font-bold">Counts toward 11 &amp; 14</p></div>
      </div>

      <section className="bg-white rounded-xl border-2 border-[#D4AF37]/50 overflow-hidden" data-testid="shift-identification-card">
        <div className="bg-[#FFFBEB] border-b border-[#D4AF37]/30 px-4 py-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#002855] flex items-center justify-center text-[11px] font-bold">!</div>
          <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>How to identify the work shift</p>
        </div>
        <div className="p-4 space-y-2.5">
          <p className="text-[12.5px] text-[#334155] leading-relaxed">
            Every 11/14 calculation depends on knowing exactly when the work shift STARTS and ENDS. The CVSA procedure (Step 10) gives two rules — one for a standard 10-hr reset, and one for the sleeper-berth provision.
          </p>
          <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">Locate the START of the work shift</p>
            <ul className="space-y-1 pl-4">
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">10-Hour Continuous Break:</span> ALWAYS start counting at the END of a full 10-hour off-duty break.</li>
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">Sleeper Berth Provision:</span> ALWAYS start counting at the END of the FIRST segment of a qualifying split (§395.1(g)(1)(ii)).</li>
            </ul>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">Locate the STOPPING LINE</p>
            <ul className="space-y-1 pl-4">
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">10-Hour Continuous Break:</span> ALWAYS stop counting at the BEGINNING of a full 10-hour off-duty break.</li>
              <li className="text-[12px] text-[#334155] leading-relaxed list-disc"><span className="font-bold">Sleeper Berth Provision:</span> ALWAYS stop counting at the BEGINNING of the SECOND segment of a qualifying split.</li>
            </ul>
          </div>
          <p className="text-[11.5px] text-[#64748B] leading-relaxed italic pt-1">
            <span className="font-bold">14-hr rule:</span> count all driving AND on-duty time between the start and stop lines. Off-duty and sleeper-berth time inside the window ALSO counts toward the 14 UNLESS it's part of a qualifying split-sleeper pairing (§395.1(g)(1)(ii)(E)).<br/>
            <span className="font-bold">11-hr rule:</span> count all DRIVING time between the start and stop lines.
          </p>
        </div>
      </section>

      {SPLIT_LEARN_SCENARIOS.map((s) => (
        <LearnCard key={s.id} s={s} />
      ))}
    </div>
  );
}

function LearnCard({ s }) {
  const [showMore, setShowMore] = useState(false);
  const hasExtras = s.extraExamples && s.extraExamples.length > 0;

  const body = s.multiDay ? (
    <>
      {s.days.map((d, i) => (
        <div key={i} className="space-y-1" data-testid={`learn-card-${s.id}-day-${i}`}>
          <div className="flex items-center justify-between px-1">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">{d.label}</p>
            {i < s.days.length - 1 && (
              <p className="text-[9.5px] text-[#94A3B8] italic">continues overnight ↓</p>
            )}
          </div>
          <EldGrid
            entries={d.log}
            brackets={[...(d.qualifyingBrackets || []), ...(d.countedBrackets || [])]}
            shiftMarkers={d.shiftMarkers || []}
            compact
          />
        </div>
      ))}
      <ScenarioExplanation note={s.pairingNote} description={s.description} />
    </>
  ) : (
    <>
      <EldGrid
        entries={s.log}
        brackets={[...(s.qualifyingBrackets || []), ...(s.countedBrackets || [])]}
        shiftMarkers={s.shiftMarkers || []}
        compact
      />
      <ScenarioExplanation note={s.pairingNote} description={s.description} />
    </>
  );

  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden" data-testid={`learn-card-${s.id}`}>
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2">
        {s.multiDay && <span className="text-[9px] font-bold uppercase tracking-wider bg-[#002855] text-[#D4AF37] rounded px-1.5 py-0.5">Multi-day</span>}
        <p className="text-sm font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{s.title}</p>
      </div>
      <div className="p-3 space-y-3">{body}</div>

      {hasExtras && (
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-white transition-colors"
            data-testid={`learn-more-btn-${s.id}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-[12px] font-bold">
                {showMore ? "−" : "+"}
              </div>
              <p className="text-[12px] font-bold text-[#002855]">
                {showMore ? "Hide extra examples" : `Show ${s.extraExamples.length} more example${s.extraExamples.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <p className="text-[10px] text-[#64748B]">{s.extraExamples.map((e) => e.name).join(" · ")}</p>
          </button>
          {showMore && (
            <div className="px-3 pb-3 pt-1 space-y-3 bg-white" data-testid={`learn-extras-${s.id}`}>
              {s.extraExamples.map((ex, i) => (
                <LearnExtra key={i} ex={ex} parentId={s.id} idx={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LearnExtra({ ex, parentId, idx }) {
  const testid = `learn-extra-${parentId}-${idx}`;
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden" data-testid={testid}>
      <div className="bg-[#FFFBEB] border-b border-[#D4AF37]/40 px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37]">Example {idx + 2}</span>
        <p className="text-[12px] font-bold text-[#002855]" style={{ fontFamily: "Outfit, sans-serif" }}>{ex.name}</p>
        {ex.multiDay && <span className="text-[9px] font-bold uppercase tracking-wider bg-[#002855] text-[#D4AF37] rounded px-1 py-0.5 ml-auto">Multi-day</span>}
      </div>
      <div className="p-2.5 space-y-2">
        {ex.multiDay ? (
          ex.days.map((d, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{d.label}</p>
                {i < ex.days.length - 1 && (
                  <p className="text-[9px] text-[#94A3B8] italic">continues overnight ↓</p>
                )}
              </div>
              <EldGrid
                entries={d.log}
                brackets={[...(d.qualifyingBrackets || []), ...(d.countedBrackets || [])]}
                shiftMarkers={d.shiftMarkers || []}
                compact
              />
            </div>
          ))
        ) : (
          <>
            <EldGrid
              entries={ex.log}
              brackets={[...(ex.qualifyingBrackets || []), ...(ex.countedBrackets || [])]}
              shiftMarkers={ex.shiftMarkers || []}
              compact
            />
          </>
        )}
        <ScenarioExplanation note={ex.pairingNote} description={ex.description} small />
      </div>
    </div>
  );
}

/* ────────────────────────── Learn-only ──────────────────────────
 * The interactive practice flow that lived on a "Practice" tab here was
 * moved to /hours-of-service/practice (Split Sleeper category) so all
 * practice scenarios share one home and one runner. The header has a
 * "Practice" shortcut button that jumps directly there. */
