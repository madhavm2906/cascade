from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from pydantic import BaseModel, Field

from backend.app.livetruth import (
    FieldReport,
    InterpretedReport,
    interpret_field_report,
)

from backend.app.simulator import (
    simulate,
)


app = FastAPI(
    title="CASCADE API",
    version="0.3.0",
    description=(
        "Critical infrastructure "
        "cascade simulation"
    ),
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
    intervention: Intervention = (
        "none"
    )

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

        "version": "0.3.0",

        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


@app.post(
    "/api/simulate"
)
def run_simulation(
    request: SimulationRequest,
):
    return simulate(
        intervention=
            request.intervention,

        at_minute=
            request.at_minute,

        approved_failures=
            request.approved_failures,
    )


@app.post(
    "/api/reports/interpret",
    response_model=
        InterpretedReport,
)
def interpret_report(
    report: FieldReport,
):
    return interpret_field_report(
        report
    )