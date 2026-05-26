/**
 * render.js — Node.js renderer
 *
 * Usage (called by cli.py):
 *   node render.js <analysis.json> <params.json>
 *
 * Reads analysis data + render params, draws every frame to a canvas,
 * then stitches frames + audio into the final MP4 via ffmpeg.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { mkdirp } from 'mkdirp';

import { palettes } from './colorPalettes.js';
import { mulberry32 } from './prng.js';

import { renderLiquidGlass }               from './visuals/liquidGlass.js';
import { createParticleSystem, renderParticles } from './visuals/particleSwarm.js';
import { renderRadialFFT }                 from './visuals/radialFFT.js';

import { composeFrame } from './frameCompositor.js';

// ── Setup ─────────────────────────────────────────────────────────────────────

ffmpeg.setFfmpegPath(ffmpegPath);

const [,, analysisPath, paramsPath, audioPath] = process.argv;

if (!analysisPath || !paramsPath) {
  console.error('Usage: node render.js <analysis.json> <params.json> [audio.wav]');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
const params   = JSON.parse(fs.readFileSync(paramsPath,   'utf-8'));

const { width, height, fps } = params.format;
const palette = palettes[params.palette] ?? palettes.cyberpunk;
const rng     = mulberry32(params.seed);

// Clip range
const clipStart = params.clip.start ?? 0;
const clipEnd   = Math.min(params.clip.end ?? analysis.duration, analysis.duration);

const firstFrame = Math.floor(clipStart * fps);
const lastFrame  = Math.min(Math.floor(clipEnd * fps), analysis.totalFrames - 1);
const frameCount = lastFrame - firstFrame;

console.log(`  Clip: frames ${firstFrame}–${lastFrame} (${frameCount} frames)`);

// ── Canvas ────────────────────────────────────────────────────────────────────

const canvas = createCanvas(width, height);
const ctx    = canvas.getContext('2d');

// ── Visual mode state ─────────────────────────────────────────────────────────

let particles = null;
if (params.mode === 'particleSwarm') {
  particles = createParticleSystem(params.seed, width, height);
}

// ── Frame output dir ──────────────────────────────────────────────────────────

const framesDir = path.join(path.dirname(analysisPath), 'frames');
await mkdirp(framesDir);

// ── Render loop ───────────────────────────────────────────────────────────────

const sensitivity = params.sensitivity ?? 1.0;
const smoothing   = params.smoothing   ?? 0.85;

// Simple exponential smoother state per visual
let smoothedRms  = 0;
let smoothedBass = 0;

const PROGRESS_EVERY = Math.max(1, Math.floor(frameCount / 20)); // log ~20 times

for (let fi = 0; fi < frameCount; fi++) {
  const frameIndex = firstFrame + fi;
  const frameData  = analysis.frames[frameIndex];

  // Smooth RMS and bass for less jittery visuals
  smoothedRms  = smoothing * smoothedRms  + (1 - smoothing) * frameData.rms  * sensitivity;
  smoothedBass = smoothing * smoothedBass + (1 - smoothing) * frameData.fft.subBass * sensitivity;

  // Augment frameData with smoothed values (non-destructive clone)
  const fd = {
    ...frameData,
    rms:         smoothedRms,
    fft: {
      ...frameData.fft,
      subBass: smoothedBass
    }
  };

  const time = fd.time;

  // ── Draw visual ─────────────────────────────────────────────────────────────
  switch (params.mode) {
    case 'liquidGlass':
      renderLiquidGlass({ ctx, frameData: fd, width, height, palette, rng, time });
      break;

    case 'particleSwarm':
      renderParticles({ ctx, frameData: fd, width, height, palette, particles });
      break;

    case 'radialFFT':
      renderRadialFFT({ ctx, frameData: fd, width, height, palette });
      break;

    case 'wireframe':
      // wireframe uses headless WebGL; fallback to radialFFT if gl isn't available
      try {
        const { renderWireframe } = await import('./visuals/wireFrame.js');
        renderWireframe({ ctx, frameData: fd, width, height, palette, time });
      } catch {
        renderRadialFFT({ ctx, frameData: fd, width, height, palette });
      }
      break;

    default:
      renderParticles({ ctx, frameData: fd, width, height, palette, particles });
  }

  // ── Text overlay ────────────────────────────────────────────────────────────
  composeFrame({ ctx, params, width, height });

  // ── Save frame as PNG ───────────────────────────────────────────────────────
  const framePath = path.join(framesDir, `frame_${String(fi).padStart(6, '0')}.png`);
  const buffer    = canvas.toBuffer('image/png');
  fs.writeFileSync(framePath, buffer);

  if (fi % PROGRESS_EVERY === 0 || fi === frameCount - 1) {
    const pct = Math.round((fi / frameCount) * 100);
    process.stdout.write(`  Rendering... ${pct}%\r`);
  }
}

process.stdout.write('\n');
console.log('  Frames rendered. Encoding video...');

// ── Stitch frames into MP4 ────────────────────────────────────────────────────

const outputPath = path.resolve(params.outputFileName);
const frameGlob  = path.join(framesDir, 'frame_%06d.png');

await new Promise((resolve, reject) => {
  const cmd = ffmpeg()
    .input(frameGlob)
    .inputOptions([`-framerate ${fps}`]);

  // Mux audio when provided (wav, mp3, or extracted audio from video)
  if (audioPath && fs.existsSync(audioPath)) {
    cmd.input(audioPath)
       .inputOptions([`-ss ${clipStart}`, `-to ${clipEnd}`]);
  }

  cmd
    .videoCodec('libx264')
    .outputOptions([
      '-pix_fmt yuv420p',
      '-crf 18',
      '-preset fast',
      `-vf scale=${width}:${height}`,
      ...(audioPath && fs.existsSync(audioPath) ? ['-c:a aac', '-b:a 192k', '-shortest'] : [])
    ])
    .output(outputPath)
    .on('end', resolve)
    .on('error', reject)
    .run();
});

// ── Cleanup frames ────────────────────────────────────────────────────────────

fs.readdirSync(framesDir)
  .filter(f => f.endsWith('.png'))
  .forEach(f => fs.unlinkSync(path.join(framesDir, f)));

console.log(`  Encoded → ${outputPath}`);
