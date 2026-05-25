export type VisualMode =
  | "liquidGlass"
  | "wireframe"
  | "particleSwarm"
  | "radialFFT";

export interface ClipRange {
  start: number;
  end: number;
}

export interface TextOverlayConfig {
  trackName: string;
  producerHandle: string;
  enabled: boolean;
}

export interface RenderFormat {
  width: number;
  height: number;
  fps: number;
}

export interface RenderParams {
  seed: number;

  mode: VisualMode;

  palette: string;

  sensitivity: number;
  smoothing: number;

  clip: ClipRange;

  text: TextOverlayConfig;

  format: RenderFormat;

  outputFileName: string;

  useAlbumArt?: boolean;
  albumArtPath?: string;

  dropThreshold?: number;
}