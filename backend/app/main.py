from typing import Literal

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from pydantic import (
    BaseModel,
    Field,
)

from backend.app.livetruth import (
    FieldReport,
    InterpretedReport,
    interpret_field_report,
)

from backend.app.simulator import (
    simulate,
)

from backend.app.voice import (
    interpret_voice_report,
)


app = FastAPI(
    title="CASCADE API",
    version="0.4.0",
    description=(
        "Critical infrastructure cascade simulation"
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://cascade-web-dpm7.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


InfrastructureAsset = Literal[
    "substation-n4",
    "hospital-north",
    "tower-c7",
    "pump-w2",
    "traffic-t4",
    "fire-f2",
]


Intervention = Literal[
    "none",
    "protect_hospital",
    "stabilize_comms",
]


class SimulationRequest(BaseModel):
    intervention: Intervention = "none"

    at_minute: int = Field(
        default=0,
        ge=0,
        le=30,
    )

    approved_failures: list[
        InfrastructureAsset
    ] = Field(
        default_factory=list
    )


@app.get("/")
def home():
    return {
        "name": "CASCADE API",
        "version": "0.4.0",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


@app.post("/api/simulate")
def run_simulation(
    request: SimulationRequest,
):
    return simulate(
        intervention=request.intervention,
        at_minute=request.at_minute,
        approved_failures=request.approved_failures,
    )


@app.post(
    "/api/reports/interpret",
    response_model=InterpretedReport,
)
def interpret_report(
    report: FieldReport,
):
    return interpret_field_report(
        report
    )


# Keep demo recordings short and reasonably small.
MAX_AUDIO_BYTES = 5 * 1024 * 1024


# Normalize common browser and Windows audio MIME types.
SUPPORTED_AUDIO_TYPES = {
    "audio/webm": "audio/webm",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mp3",
    "audio/mp4": "audio/mp4",
    "audio/m4a": "audio/m4a",
    "audio/x-m4a": "audio/m4a",
    "audio/ogg": "audio/ogg",
}


@app.post(
    "/api/reports/interpret-voice",
    response_model=InterpretedReport,
)
def interpret_voice(
    audio: UploadFile = File(...),
):
    # Browsers may include parameters such as
    # audio/webm;codecs=opus.
    received_type = (
        audio.content_type or ""
    ).split(";")[0].strip().lower()

    mime_type = SUPPORTED_AUDIO_TYPES.get(
        received_type
    )

    if mime_type is None:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported audio format. "
                "Use WebM, WAV, MP3, M4A, MP4, or OGG."
            ),
        )

    # Read one byte past the limit so oversized
    # uploads can be rejected.
    audio_bytes = audio.file.read(
        MAX_AUDIO_BYTES + 1
    )

    if not audio_bytes:
        raise HTTPException(
            status_code=422,
            detail="The audio recording is empty.",
        )

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                "The recording is too large. "
                "Please upload a shorter report."
            ),
        )

    return interpret_voice_report(
        audio_bytes=audio_bytes,
        mime_type=mime_type,
    )