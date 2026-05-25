import numpy as np
import librosa

from models import (
    AnalysisResult,
    AnalysisFrame,
    FFTBands,
    BeatMarker,
    DropMarker
)

from drop_detector import detect_drops


TARGET_FPS = 60


def hz_band_energy(
    stft_magnitude,
    freqs,
    low,
    high
):
    idx = np.where(
        (freqs >= low) & (freqs < high)
    )[0]

    if len(idx) == 0:
        return np.zeros(stft_magnitude.shape[1])

    return np.mean(
        stft_magnitude[idx],
        axis=0
    )


def interpolate_feature(
    feature,
    original_times,
    target_times
):
    return np.interp(
        target_times,
        original_times,
        feature
    )


def analyze_audio(
    audio_path: str,
    fps: int = TARGET_FPS,
    drop_threshold: float = 1.8
):
    y, sr = librosa.load(
        audio_path,
        sr=44100,
        mono=True
    )

    duration = librosa.get_duration(y=y, sr=sr)

    total_frames = int(duration * fps)

    target_times = np.arange(total_frames) / fps

    hop_length = 512
    n_fft = 2048

    # -----------------------------
    # STFT
    # -----------------------------

    stft = librosa.stft(
        y,
        n_fft=n_fft,
        hop_length=hop_length
    )

    magnitude = np.abs(stft)

    stft_times = librosa.frames_to_time(
        np.arange(magnitude.shape[1]),
        sr=sr,
        hop_length=hop_length
    )

    freqs = librosa.fft_frequencies(
        sr=sr,
        n_fft=n_fft
    )

    # -----------------------------
    # Core Features
    # -----------------------------

    rms = librosa.feature.rms(
        S=magnitude
    )[0]

    centroid = librosa.feature.spectral_centroid(
        S=magnitude,
        sr=sr
    )[0]

    zcr = librosa.feature.zero_crossing_rate(
        y,
        hop_length=hop_length
    )[0]

    onset_env = librosa.onset.onset_strength(
        y=y,
        sr=sr,
        hop_length=hop_length
    )

    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env,
        sr=sr,
        hop_length=hop_length
    )

    beat_times = librosa.frames_to_time(
        beat_frames,
        sr=sr,
        hop_length=hop_length
    )

    # -----------------------------
    # FFT Bands
    # -----------------------------

    band_defs = {
        "subBass": (20, 60),
        "bass": (60, 250),
        "lowMid": (250, 500),
        "mid": (500, 2000),
        "highMid": (2000, 4000),
        "presence": (4000, 6000),
        "brilliance": (6000, 20000),
    }

    bands = {}

    for name, (low, high) in band_defs.items():
        raw = hz_band_energy(
            magnitude,
            freqs,
            low,
            high
        )

        bands[name] = interpolate_feature(
            raw,
            stft_times,
            target_times
        )

    # -----------------------------
    # Interpolation
    # -----------------------------

    rms_interp = interpolate_feature(
        rms,
        stft_times,
        target_times
    )

    centroid_interp = interpolate_feature(
        centroid,
        stft_times,
        target_times
    )

    zcr_interp = interpolate_feature(
        zcr,
        stft_times,
        target_times
    )

    onset_interp = interpolate_feature(
        onset_env,
        stft_times,
        target_times
    )

    # -----------------------------
    # Beat Mapping
    # -----------------------------

    beat_frame_set = set(
        int(t * fps)
        for t in beat_times
    )

    # crude kick/snare heuristics
    kick_threshold = np.percentile(
        bands["subBass"],
        85
    )

    snare_threshold = np.percentile(
        bands["presence"],
        80
    )

    # -----------------------------
    # Drop Detection
    # -----------------------------

    drops_raw = detect_drops(
        rms_interp,
        fps=fps,
        threshold=drop_threshold
    )

    drop_frame_set = set(
        d["frame"] for d in drops_raw
    )

    # -----------------------------
    # Final Frames
    # -----------------------------

    frames = []

    for i in range(total_frames):
        is_beat = i in beat_frame_set

        is_kick = (
            bands["subBass"][i] > kick_threshold
            and is_beat
        )

        is_snare = (
            bands["presence"][i] > snare_threshold
            and is_beat
        )

        frame = AnalysisFrame(
            frame=i,
            time=i / fps,

            rms=float(rms_interp[i]),
            centroid=float(centroid_interp[i]),
            zcr=float(zcr_interp[i]),

            fft=FFTBands(
                subBass=float(bands["subBass"][i]),
                bass=float(bands["bass"][i]),
                lowMid=float(bands["lowMid"][i]),
                mid=float(bands["mid"][i]),
                highMid=float(bands["highMid"][i]),
                presence=float(bands["presence"][i]),
                brilliance=float(bands["brilliance"][i]),
            ),

            isBeat=is_beat,
            isKick=is_kick,
            isSnare=is_snare,
            isDrop=i in drop_frame_set,

            onsetStrength=float(onset_interp[i])
        )

        frames.append(frame)

    beats = [
        BeatMarker(
            frame=int(t * fps),
            time=float(t),
            strength=float(
                onset_interp[min(
                    int(t * fps),
                    len(onset_interp) - 1
                )]
            )
        )
        for t in beat_times
    ]

    drops = [
        DropMarker(
            frame=d["frame"],
            time=d["frame"] / fps,
            energyDelta=d["energyDelta"]
        )
        for d in drops_raw
    ]

    return AnalysisResult(
        sampleRate=sr,
        duration=duration,
        fps=fps,
        totalFrames=total_frames,
        bpm=float(tempo),
        beats=beats,
        drops=drops,
        frames=frames
    )