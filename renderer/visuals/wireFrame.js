/**
 * wireFrame.js
 *
 * Canvas-native perspective wireframe grid — no headless WebGL dependency.
 * The original file only exported createWireframeRenderer; render.js was trying
 * to import renderWireframe (which didn't exist), silently falling back every time.
 */

export function renderWireframe({ ctx, frameData, width, height, palette, time }) {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const bass       = frameData.fft.subBass * 0.003;
  const rms        = frameData.rms;
  const centerX    = width  / 2;
  const horizonY   = height * 0.42;

  const cols = 22;
  const rows = 18;

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth   = 1.2;
  ctx.globalAlpha = 0.75;

  // Build a perspective grid with wave deformation driven by audio
  function gridPoint(col, row) {
    const tc = col / cols;  // 0..1 across
    const tr = row / rows;  // 0..1 deep

    // Perspective: lines converge toward vanishing point
    const spread = 0.1 + tr * 0.9;
    const x      = centerX + (tc - 0.5) * width * spread;

    // Vertical position: top = horizon, bottom = screen bottom
    const baseY  = horizonY + (height - horizonY) * tr;

    // Wave deformation — deeper rows react more, bass drives amplitude
    const wave = Math.sin(tc * Math.PI * 3 + time * 2 + tr * 4) * 28 * (1 + bass) * tr;
    const bump = frameData.isDrop ? Math.sin(tr * Math.PI) * 60 : 0;

    return { x, y: baseY + wave + bump };
  }

  // Horizontal lines (rows going into the distance)
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const { x, y } = gridPoint(c, r);
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Vertical lines (columns running toward horizon)
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const { x, y } = gridPoint(c, r);
      r === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Drop flash
  if (frameData.isDrop) {
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth   = 8;
    ctx.beginPath();
    ctx.arc(centerX, horizonY, height * 0.08 + rms * 200, 0, Math.PI * 2);
    ctx.stroke();
  }
}
