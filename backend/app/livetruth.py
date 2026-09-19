import json
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import HTTPException
from google import genai
from pydantic import BaseModel, Field


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

    simulation_eligibility: Literal[
        "confirmed_failure",
        "evidence_only",
    ]

    simulation_reason: str


class InterpretedReport(BaseModel):
    original_text: str

    extraction: ExtractedReport

    verification_status: Literal[
        "unverified"
    ] = "unverified"

    applied_to_simulation: Literal[
        False
    ] = False

    note: str = (
        "AI extracted information from a fictional field report. "
        "The event has not been independently verified and has not "
        "been applied to the simulation."
    )


# ============================================================
# LIVETRUTH SYSTEM INSTRUCTION
# ============================================================


SYSTEM_INSTRUCTION = """
You are LiveTruth, the field-report interpretation component
inside CASCADE, a fictional critical-infrastructure disaster
response simulation.

Your job is ONLY to extract information explicitly supported
by the field report.

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


IMPORTANT RULES

1. Never claim that a report is verified.

2. Never invent damage, casualties, infrastructure failures,
   locations, causes, or operating conditions.

3. If an infrastructure asset cannot be clearly identified,
   use "unknown".

4. Preserve uncertainty from the report.

5. A field report is evidence, not confirmed truth.

6. Do not provide emergency dispatch instructions.

7. Do not autonomously modify infrastructure or simulation state.

8. Keep summaries concise.

9. evidence_description must describe only what the reporter
   actually observed or claimed.

10. uncertainty must clearly describe anything unknown,
    unclear, or unconfirmed.


SIMULATION ELIGIBILITY

Return simulation_eligibility="confirmed_failure" ONLY when:

- a known CASCADE infrastructure asset is clearly identified

AND

- the reporter explicitly states that the asset itself is
  failed, offline, non-operational, down, disabled, or otherwise
  clearly unavailable.

Examples that MAY qualify:

"Tower C7 has lost power and is offline."

"Water Pump W2 has stopped operating."

"Traffic Control Hub T4 is down."


Return simulation_eligibility="evidence_only" when:

- the asset is unknown
- damage is suspected rather than confirmed
- the reporter says they cannot confirm whether it works
- flooding, smoke, water, debris, or another hazard is merely
  nearby the asset
- the report says the asset may fail
- the operational state is unclear
- the report contains only observations without confirmation
  that the infrastructure asset itself is unavailable


The AI does NOT decide whether evidence becomes simulation input.

simulation_eligibility only tells a human reviewer whether
the language in the report explicitly describes a failure.

simulation_reason must briefly explain why the report was
classified that way.
"""


# ============================================================
# STRUCTURED OUTPUT
# ============================================================


RESPONSE_SCHEMA = {
    "type": "OBJECT",

    "properties": {
        "summary": {
            "type": "STRING",
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
        },

        "evidence_description": {
            "type": "STRING",
        },

        "uncertainty": {
            "type": "STRING",
        },

        "simulation_eligibility": {
            "type": "STRING",

            "enum": [
                "confirmed_failure",
                "evidence_only",
            ],
        },

        "simulation_reason": {
            "type": "STRING",
        },
    },

    "required": [
        "summary",
        "asset_id",
        "incident_type",
        "evidence_description",
        "uncertainty",
        "simulation_eligibility",
        "simulation_reason",
    ],
}


# ============================================================
# INTERPRET FIELD REPORT
# ============================================================


def interpret_field_report(
    report: FieldReport,
) -> InterpretedReport:

    api_key = os.getenv(
        "GOOGLE_API_KEY"
    )

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Agent Platform API key "
                "has not been configured yet."
            ),
        )

    try:
        client = genai.Client(
            vertexai=True,
            api_key=api_key,
        )

        response = (
            client.models.generate_content(
                model="gemini-3.5-flash",

                contents=report.text,

                config={
                    "system_instruction":
                        SYSTEM_INSTRUCTION,

                    "temperature": 0,

                    "response_mime_type":
                        "application/json",

                    "response_schema":
                        RESPONSE_SCHEMA,
                },
            )
        )

        if not response.text:
            raise ValueError(
                "Agent Platform returned an empty response."
            )

        raw_result = json.loads(
            response.text
        )

        extraction = (
            ExtractedReport.model_validate(
                raw_result
            )
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