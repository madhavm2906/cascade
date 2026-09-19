import json
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import HTTPException
from google import genai
from pydantic import BaseModel, Field


# Load values from the project .env file
load_dotenv()


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================


class FieldReport(BaseModel):
    text: str = Field(
        ...,
        min_length=10,
        max_length=1500,
    )


class ExtractedReport(BaseModel):
    summary: str

    asset_id: Literal[
        "substation-n4",
        "hospital-north",
        "tower-c7",
        "pump-w2",
        "traffic-t4",
        "fire-f2",
        "unknown",
    ]

    incident_type: Literal[
        "power_failure",
        "communications_failure",
        "flooding",
        "road_blockage",
        "water_disruption",
        "medical_disruption",
        "other",
    ]

    evidence_description: str

    uncertainty: str


class InterpretedReport(BaseModel):
    original_text: str

    extraction: ExtractedReport

    verification_status: Literal["unverified"] = "unverified"

    applied_to_simulation: Literal[False] = False

    note: str = (
        "AI extracted information from a fictional field report. "
        "The event has not been independently verified and has not "
        "been applied to the simulation."
    )


# ============================================================
# CASCADE FICTIONAL INFRASTRUCTURE
# ============================================================


SYSTEM_INSTRUCTION = """
You are LiveTruth, the field-report interpretation component
inside CASCADE, a fictional critical-infrastructure disaster
response simulation.

Your job is ONLY to extract information that is explicitly
supported by the field report.

CASCADE contains these fictional infrastructure assets:

substation-n4
North Grid Substation N4

hospital-north
North Regional Hospital H1

tower-c7
Communications Tower C7

pump-w2
Water Pump W2

traffic-t4
Traffic Control Hub T4

fire-f2
Emergency Station F2

Rules:

1. Do not claim that a report is verified.
2. Do not invent damage, casualties, failures, locations,
   causes, or infrastructure conditions.
3. If an infrastructure asset cannot be clearly identified,
   use "unknown".
4. Extract uncertainty exactly when the reporter is unsure.
5. A report is evidence, not confirmed truth.
6. Do not give emergency dispatch instructions.
7. Do not autonomously modify infrastructure or simulation state.
8. Keep the summary concise.
9. evidence_description should describe what the reporter actually
   observed or claimed.
10. uncertainty should clearly state what is unknown, unclear,
    or unconfirmed.
"""


# ============================================================
# STRUCTURED OUTPUT SCHEMA
# ============================================================


RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {
            "type": "STRING",
            "description": (
                "A concise summary of what the field report says."
            ),
        },
        "asset_id": {
            "type": "STRING",
            "enum": [
                "substation-n4",
                "hospital-north",
                "tower-c7",
                "pump-w2",
                "traffic-t4",
                "fire-f2",
                "unknown",
            ],
            "description": (
                "The fictional CASCADE infrastructure asset that "
                "is clearly referenced by the report."
            ),
        },
        "incident_type": {
            "type": "STRING",
            "enum": [
                "power_failure",
                "communications_failure",
                "flooding",
                "road_blockage",
                "water_disruption",
                "medical_disruption",
                "other",
            ],
            "description": (
                "The incident category most directly supported "
                "by the field report."
            ),
        },
        "evidence_description": {
            "type": "STRING",
            "description": (
                "The observation or claim actually supplied "
                "by the reporter."
            ),
        },
        "uncertainty": {
            "type": "STRING",
            "description": (
                "Anything that remains uncertain, unconfirmed, "
                "or unknown from the report."
            ),
        },
    },
    "required": [
        "summary",
        "asset_id",
        "incident_type",
        "evidence_description",
        "uncertainty",
    ],
}


# ============================================================
# LIVETRUTH
# ============================================================


def interpret_field_report(
    report: FieldReport,
) -> InterpretedReport:

    # API key 2 from Google Agent Platform
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Agent Platform API key "
                "has not been configured yet."
            ),
        )

    try:
        # IMPORTANT:
        # vertexai=True here tells google-genai to use the
        # Google Cloud / Agent Platform backend for this API key.
        #
        # We are NOT switching the project to Vertex AI Studio.
        client = genai.Client(
            vertexai=True,
            api_key=api_key,
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=report.text,
            config={
                "system_instruction": SYSTEM_INSTRUCTION,
                "temperature": 0,
                "response_mime_type": "application/json",
                "response_schema": RESPONSE_SCHEMA,
            },
        )

        if not response.text:
            raise ValueError(
                "Agent Platform returned an empty response."
            )

        raw_result = json.loads(response.text)

        extraction = ExtractedReport.model_validate(
            raw_result
        )

        return InterpretedReport(
            original_text=report.text,
            extraction=extraction,
        )

    except HTTPException:
        raise

    except Exception as error:
        print(
            "CASCADE LiveTruth extraction failed:",
            type(error).__name__,
            str(error),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "The field report could not be interpreted. "
                "Check the CASCADE backend terminal for the "
                "Agent Platform error."
            ),
        ) from error