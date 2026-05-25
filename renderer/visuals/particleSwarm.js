import { mulberry32 } from '../prng.js';

/**
 * Initializes a deterministic particle ecosystem array based on a seed.
 * Called once at the beginning of a video render cycle.
 */
export function createParticleSystem(seed, width, height) {
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
}

/**
 * Updates physics state positions and renders particles to the canvas context.
 * Called continuously inside the main execution loop (once per frame).
 */
export function renderParticles({
  ctx,
  frameData,
  width,
  height,
  palette,
  particles
}) {
  // Clear canvas backplate using theme background colors
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // Scale particle velocity dynamically based on the current frame's RMS energy
  const energy = frameData.rms * 4;

  for (const p of particles) {
    p.x += p.vx * energy;
    p.y += p.vy * energy;

    // Standard screen edge-wrapping canvas wrap-around bounds checks
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // Draw individual node points
    ctx.beginPath();
    ctx.fillStyle = palette.primary;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trigger a heavy visual shockwave ring if the current frame hits a drop onset
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