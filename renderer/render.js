import fs from 'fs';
import path from 'path';

import { createCanvas } from 'canvas';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

import { mkdirp } from 'mkdirp';

import { palettes } from './colorPalettes.js';

import { renderLiquidGlass } from './visuals/liquidGlass.js';
import {
  createParticleSystem,
  renderParticles
} from './visuals/particleSwarm.js';

import { renderRadialFFT } from './visuals/radialFFT.js';

import { composeFrame } from './frameCompositor.js';

ffmpeg.setFfmpegPath(ffmpegPath);

const analysisPath = process.argv[2];
const paramsPath = process.argv[3];

const analysis = JSON.parse(
  fs.readFileSync(analysisPath, 'utf-8')
);

const params = JSON.parse(
  fs.readFileSync(paramsPath, 'utf-8')
);

const width = params.format.width;
const height = params.format.height;
const fps = params.format.fps;

const outputDir = './frames';

await mkdirp(outputDir);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

const palette = palettes[params.palette];

const particles = createParticleSystem(
  params.seed,
  width,
  height
);

console.log('Done');