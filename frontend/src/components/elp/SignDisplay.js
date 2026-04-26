/**
 * Highway sign renderer for the ELP road-sign test.
 *
 * Uses pixel-perfect crops of the agency Attachment B chart, served from
 * /elp-signs/sign-{id}.png. The image is rendered at the requested size with
 * `object-contain` so it always fits, never crops, and preserves the original
 * shape (vertical rectangles, diamonds, horizontal banners, electronic
 * message signs).
 */

export function SignDisplay({ sign, size = 320, fullscreen = false }) {
  return (
    <img
      src={`/elp-signs/sign-${sign.id}.png`}
      alt={sign.meaning}
      width={size}
      height={size}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        // The fullscreen Show-to-Driver mode needs no surrounding chrome —
        // the parent container handles centering on a black background.
        background: fullscreen ? "transparent" : "transparent",
      }}
      draggable={false}
    />
  );
}
