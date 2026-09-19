from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.app.livetruth import (
    FieldReport,
    InterpretedReport,
    interpret_field_report,
)
from backend.app.simulator import simulate


app = FastAPI(
    title="CASCADE API",
    description="Critical infrastructure cascade simulation",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulationRequest(BaseModel):
    intervention: Literal[
        "none",
        "protect_hospital",
        "stabilize_comms",
    ] = "none"

    at_minute: int = Field(
        default=0,
        ge=0,
        le=30,
    )


@app.get("/")
def home():
    return {
        "name": "CASCADE",
        "status": "online",
        "message": "CASCADE command system is operational",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.post("/api/simulate")
def run_simulation(request: SimulationRequest):
    return simulate(
        intervention=request.intervention,
        at_minute=request.at_minute,
    )


@app.post(
    "/api/reports/interpret",
    response_model=InterpretedReport,
)
def interpret_report(report: FieldReport):
    return interpret_field_report(report)