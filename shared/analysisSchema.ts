export interface FFTBands {
  subBass: number;     // 20-60Hz
  bass: number;        // 60-250Hz
  lowMid: number;      // 250-500Hz
  mid: number;         // 500Hz-2kHz
  highMid: number;     // 2kHz-4kHz
  presence: number;    // 4kHz-6kHz
  brilliance: number;  // 6kHz-20kHz
}

export interface AnalysisFrame {
  frame: number;
  time: number;

  rms: number;
  centroid: number;
  zcr: number;

  fft: FFTBands;

  isBeat: boolean;
  isKick: boolean;
  isSnare: boolean;
  isDrop: boolean;

  onsetStrength: number;
}

export interface DropMarker {
  frame: number;
  time: number;
  energyDelta: number;
}

export interface BeatMarker {
  frame: number;
  time: number;
  strength: number;
}

export interface AnalysisData {
  version: string;

  sampleRate: number;
  duration: number;
  fps: number;
  totalFrames: number;

  bpm: number;

  beats: BeatMarker[];
  drops: DropMarker[];

  frames: AnalysisFrame[];
}