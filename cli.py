#!/usr/bin/env python3
"""
beat-visualizer CLI
Usage:
  python cli.py <input_file> [options]

Examples:
  python cli.py my_beat.mp4
  python cli.py my_beat.mp4 --mode particleSwarm --palette cyberpunk
  python cli.py my_beat.mp4 --mode radialFFT --palette sunset --start 0 --end 30
  python cli.py my_beat.mp4 --track-name "My Beat" --producer "@me" --output my_video.mp4
"""

import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from analyzer.audio_analyzer import analyze_audio
from analyzer.audio_extractor import extract_audio
from analyzer.models import AnalysisResult, RenderParams, ClipRange, TextOverlayConfig, RenderFormat


VISUAL_MODES = ["liquidGlass", "wireframe", "particleSwarm", "radialFFT"]
PALETTES = ["cyberpunk", "sunset", "monochrome", "forest"]


def parse_args():
    p = argparse.ArgumentParser(
        description="Generate a music visualizer video from an audio/video file."
    )
    p.add_argument("input", help="Input .mp4, .mov, .mkv, or .wav/.mp3 file")

    # Visual
    p.add_argument("--mode", choices=VISUAL_MODES, default="particleSwarm",
                   help=f"Visual mode (default: particleSwarm)")
    p.add_argument("--palette", choices=PALETTES, default="cyberpunk",
                   help="Color palette (default: cyberpunk)")
    p.add_argument("--seed", type=int, default=42,
                   help="Random seed for deterministic output (default: 42)")

    # Audio tuning
    p.add_argument("--fps", type=int, default=60,
                   help="Frames per second (default: 60)")
    p.add_argument("--sensitivity", type=float, default=1.0,
                   help="Visual sensitivity multiplier (default: 1.0)")
    p.add_argument("--smoothing", type=float, default=0.85,
                   help="Motion smoothing 0-1 (default: 0.85)")
    p.add_argument("--drop-threshold", type=float, default=1.8,
                   help="Energy delta threshold for drop detection (default: 1.8)")

    # Clip
    p.add_argument("--start", type=float, default=0.0,
                   help="Clip start time in seconds (default: 0)")
    p.add_argument("--end", type=float, default=None,
                   help="Clip end time in seconds (default: full duration)")

    # Text overlay
    p.add_argument("--track-name", default="", help="Track name shown on video")
    p.add_argument("--producer", default="", help="Producer handle shown on video")
    p.add_argument("--no-text", action="store_true", help="Disable text overlay")

    # Format
    p.add_argument("--width", type=int, default=1080)
    p.add_argument("--height", type=int, default=1920)
    p.add_argument("--output", default="output.mp4",
                   help="Output filename (default: output.mp4)")

    return p.parse_args()


def log(msg: str):
    print(f"  {msg}", flush=True)


def main():
    args = parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: file not found: {input_path}")
        sys.exit(1)

    print("\n🎵 beat-visualizer\n")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        # ── Step 1: Extract audio if video file ──────────────────────────────
        video_extensions = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
        if input_path.suffix.lower() in video_extensions:
            log(f"Extracting audio from {input_path.name}...")
            wav_path = tmp / "audio.wav"
            extract_audio(str(input_path), str(wav_path))
            analysis_input = wav_path
        else:
            analysis_input = input_path

        # ── Step 2: Analyze audio ─────────────────────────────────────────────
        log("Analyzing audio (this may take a moment)...")
        t0 = time.time()
        result: AnalysisResult = analyze_audio(
            str(analysis_input),
            fps=args.fps,
            drop_threshold=args.drop_threshold
        )
        elapsed = time.time() - t0
        log(f"Done in {elapsed:.1f}s — {result.bpm:.1f} BPM, "
            f"{result.duration:.1f}s, {len(result.beats)} beats, "
            f"{len(result.drops)} drops detected")

        # ── Step 3: Write analysis JSON for renderer ──────────────────────────
        analysis_json = tmp / "analysis.json"
        analysis_json.write_text(result.model_dump_json())

        # ── Step 4: Build render params ───────────────────────────────────────
        clip_end = args.end if args.end is not None else result.duration
        params = RenderParams(
            seed=args.seed,
            mode=args.mode,
            palette=args.palette,
            sensitivity=args.sensitivity,
            smoothing=args.smoothing,
            clip=ClipRange(start=args.start, end=clip_end),
            text=TextOverlayConfig(
                trackName=args.track_name,
                producerHandle=args.producer,
                enabled=not args.no_text and bool(args.track_name or args.producer)
            ),
            format=RenderFormat(width=args.width, height=args.height, fps=args.fps),
            outputFileName=args.output,
            dropThreshold=args.drop_threshold
        )

        params_json = tmp / "params.json"
        params_json.write_text(params.model_dump_json())

        # ── Step 5: Run Node.js renderer ──────────────────────────────────────
        renderer_dir = Path(__file__).parent / "renderer"
        if not (renderer_dir / "node_modules").exists():
            log("Installing renderer dependencies (first run only)...")
            subprocess.run(
                ["npm", "install"],
                cwd=renderer_dir,
                check=True,
                capture_output=True,
                shell=(sys.platform == "win32")
            )

        log(f"Rendering '{args.mode}' with '{args.palette}' palette...")
        log(f"Clip: {args.start:.1f}s → {clip_end:.1f}s at {args.fps}fps")

        proc = subprocess.run(
            ["node", "render.js", str(analysis_json), str(params_json), str(analysis_input)],
            cwd=renderer_dir,
            capture_output=False,
            shell=(sys.platform == "win32")
        )

        if proc.returncode != 0:
            print("\nRenderer failed.")
            sys.exit(proc.returncode)

    print(f"\n✅ Done → {args.output}\n")


if __name__ == "__main__":
    main()
