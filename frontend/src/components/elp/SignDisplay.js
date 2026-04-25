/**
 * Single-image highway sign renderer for the ELP road sign test.
 *
 * Renders any sign from elpContent.ELP_SIGNS as a big, easy-to-view SVG so
 * the inspector can hold the device up to the cab window for the driver to
 * read. We render to SVG (not bitmap) so a full set of 24 signs ships at
 * essentially zero asset weight and scales cleanly on any device.
 *
 * Categories (from ELP_SIGNS):
 *   regulatory   — white rectangle, black 8px border, black bold text
 *   warning      — yellow diamond, black 8px border, black bold text
 *   construction — orange diamond, black 8px border, black bold text
 *   guide        — black rectangle, white text (truck-route advisories)
 *   wrongway     — red horizontal rectangle, white bold text
 */

const PALETTE = {
  regulatory:   { bg: "#FFFFFF", fg: "#000000", border: "#000000", shape: "rect" },
  warning:      { bg: "#FFD22F", fg: "#000000", border: "#000000", shape: "diamond" },
  construction: { bg: "#FF8C32", fg: "#000000", border: "#000000", shape: "diamond" },
  guide:        { bg: "#000000", fg: "#FFFFFF", border: "#FFFFFF", shape: "rect" },
  wrongway:     { bg: "#C40000", fg: "#FFFFFF", border: "#FFFFFF", shape: "rect" },
};

export function SignDisplay({ sign, size = 320 }) {
  const palette = PALETTE[sign.category] || PALETTE.regulatory;
  const lines = sign.text.split("\n");
  const fontSize = lineFontSize(lines, size);

  // Diamond signs: rotate the canvas 45° around the center; render text
  // upright over the rotated background. Standard MUTCD warning/construction
  // diamonds are ~1.0:1.0 with horizontal text inside the diamond.
  if (palette.shape === "diamond") {
    const half = size / 2;
    const inset = size * 0.06;
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" style={{ display: "block" }}>
        {/* Rotated diamond background */}
        <g transform={`translate(${half} ${half}) rotate(45)`}>
          <rect x={-half + inset} y={-half + inset} width={size - inset * 2} height={size - inset * 2}
            fill={palette.bg} stroke={palette.border} strokeWidth={size * 0.025} rx={size * 0.02} />
        </g>
        {/* Upright text on top */}
        <SignText lines={lines} cx={half} cy={half} fontSize={fontSize} color={palette.fg} />
      </svg>
    );
  }

  // Rectangle signs.
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" style={{ display: "block" }}>
      <rect x={size * 0.03} y={size * 0.12} width={size * 0.94} height={size * 0.76}
        fill={palette.bg} stroke={palette.border} strokeWidth={size * 0.025} rx={size * 0.02} />
      <SignText lines={lines} cx={size / 2} cy={size / 2} fontSize={fontSize} color={palette.fg} />
    </svg>
  );
}

function SignText({ lines, cx, cy, fontSize, color }) {
  const lineH = fontSize * 1.1;
  const totalH = lines.length * lineH;
  const startY = cy - totalH / 2 + lineH * 0.78;
  return (
    <g>
      {lines.map((ln, i) => (
        <text
          key={i}
          x={cx}
          y={startY + i * lineH}
          textAnchor="middle"
          fontFamily="'Highway Gothic','Roboto Condensed','Arial Black',sans-serif"
          fontWeight="900"
          fontSize={fontSize}
          fill={color}
          letterSpacing={fontSize * 0.02}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

// Auto-fit font size to the longest line + line count so the text always
// fills most of the sign without overflowing.
function lineFontSize(lines, size) {
  const longest = lines.reduce((mx, l) => Math.max(mx, l.length), 1);
  const widthBased = (size * 0.78) / Math.max(longest * 0.55, 1);
  const heightBased = (size * 0.62) / Math.max(lines.length * 1.05, 1);
  return Math.min(widthBased, heightBased, size * 0.18);
}
