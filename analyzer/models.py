from typing import List, Optional
from pydantic import BaseModel


# ── Audio Analysis Models ─────────────────────────────────────────────────────

class FFTBands(BaseModel):
    subBass: float    # 20-60Hz
    bass: float       # 60-250Hz
    lowMid: float     # 250-500Hz
    mid: float        # 500Hz-2kHz
    highMid: float    # 2kHz-4kHz
    presence: float   # 4kHz-6kHz
    brilliance: float # 6kHz-20kHz


class AnalysisFrame(BaseModel):
    frame: int
    time: float

    rms: float
    centroid: float
    zcr: float

    fft: FFTBands

    isBeat: bool
    isKick: bool
    isSnare: bool
    isDrop: bool

    onsetStrength: float


class BeatMarker(BaseModel):
    frame: int
    time: float
    strength: float


class DropMarker(BaseModel):
    frame: int
    time: float
    energyDelta: float


class AnalysisResult(BaseModel):
    version: str = "1.0.0"

    sampleRate: int
    duration: float
    fps: int
    totalFrames: int

    bpm: float

    beats: List[BeatMarker]
    drops: List[DropMarker]

    frames: List[AnalysisFrame]


# ── Render Params (replaces shared/renderParams.ts) ───────────────────────────

class ClipRange(BaseModel):
    start: float
    end: float


class TextOverlayConfig(BaseModel):
    trackName: str
    producerHandle: str
    enabled: bool = True


class RenderFormat(BaseModel):
    width: int = 1080
    height: int = 1920
    fps: int = 60


class RenderParams(BaseModel):
    seed: int

    mode: str   # liquidGlass | wireframe | particleSwarm | radialFFT
    palette: str

    sensitivity: float = 1.0
    smoothing: float = 0.85

    clip: ClipRange

    text: TextOverlayConfig

    format: RenderFormat

    outputFileName: str

    useAlbumArt: Optional[bool] = False
    albumArtPath: Optional[str] = None

    dropThreshold: Optional[float] = 1.8
