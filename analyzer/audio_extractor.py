from pathlib import Path
import ffmpeg


def extract_audio(input_path: str, output_path: str):
    (
        ffmpeg
        .input(input_path)
        .output(
            output_path,
            ac=1,
            ar=44100,
            format="wav"
        )
        .overwrite_output()
        .run(quiet=True)
    )

    return Path(output_path)