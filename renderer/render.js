/**
 * render.js — Node.js renderer
 *
 * Usage (called by cli.py):
 *   node render.js <analysis.json> <params.json> [audio_path]
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

import { renderLiquidGlass }                    from './visuals/liquidGlass.js';
import { createParticleSystem, renderParticles } from './visuals/particleSwarm.js';
import { renderRadialFFT }                       from './visuals/radialFFT.js';
import { renderWireframe }                       from './visuals/wireFrame.js';

import { composeFrame } from './frameCompositor.js';

// ── Setup ─────────────────────────────────────────────────────────────────────

// FIX: ffmpeg-static can return null on some platforms; guard before setting.
if (!ffmpegPath) {
  console.error('ERROR: ffmpeg-static returned null. Install ffmpeg system-wide and ensure it is on PATH.');
  process.exit(1);
}
ffmpeg.setFfmpegPath(ffmpegPath);

const [,, analysisPath, paramsPath, audioPath] = process.argv;

if (!analysisPath || !paramsPath) {
  console.error('Usage: node render.js <analysis.json> <params.json> [audio_path]');
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

if (frameCount <= 0) {
  console.error(`ERROR: clip range produces 0 frames (start=${clipStart}, end=${clipEnd})`);
  process.exit(1);
}

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

let smoothedRms  = 0;
let smoothedBass = 0;

const PROGRESS_EVERY = Math.max(1, Math.floor(frameCount / 20));

for (let fi = 0; fi < frameCount; fi++) {
  const frameIndex = firstFrame + fi;
  const frameData  = analysis.frames[frameIndex];

  // Exponential smoothing for less jittery visuals
  smoothedRms  = smoothing * smoothedRms  + (1 - smoothing) * frameData.rms          * sensitivity;
  smoothedBass = smoothing * smoothedBass + (1 - smoothing) * frameData.fft.subBass  * sensitivity;

  const fd = {
    ...frameData,
    rms: smoothedRms,
    fft: { ...frameData.fft, subBass: smoothedBass }
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
      renderWireframe({ ctx, frameData: fd, width, height, palette, time });
      break;

    default:
      renderParticles({ ctx, frameData: fd, width, height, palette, particles });
  }

  // ── Text overlay ────────────────────────────────────────────────────────────
  composeFrame({ ctx, params, width, height });

  // ── Save frame as PNG ───────────────────────────────────────────────────────
  const framePath = path.join(framesDir, `frame_${String(fi).padStart(6, '0')}.png`);
  fs.writeFileSync(framePath, canvas.toBuffer('image/png'));

  if (fi % PROGRESS_EVERY === 0 || fi === frameCount - 1) {
    const pct = Math.round((fi / frameCount) * 100);
    process.stdout.write(`  Rendering... ${pct}%\r`);
  }
}

process.stdout.write('\n');
console.log('  Frames rendered. Encoding video...');

// ── Stitch frames into MP4 ────────────────────────────────────────────────────

const outputPath = params.outputFileName; // already absolute — set by cli.py
const frameGlob  = path.join(framesDir, 'frame_%06d.png');

const hasAudio      = Boolean(audioPath && fs.existsSync(audioPath));
const audioDuration = clipEnd - clipStart; // seconds of audio to include

await new Promise((resolve, reject) => {
  const cmd = ffmpeg()
    .input(frameGlob)
    .inputOptions([`-framerate ${fps}`]);

  if (hasAudio) {
    cmd
      .input(audioPath)
      // FIX: -ss as input option = seek before reading (fast).
      // FIX: Do NOT use -to as input option alongside -ss — after seeking,
      //      output timestamps start from 0 but -to refers to original file time,
      //      which breaks clips where start > 0. Use -t (duration) on the output instead.
      .inputOptions([`-ss ${clipStart}`]);
  }

  const outputOptions = [
    '-pix_fmt yuv420p',
    '-crf 18',
    '-preset fast',
    `-vf scale=${width}:${height}`,
  ];

  if (hasAudio) {
    outputOptions.push(
      // FIX: explicit stream mapping required when there are two inputs.
      // Without -map, ffmpeg may silently pick wrong streams or fail.
      '-map 0:v',       // video from input 0 (frame sequence)
      '-map 1:a',       // audio from input 1 (audio file)
      '-c:a aac',
      '-b:a 192k',
      `-t ${audioDuration}`, // FIX: duration-based trim, not -to, so seek offset doesn't matter
      '-shortest'       // stop when the shorter stream ends (safety net)
    );
  }

  cmd
    .videoCodec('libx264')
    .outputOptions(outputOptions)
    .output(outputPath)
    // FIX: log the actual ffmpeg error message so failures aren't silent
    .on('error', (err, stdout, stderr) => {
      console.error('\nFFmpeg error:', err.message);
      if (stderr) console.error('FFmpeg stderr:\n', stderr);
      reject(err);
    })
    .on('end', resolve)
    .run();
});

// ── Cleanup frames ────────────────────────────────────────────────────────────

fs.readdirSync(framesDir)
  .filter(f => f.endsWith('.png'))
  .forEach(f => fs.unlinkSync(path.join(framesDir, f)));

console.log(`  Encoded → ${outputPath}`);
