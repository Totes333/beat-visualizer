import { drawTextOverlay } from './textOverlay.js';

export function composeFrame({
  ctx,
  params,
  width,
  height
}) {
  drawTextOverlay(
    ctx,
    params,
    width,
    height
  );
}