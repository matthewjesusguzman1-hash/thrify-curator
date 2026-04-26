/**
 * Highway sign renderer for the ELP road-sign test.
 *
 * Renders any sign from elpContent.ELP_SIGNS as a high-contrast SVG so the
 * inspector can hold the device up to the cab window for the driver to read.
 * SVG-based so the full set of 24 signs ships with zero asset weight and
 * scales to any size.
 *
 * Categories (matched to the agency's Attachment B):
 *   regulatory      — white rectangle, black bold text
 *   regulatory_xl   — white rectangle for multi-line dense text (4+ lines)
 *   regulatory_red  — white rectangle with RED bold text (e.g. NO PARKING)
 *   warning         — yellow diamond, black bold text
 *   warning_square  — yellow square, black bold text + optional arrow icon
 *   construction    — orange diamond, black bold text
 *   construction_h  — orange horizontal rectangle, black bold text
 *   wrongway        — red horizontal rectangle, white bold text
 *   electronic      — dark navy rectangle, amber/orange dot-matrix-style text
 *
 * Optional `sign.arrow`: "left" | "right" | "up_right" renders an MUTCD-style
 * directional arrow embedded in the sign.
 */

const PALETTE = {
  regulatory:     { bg: "#FFFFFF", fg: "#000000", border: "#000000", aspect: 0.78 }, // taller-than-wide
  regulatory_xl:  { bg: "#FFFFFF", fg: "#000000", border: "#000000", aspect: 0.85 },
  regulatory_red: { bg: "#FFFFFF", fg: "#C40000", border: "#000000", aspect: 0.78 },
  warning:        { bg: "#FFD22F", fg: "#000000", border: "#000000", aspect: 1.0 }, // diamond
  warning_square: { bg: "#FFD22F", fg: "#000000", border: "#000000", aspect: 1.0 },
  construction:   { bg: "#FF8C32", fg: "#000000", border: "#000000", aspect: 1.0 }, // diamond
  construction_h: { bg: "#FF8C32", fg: "#000000", border: "#000000", aspect: 1.6 }, // wide rect
  wrongway:       { bg: "#C40000", fg: "#FFFFFF", border: "#FFFFFF", aspect: 1.6 }, // wide rect
  electronic:     { bg: "#0B1530", fg: "#FFB000", border: "#0B1530", aspect: 2.2 }, // very wide
};

const isDiamond = (cat) => cat === "warning" || cat === "construction";
const isHorizontal = (cat) => cat === "construction_h" || cat === "wrongway" || cat === "electronic";

export function SignDisplay({ sign, size = 320 }) {
  const palette = PALETTE[sign.category] || PALETTE.regulatory;
  const lines = sign.text.split("\n");
  const isElectronic = sign.category === "electronic";

  // Compute viewBox dimensions based on aspect ratio.
  const w = palette.aspect >= 1 ? size : size * palette.aspect;
  const h = palette.aspect >= 1 ? size / palette.aspect : size;
  const vbW = palette.aspect >= 1 ? size : size * palette.aspect;
  const vbH = palette.aspect >= 1 ? size / palette.aspect : size;

  // Diamond: rotate canvas 45° around center.
  if (isDiamond(sign.category)) {
    const half = size / 2;
    const inset = size * 0.06;
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        <g transform={`translate(${half} ${half}) rotate(45)`}>
          <rect
            x={-half + inset} y={-half + inset}
            width={size - inset * 2} height={size - inset * 2}
            fill={palette.bg} stroke={palette.border}
            strokeWidth={size * 0.025} rx={size * 0.02}
          />
        </g>
        <SignBody lines={lines} cx={half} cy={half} maxW={size * 0.62} maxH={size * 0.6}
          color={palette.fg} arrow={sign.arrow} arrowColor={palette.fg} electronic={false} />
      </svg>
    );
  }

  // Rectangular signs (regulatory, square, horizontal, electronic, wrongway).
  // Use a viewBox sized to the chosen aspect ratio so the sign fills the canvas.
  const cx = vbW / 2;
  const cy = vbH / 2;
  const padX = vbW * 0.04;
  const padY = vbH * 0.06;
  const innerW = vbW - padX * 2;
  const innerH = vbH - padY * 2;
  const stroke = Math.min(vbW, vbH) * (isElectronic ? 0.012 : 0.025);

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <rect
        x={padX} y={padY} width={innerW} height={innerH}
        fill={palette.bg} stroke={palette.border}
        strokeWidth={stroke} rx={Math.min(vbW, vbH) * 0.02}
      />
      <SignBody
        lines={lines} cx={cx} cy={cy}
        maxW={innerW * 0.9} maxH={innerH * 0.85}
        color={palette.fg}
        arrow={sign.arrow}
        arrowColor={palette.fg}
        electronic={isElectronic}
        horizontal={isHorizontal(sign.category)}
      />
    </svg>
  );
}

/**
 * Centered text block (auto-fit) with optional embedded directional arrow.
 * Arrows are stacked above text for "up_right" (mimics KEEP RIGHT and RUNAWAY
 * TRUCK RAMP layout) and inline beneath the last line for left/right.
 */
function SignBody({ lines, cx, cy, maxW, maxH, color, arrow, arrowColor, electronic, horizontal }) {
  // Reserve space for arrow if present
  const arrowH = arrow ? maxH * 0.32 : 0;
  const textMaxH = maxH - arrowH;
  const fontSize = fitFontSize(lines, maxW, textMaxH, electronic ? 0.65 : 0.55, electronic);
  const lineH = fontSize * 1.12;
  const totalTextH = lines.length * lineH;

  // Layout: if arrow is "up_right" stack arrow on top, else place arrow below text.
  // ONE WAY (left arrow) layout in the form: text on top, arrow below.
  const arrowOnTop = arrow === "up_right";
  const textBlockY = arrowOnTop
    ? cy - (arrowH + totalTextH) / 2 + arrowH + lineH * 0.78
    : cy - (totalTextH + arrowH) / 2 + lineH * 0.78;
  const arrowCY = arrowOnTop
    ? cy - (arrowH + totalTextH) / 2 + arrowH * 0.5
    : cy + (totalTextH - arrowH) / 2 + arrowH * 0.6;

  return (
    <g>
      {arrow && (
        <Arrow direction={arrow} cx={cx} cy={arrowCY} size={arrowH * 0.85} color={arrowColor} />
      )}
      {lines.map((ln, i) => (
        <text
          key={i}
          x={cx}
          y={textBlockY + i * lineH}
          textAnchor="middle"
          fontFamily={electronic ? "'Courier New','Roboto Mono',monospace" : "'Highway Gothic','Roboto Condensed','Arial Black',sans-serif"}
          fontWeight={electronic ? 700 : 900}
          fontSize={fontSize}
          fill={color}
          letterSpacing={electronic ? fontSize * 0.04 : fontSize * 0.02}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

/**
 * Simple MUTCD-style block arrow for ONE WAY / KEEP RIGHT / RUNAWAY TRUCK RAMP.
 */
function Arrow({ direction, cx, cy, size, color }) {
  const half = size / 2;
  // Build a left-pointing arrow path centered at origin then rotate.
  // Path: arrowhead triangle on the left + horizontal shaft on the right.
  const shaftH = size * 0.32;
  const headW = size * 0.45;
  const path = `
    M ${-half} 0
    L ${-half + headW} ${-half}
    L ${-half + headW} ${-shaftH / 2}
    L ${half} ${-shaftH / 2}
    L ${half} ${shaftH / 2}
    L ${-half + headW} ${shaftH / 2}
    L ${-half + headW} ${half}
    Z
  `;
  const rotation = direction === "left" ? 180 : direction === "up_right" ? -45 : 0;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotation})`}>
      <path d={path} fill={color} />
    </g>
  );
}

/**
 * Auto-fit text size so the longest line fits the maxW and the line stack
 * fits maxH. `widthFactor` adjusts character width estimate (electronic is
 * monospaced — wider chars).
 */
function fitFontSize(lines, maxW, maxH, widthFactor = 0.55, electronic = false) {
  const longest = lines.reduce((mx, l) => Math.max(mx, l.length), 1);
  const widthBased = maxW / Math.max(longest * widthFactor, 1);
  const heightBased = maxH / Math.max(lines.length * 1.15, 1);
  const cap = electronic ? maxH * 0.42 : maxH * 0.55;
  return Math.min(widthBased, heightBased, cap);
}
