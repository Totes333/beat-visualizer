import numpy as np


def detect_drops(
    rms_values: np.ndarray,
    fps: int,
    threshold: float = 1.8,
    rolling_seconds: int = 4
):
    window_size = rolling_seconds * fps

    drops = []

    for i in range(window_size, len(rms_values)):
        rolling_avg = np.mean(
            rms_values[i - window_size:i]
        )

        if rolling_avg <= 1e-6:
            continue

        delta = rms_values[i] / rolling_avg

        if delta > threshold:
            drops.append({
                "frame": i,
                "energyDelta": float(delta)
            })

    deduped = []
    last_frame = -9999

    for drop in drops:
        if drop["frame"] - last_frame > fps * 2:
            deduped.append(drop)
            last_frame = drop["frame"]

    return deduped