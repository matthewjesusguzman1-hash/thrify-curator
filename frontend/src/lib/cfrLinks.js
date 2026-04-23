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
const ECFR_BASE = "https://www.ecfr.gov/current/title-49/section-";

function cfrUrl(section) {
  return `${ECFR_BASE}${section}`;
}

/** Parse a text string and return an array of strings + {href,label} objects. */
export function linkifyCitation(text) {
  if (!text) return [];
  const out = [];
  let last = 0;
  let m;
  SECTION_REGEX.lastIndex = 0;
  while ((m = SECTION_REGEX.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const section = `${m[1]}.${m[2]}`;
    out.push({ href: cfrUrl(section), label: m[0].replace(/\s+/g, "") });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Render a string with auto-linked §section references. */
export function CfrText({ text, className = "", linkClassName = "" }) {
  const parts = linkifyCitation(text);
  if (parts.length === 0) return null;
  return (
    <span className={className}>
      {parts.map((p, i) => typeof p === "string" ? (
        <span key={i}>{p}</span>
      ) : (
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
      ))}
    </span>
  );
}
