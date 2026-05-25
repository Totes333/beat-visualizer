export function renderRadialFFT({
  ctx,
  frameData,
  width,
  height,
  palette
}) {
  ctx.fillStyle = palette.bg;

  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;

  const values = Object.values(frameData.fft);

  const totalBars = values.length;

  for (let i = 0; i < totalBars; i++) {
    const angle = (i / totalBars) * Math.PI * 2;

    const value = values[i];

    const length = 160 + value * 0.03;

    const x1 = centerX + Math.cos(angle) * 180;
    const y1 = centerY + Math.sin(angle) * 180;

    const x2 = centerX + Math.cos(angle) * length;
    const y2 = centerY + Math.sin(angle) * length;

    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 14;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle = palette.secondary;
  ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
  ctx.fill();
}