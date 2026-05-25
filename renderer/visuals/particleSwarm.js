import { mulberry32 } from '../prng.js';
  const rng = mulberry32(seed);

  const particles = [];

  for (let i = 0; i < 800; i++) {
    particles.push({
      x: rng() * width,
      y: rng() * height,
      vx: (rng() - 0.5) * 2,
      vy: (rng() - 0.5) * 2,
      size: 1 + rng() * 3
    });
  }

  return particles;


export function renderParticles({
  ctx,
  frameData,
  width,
  height,
  palette,
  particles
}) {
  ctx.fillStyle = palette.bg;

  ctx.fillRect(0, 0, width, height);

  const energy = frameData.rms * 4;

  for (const p of particles) {
    p.x += p.vx * energy;
    p.y += p.vy * energy;

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    ctx.beginPath();

    ctx.fillStyle = palette.primary;

    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

    ctx.fill();
  }

  if (frameData.isDrop) {
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.arc(
      width / 2,
      height / 2,
      height * 0.35,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }
}