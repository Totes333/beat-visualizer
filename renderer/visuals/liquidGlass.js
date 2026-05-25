export function renderLiquidGlass({
  ctx,
  frameData,
  width,
  height,
  palette,
  rng,
  time
}) {
  ctx.fillStyle = palette.bg;

  ctx.fillRect(0, 0, width, height);

  const pulse = 1 + frameData.fft.subBass * 0.004;

  const orbCount = 6;

  for (let i = 0; i < orbCount; i++) {
    const x = width * (0.2 + i * 0.12);

    const y = height * (
      0.2 +
      0.1 * Math.sin(time * 0.5 + i)
    );

    const radius =
      180 * pulse +
      Math.sin(time + i) * 30;

    const gradient = ctx.createRadialGradient(
      x,
      y,
      radius * 0.1,
      x,
      y,
      radius
    );

    gradient.addColorStop(0, palette.primary);

    gradient.addColorStop(1, 'transparent');

    ctx.globalCompositeOperation = 'lighter';

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(x, y, radius, 0, Math.PI * 2);

    ctx.fill();
  }

  if (frameData.isDrop) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';

    ctx.fillRect(0, 0, width, height);
  }

  ctx.globalCompositeOperation = 'source-over';
}