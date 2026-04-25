import { EldGrid } from "../EldGrid";

/** Readonly context strip for showing a prior-day or post-day log alongside
 *  the active scenario. Used by both the 8-day runner (prior-day reset
 *  context) and the multi-day runner. */
export function ContextDayStrip({ label, log, note, testid }) {
  return (
    <section className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] overflow-hidden opacity-90" data-testid={testid}>
      <div className="bg-[#E2E8F0]/60 px-3 py-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Context · readonly</span>
        <p className="text-[12px] font-bold text-[#475569]">{label}</p>
      </div>
      <div className="p-2">
        <EldGrid entries={log} />
        {note && (
          <p className="text-[11px] text-[#64748B] leading-relaxed mt-1.5 px-1 italic">{note}</p>
        )}
      </div>
    </section>
  );
}
