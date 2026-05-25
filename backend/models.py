from typing import List, Optional
from pydantic import BaseModel


class FFTBands(BaseModel):
    subBass: float
    bass: float
    lowMid: float
    mid: float
    highMid: float
    presence: float
    brilliance: float


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

    mode: str
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