from pathlib import Path
import uuid
import shutil

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from audio_extractor import extract_audio
from audio_analyzer import analyze_audio


TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):
    ext = Path(file.filename).suffix

    file_id = str(uuid.uuid4())

    upload_path = TEMP_DIR / f"{file_id}{ext}"

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "fileId": file_id,
        "path": str(upload_path)
    }


@app.post("/analyze")
async def analyze(
    fileId: str,
    fps: int = 60,
    dropThreshold: float = 1.8
):
    candidates = list(
        TEMP_DIR.glob(f"{fileId}.*")
    )

    if not candidates:
        return {
            "error": "File not found"
        }

    input_path = candidates[0]

    wav_path = TEMP_DIR / f"{fileId}.wav"

    if input_path.suffix.lower() in [
        ".mp4",
        ".mov",
        ".mkv"
    ]:
        extract_audio(
            str(input_path),
            str(wav_path)
        )

        analysis_input = wav_path

    else:
        analysis_input = input_path

    result = analyze_audio(
        str(analysis_input),
        fps=fps,
        drop_threshold=dropThreshold
    )

    return result


@app.post("/render")
async def render():
    return {
        "status": "stub"
    }