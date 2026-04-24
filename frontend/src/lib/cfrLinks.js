/**
 * cfrLinks.js — tiny utility that turns any "§XXX.Y(letters/digits)" reference
 * into a clickable link to the current eCFR text. Used everywhere HOS training
 * references a regulation so inspectors can jump to the authoritative source.
 *
 *   • §395.1              → https://www.ecfr.gov/current/title-49/section-395.1
 *   • §395.1(g)(1)(ii)    → https://www.ecfr.gov/current/title-49/section-395.1
 *                            (same section; subsection anchors vary across
 *                             CFR editions so we link to the section page)
 *   • §390.38(b)          → https://www.ecfr.gov/current/title-49/section-390.38
 */

const SECTION_REGEX = /§\s*(\d+)\.(\d+)((?:\s*\([a-z0-9]+\))*)/gi;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;
const ECFR_BASE = "https://www.ecfr.gov/current/title-49/section-";

function cfrUrl(section) {
  return `${ECFR_BASE}${section}`;
}

/** Parse a text string into an array of: strings | {href,label} | {bold:string}. */
export function linkifyCitation(text) {
  if (!text) return [];
  // First pass — split by bold markers so we can run the CFR regex on the
  // plain-text pieces only (bold content is typically plain English, never CFR).
  const boldParts = [];
  let last = 0;
  let bm;
  BOLD_REGEX.lastIndex = 0;
  while ((bm = BOLD_REGEX.exec(text)) !== null) {
    if (bm.index > last) boldParts.push({ kind: "plain", text: text.slice(last, bm.index) });
    boldParts.push({ kind: "bold", text: bm[1] });
    last = bm.index + bm[0].length;
  }
  if (last < text.length) boldParts.push({ kind: "plain", text: text.slice(last) });
  if (boldParts.length === 0) boldParts.push({ kind: "plain", text });

  // Second pass — within each PLAIN segment, link §XXX.Y citations.
  const out = [];
  boldParts.forEach((seg) => {
    if (seg.kind === "bold") { out.push({ bold: seg.text }); return; }
    let segLast = 0;
    let m;
    SECTION_REGEX.lastIndex = 0;
    while ((m = SECTION_REGEX.exec(seg.text)) !== null) {
      if (m.index > segLast) out.push(seg.text.slice(segLast, m.index));
      const section = `${m[1]}.${m[2]}`;
      out.push({ href: cfrUrl(section), label: m[0].replace(/\s+/g, "") });
      segLast = m.index + m[0].length;
    }
    if (segLast < seg.text.length) out.push(seg.text.slice(segLast));
  });
  return out;
}

/** Render a string with auto-linked §section references + **bold** segments. */
export function CfrText({ text, className = "", linkClassName = "" }) {
  const parts = linkifyCitation(text);
  if (parts.length === 0) return null;
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (typeof p === "string") return <span key={i}>{p}</span>;
        if (p.bold !== undefined) return <strong key={i} className="font-bold text-[#002855]">{p.bold}</strong>;
        return (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline decoration-dotted underline-offset-2 hover:decoration-solid hover:text-[#D4AF37] transition-colors ${linkClassName}`}
            data-testid="cfr-link"
            onClick={(e) => e.stopPropagation()}
          >
            {p.label}
          </a>
        );
      })}
    </span>
  );
}
