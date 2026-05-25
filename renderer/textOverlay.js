export function drawTextOverlay(ctx, params, width, height) {
  if (!params.text?.enabled) {
    return;
  }

  const leftX = width * 0.12;
  const centerY = height * 0.48;

  ctx.save();

  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,255,255,0.95)';

  ctx.font = 'bold 64px Arial';

  ctx.fillText(
    params.text.trackName,
    leftX,
    centerY
  );

  ctx.font = '36px Arial';

  ctx.fillStyle = 'rgba(255,255,255,0.72)';

  ctx.fillText(
    params.text.producerHandle,
    leftX,
    centerY + 56
  );

  ctx.restore();
}