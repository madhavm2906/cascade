import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import VoiceRecorder from "../components/command/VoiceRecorder";
import { API_BASE_URL } from "../lib/api";

import {
  Activity,
  ArrowLeft,
  CloudLightning,
  FileText,
  LoaderCircle,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import CityMap from "../components/command/CityMap";

import {
  getInfrastructureNodes,
  type InfrastructureNode,
} from "../data/infrastructure";

import "../styles/command.css";


type Intervention =
  | "none"
  | "protect_hospital"
  | "stabilize_comms";


type Scenario =
  | "normal"
  | "storm";


type InfrastructureAssetId =
  | "substation-n4"
  | "hospital-north"
  | "tower-c7"
  | "pump-w2"
  | "traffic-t4"
  | "fire-f2";


type SimulationNode = {
  id: string;
  name: string;
  status: InfrastructureNode["status"];
  failure_minute: number | null;
  caused_by: string | null;
  population_served: number;
};


type TimelineEvent = {
  minute: number;
  node_id: string;
  name: string;
  caused_by: string | null;
};


type SimulationResult = {
  scenario: string;

  intervention: Intervention;

  intervention_label: string;

  at_minute: number;

  horizon_minutes: number;

  approved_failures: InfrastructureAssetId[];

  initial_failures: InfrastructureAssetId[];

  nodes: SimulationNode[];

  timeline: TimelineEvent[];

  summary: {
    projected_affected_systems: number;
    service_exposures: number;
  };

  disclaimer: string;
};


type ExtractedReport = {
  summary: string;

  asset_id:
    | InfrastructureAssetId
    | "unknown";

  incident_type:
    | "power_failure"
    | "communications_failure"
    | "flooding"
    | "road_blockage"
    | "water_disruption"
    | "medical_disruption"
    | "other";

  evidence_description: string;

  uncertainty: string;

  simulation_eligibility:
    | "confirmed_failure"
    | "evidence_only";

  simulation_reason: string;
};


type InterpretedReport = {
  original_text: string;

  extraction: ExtractedReport;

  verification_status: "unverified";

  applied_to_simulation: false;

  note: string;
};


const BASE_NODES =
  getInfrastructureNodes("normal");


const INTERVENTIONS: {
  id: Intervention;
  label: string;
}[] = [
  {
    id: "none",
    label: "No intervention",
  },

  {
    id: "protect_hospital",
    label: "Protect hospital",
  },

  {
    id: "stabilize_comms",
    label: "Support communications",
  },
];


const SAMPLE_REPORT =
  "I am a responder near Water Pump W2. I can see water rising around the pump station, but I cannot confirm whether the pump is damaged or still operating.";


export default function CommandCenter() {
  const navigate = useNavigate();


  const [scenario, setScenario] =
    useState<Scenario>("normal");


  const [intervention, setIntervention] =
    useState<Intervention>("none");


  const [atMinute, setAtMinute] =
    useState(0);


  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<string | null>(
      null
    );


  const [simulation, setSimulation] =
    useState<SimulationResult | null>(
      null
    );


  const [loading, setLoading] =
    useState(false);


  const [error, setError] =
    useState<string | null>(null);


  /*
    Human-approved infrastructure
    failures from LiveTruth.
  */

  const [
    approvedFailures,
    setApprovedFailures,
  ] =
    useState<
      InfrastructureAssetId[]
    >([]);


  /*
    LiveTruth state
  */

  const [
    liveTruthOpen,
    setLiveTruthOpen,
  ] =
    useState(false);


  const [
    reportText,
    setReportText,
  ] =
    useState("");


  const [
    reportLoading,
    setReportLoading,
  ] =
    useState(false);


  const [
    reportError,
    setReportError,
  ] =
    useState<string | null>(null);


  const [
    interpretedReport,
    setInterpretedReport,
  ] =
    useState<InterpretedReport | null>(
      null
    );


  /*
    Request simulation from Python.
  */

  useEffect(() => {
    if (scenario !== "storm") {
      return;
    }

    const controller =
      new AbortController();


    async function loadSimulation() {
      setLoading(true);

      setError(null);

      try {
        const response =
          await fetch(`${API_BASE_URL}/api/simulate`, {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                intervention,

                at_minute:
                  atMinute,

                approved_failures:
                  approvedFailures,
              }),

              signal:
                controller.signal,
            }
          );


        if (!response.ok) {
          throw new Error(
            `Simulation request failed: ${response.status}`
          );
        }


        const result =
          (await response.json()) as SimulationResult;


        if (
          !controller.signal.aborted
        ) {
          setSimulation(
            result
          );
        }
      } catch (requestError) {
        if (
          controller.signal.aborted
        ) {
          return;
        }


        console.error(
          "CASCADE simulation error:",
          requestError
        );


        setError(
          "Could not reach the Python simulation engine."
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(
            false
          );
        }
      }
    }


    loadSimulation();


    return () => {
      controller.abort();
    };
  }, [
    scenario,
    intervention,
    atMinute,
    approvedFailures,
  ]);


  /*
    Merge Python results with
    infrastructure nodes.
  */

  const nodes =
    useMemo(() => {
      if (
        scenario === "normal" ||
        !simulation
      ) {
        return BASE_NODES;
      }


      const calculatedNodes =
        new Map(
          simulation.nodes.map(
            (node) => [
              node.id,
              node,
            ]
          )
        );


      return BASE_NODES.map(
        (baseNode) => {
          const calculated =
            calculatedNodes.get(
              baseNode.id
            );


          if (!calculated) {
            return baseNode;
          }


          return {
            ...baseNode,

            status:
              calculated.status,

            predictedFailureMinutes:
              calculated
                .failure_minute ??
              undefined,
          };
        }
      );
    }, [
      scenario,
      simulation,
    ]);


  const selectedNode =
    nodes.find(
      (node) =>
        node.id ===
        selectedNodeId
    ) ?? null;


  const selectedResult =
    simulation?.nodes.find(
      (node) =>
        node.id ===
        selectedNodeId
    ) ?? null;


  const currentReportAsset =
    interpretedReport?.extraction
      .asset_id;


  const currentReportApproved =
    currentReportAsset !==
      undefined &&
    currentReportAsset !==
      "unknown" &&
    approvedFailures.includes(
      currentReportAsset
    );


  /*
    LiveTruth Gemini
    interpretation.
  */

  async function analyzeReport() {
    const cleanedReport =
      reportText.trim();


    if (
      cleanedReport.length < 10
    ) {
      setReportError(
        "Enter a little more detail before analyzing the report."
      );

      return;
    }


    setReportLoading(true);

    setReportError(null);

    setInterpretedReport(
      null
    );


    try {
      const response =
        await fetch(`${API_BASE_URL}/api/reports/interpret`, {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                text:
                  cleanedReport,
              }),
          }
        );


      if (!response.ok) {
        const payload =
          await response
            .json()
            .catch(
              () => null
            );


        const message =
          payload?.detail ??
          `LiveTruth request failed: ${response.status}`;


        throw new Error(
          message
        );
      }


      const result =
        (await response.json()) as InterpretedReport;


      setInterpretedReport(
        result
      );


      /*
        Select the infrastructure
        asset Gemini matched.

        This does NOT apply it
        to the simulation.
      */

      if (
        result.extraction
          .asset_id !==
        "unknown"
      ) {
        setSelectedNodeId(
          result.extraction
            .asset_id
        );
      }
    } catch (requestError) {
      console.error(
        "CASCADE LiveTruth error:",
        requestError
      );


      setReportError(
        requestError
          instanceof Error
          ? requestError.message
          : "The report could not be interpreted."
      );
    } finally {
      setReportLoading(
        false
      );
    }
  }


  /*
    Human approval bridge.

    Gemini never calls this itself.

    The user must explicitly
    approve a report that Gemini
    classified as describing an
    explicit infrastructure failure.
  */

  function approveReportAsScenarioInput() {
    if (!interpretedReport) {
      return;
    }


    const extraction =
      interpretedReport.extraction;


    if (
      extraction
        .simulation_eligibility !==
      "confirmed_failure"
    ) {
      return;
    }


    if (
      extraction.asset_id ===
      "unknown"
    ) {
      return;
    }


    const assetId =
      extraction.asset_id;


    setApprovedFailures(
      (current) => {
        if (
          current.includes(
            assetId
          )
        ) {
          return current;
        }


        return [
          ...current,
          assetId,
        ];
      }
    );


    setSelectedNodeId(
      assetId
    );


    setAtMinute(0);

    setSimulation(null);

    setError(null);


    /*
      If no scenario is running,
      approving the field evidence
      begins the fictional storm
      scenario using the approved
      failure as an additional
      initial condition.
    */

    if (
      scenario === "normal"
    ) {
      setIntervention(
        "none"
      );

      setScenario(
        "storm"
      );
    }
  }


  function clearReport() {
    setReportText("");

    setReportError(null);

    setInterpretedReport(
      null
    );
  }


  function closeLiveTruth() {
    setLiveTruthOpen(false);

    setReportError(null);
  }


  /*
    Simulation controls.
  */

  function startStorm() {
    setIntervention(
      "none"
    );

    setAtMinute(0);

    setApprovedFailures([]);

    setSelectedNodeId(
      "substation-n4"
    );

    setSimulation(null);

    setError(null);

    setScenario(
      "storm"
    );
  }


  function resetSimulation() {
    setScenario(
      "normal"
    );

    setIntervention(
      "none"
    );

    setAtMinute(0);

    setApprovedFailures([]);

    setSelectedNodeId(
      null
    );

    setSimulation(
      null
    );

    setError(null);

    setLoading(false);
  }


  return (
    <div
      className={`command-center ${
        scenario === "storm"
          ? "storm-active"
          : ""
      }`}
    >
      {/* MAP */}

      <div className="command-map-stage">
        <CityMap
          nodes={nodes}
          selectedNodeId={
            selectedNodeId
          }
          futureForkOpen={
            scenario === "storm"
          }
          onNodeSelect={(node) => {
            setSelectedNodeId(
              node?.id ??
                null
            );
          }}
        />
      </div>


      {/* TOP HUD */}

      <header className="command-hud">
        <div className="hud-brand">
          <button
            className="hud-back"
            aria-label="Return to landing page"
            onClick={() =>
              navigate("/")
            }
          >
            <ArrowLeft
              size={17}
            />
          </button>

          <div>
            <strong>
              CASCADE
            </strong>

            <span>
              COMMAND
              INTELLIGENCE
            </span>
          </div>
        </div>


        <div className="hud-center">
          <span
            className={`scenario-dot ${scenario}`}
          />

          {scenario ===
          "normal"
            ? "SIMULATION READY"
            : `SIMULATED INCIDENT · T+${atMinute} MIN`}
        </div>


        <div className="hud-right">
          <Activity
            size={14}
          />

          LOCAL DEMO MODEL
        </div>
      </header>


      {/* INCIDENT BANNER */}

      {scenario ===
        "storm" && (
        <div className="incident-banner">
          <CloudLightning
            size={16}
          />

          <div>
            <span>
              FICTIONAL DISASTER
              SCENARIO
            </span>

            <strong>
              Storm disables
              North Grid
              Substation N4
            </strong>
          </div>
        </div>
      )}


      {/* LEFT PANEL */}

      <aside className="truth-dock">
        <div className="dock-heading">
          <span>
            MODEL TRACE
          </span>

          <strong>
            {scenario ===
            "normal"
              ? "Scenario ready"
              : "Failure propagation"}
          </strong>
        </div>


        {scenario ===
        "normal" ? (
          <>
            <div className="truth-event">
              <ShieldCheck
                size={15}
              />

              <div>
                <strong>
                  Infrastructure
                  model loaded
                </strong>

                <span>
                  Six fictional
                  systems and their
                  dependencies are
                  ready.
                </span>
              </div>
            </div>


            <div className="truth-event">
              <Radio
                size={15}
              />

              <div>
                <strong>
                  Demo data only
                </strong>

                <span>
                  No live emergency
                  feeds are
                  connected.
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="truth-event danger">
              <Zap
                size={15}
              />

              <div>
                <strong>
                  N4 failure at
                  minute 0
                </strong>

                <span>
                  Initial event
                  supplied to the
                  simulation
                  engine.
                </span>
              </div>
            </div>


            {approvedFailures.length >
              0 && (
              <div className="truth-event warning">
                <ShieldCheck
                  size={15}
                />

                <div>
                  <strong>
                    Human-approved
                    field input
                  </strong>

                  <span>
                    {
                      approvedFailures
                        .length
                    }{" "}
                    additional
                    confirmed failure
                    {approvedFailures.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    applied.
                  </span>
                </div>
              </div>
            )}


            {simulation?.timeline
              .filter(
                (event) =>
                  event.minute >
                    0 &&
                  event.minute <=
                    atMinute
              )
              .slice(-3)
              .map(
                (event) => (
                  <div
                    className="truth-event warning"
                    key={
                      event.node_id
                    }
                  >
                    <Activity
                      size={15}
                    />

                    <div>
                      <strong>
                        {
                          event.name
                        }{" "}
                        failed
                      </strong>

                      <span>
                        Simulated
                        minute{" "}
                        {
                          event.minute
                        }
                      </span>
                    </div>
                  </div>
                )
              )}


            {atMinute ===
              0 && (
              <div className="truth-event">
                <Radio
                  size={15}
                />

                <div>
                  <strong>
                    Downstream
                    failures
                    projected
                  </strong>

                  <span>
                    Move the
                    timeline to
                    watch the
                    simulated
                    cascade unfold.
                  </span>
                </div>
              </div>
            )}
          </>
        )}


        <button
          className="livetruth-launch"
          onClick={() =>
            setLiveTruthOpen(
              true
            )
          }
        >
          <FileText
            size={15}
          />

          <span>
            SUBMIT FIELD REPORT
          </span>
        </button>
      </aside>


      {/* RIGHT PANEL */}

      <aside className="asset-dock">
        {selectedNode ? (
          <>
            <div className="dock-heading">
              <span>
                {
                  selectedNode.type
                }
              </span>

              <strong>
                {
                  selectedNode.name
                }
              </strong>
            </div>


            <div className="asset-status-row">
              <span>
                CURRENT STATUS
              </span>

              <strong
                className={`status-text ${selectedNode.status}`}
              >
                {
                  selectedNode.status
                }
              </strong>
            </div>


            <p className="asset-description">
              {
                selectedNode.description
              }
            </p>


            <div className="asset-stat">
              <span>
                SERVICE COVERAGE*
              </span>

              <strong>
                {selectedNode.populationServed.toLocaleString()}
              </strong>
            </div>


            <div className="asset-stat">
              <span>
                DEPENDENCIES
              </span>

              <strong>
                {
                  selectedNode
                    .dependsOn
                    .length
                }
              </strong>
            </div>


            {scenario ===
              "storm" &&
              simulation &&
              selectedResult && (
                <div className="failure-clock">
                  <span>
                    MODELED FAILURE
                  </span>

                  <strong>
                    {selectedResult.failure_minute ===
                    null
                      ? "NOT WITHIN 30 MIN"
                      : selectedResult.failure_minute ===
                          0
                        ? "MINUTE 0"
                        : `MINUTE ${selectedResult.failure_minute}`}
                  </strong>
                </div>
              )}
          </>
        ) : (
          <>
            <div className="dock-heading">
              <span>
                CASCADE FORECAST
              </span>

              <strong>
                Network Risk
              </strong>
            </div>


            {scenario ===
            "normal" ? (
              <div className="forecast-clear">
                <ShieldCheck
                  size={25}
                />

                <strong>
                  No scenario
                  running
                </strong>

                <span>
                  Select a node
                  or start the
                  storm
                  simulation.
                </span>
              </div>
            ) : (
              <div className="risk-summary">
                <span>
                  PROJECTED
                  FAILURES WITHIN
                  30 MIN
                </span>

                <strong>
                  {simulation
                    ?.summary
                    .projected_affected_systems ??
                    "—"}
                </strong>

                <small>
                  Calculated by
                  the Python
                  engine
                </small>
              </div>
            )}
          </>
        )}
      </aside>


      {/* INFRASTRUCTURE SELECTOR */}

      <div className="node-dock">
        <div className="node-dock-title">
          INFRASTRUCTURE
        </div>

        {nodes.map(
          (node) => (
            <button
              key={node.id}
              className={
                selectedNodeId ===
                node.id
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedNodeId(
                  node.id
                )
              }
              title={
                node.name
              }
            >
              <span
                className={`node-status ${node.status}`}
              />

              <span>
                {
                  node.shortName
                }
              </span>
            </button>
          )
        )}
      </div>


      {/* FUTUREFORK */}

      {scenario ===
        "storm" && (
        <section className="futurefork-dock">
          <div className="futurefork-topline">
            <div>
              <span>
                FUTUREFORK /
                RESPONSE OPTIONS
              </span>

              <strong>
                Explore the next
                30 minutes
              </strong>
            </div>

            <span className="futurefork-engine">
              {loading
                ? "CALCULATING..."
                : "PYTHON MODEL"}
            </span>
          </div>


          <div className="futurefork-options">
            {INTERVENTIONS.map(
              (option) => (
                <button
                  key={
                    option.id
                  }
                  className={
                    intervention ===
                    option.id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setIntervention(
                      option.id
                    )
                  }
                >
                  {
                    option.label
                  }
                </button>
              )
            )}
          </div>


          <div className="futurefork-timeline">
            <div className="futurefork-time-label">
              <span>
                SIMULATION TIME
              </span>

              <strong>
                T + {atMinute} MIN
              </strong>
            </div>


            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={
                atMinute
              }
              aria-label="Simulation minute"
              onChange={(
                event
              ) =>
                setAtMinute(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            />


            <div className="futurefork-time-ends">
              <span>
                NOW
              </span>

              <span>
                +30 MIN
              </span>
            </div>
          </div>


          {simulation && (
            <div className="futurefork-outcome">
              <strong>
                {
                  simulation
                    .summary
                    .projected_affected_systems
                }{" "}
                projected
                system failures
              </strong>

              <span>
                {simulation.summary.service_exposures.toLocaleString()}{" "}
                service
                exposures*
              </span>
            </div>
          )}


          {approvedFailures.length >
            0 && (
            <div className="futurefork-approved-input">
              HUMAN-APPROVED INPUT:{" "}
              {approvedFailures.join(
                ", "
              )}
            </div>
          )}


          {error && (
            <p className="futurefork-error">
              {error}
            </p>
          )}


          <p className="futurefork-disclaimer">
            *Fictional network.
            Illustrative failure
            times. Service
            populations can
            overlap. Results are
            simulated, not live
            forecasts.
          </p>
        </section>
      )}


      {/* STORM / RESET */}

      <div className="scenario-control">
        {scenario ===
        "normal" ? (
          <button
            className="storm-trigger"
            onClick={
              startStorm
            }
          >
            <CloudLightning
              size={17}
            />

            SIMULATE MAJOR
            STORM
          </button>
        ) : (
          <button
            className="reset-trigger"
            onClick={
              resetSimulation
            }
          >
            <RotateCcw
              size={16}
            />

            RESET SIMULATION
          </button>
        )}
      </div>


      {/* LIVETRUTH PORTAL */}

      {liveTruthOpen &&
        createPortal(
          <div
            className="livetruth-workbench"
            style={{
              position:
                "fixed",

              zIndex:
                999999,

              top:
                "90px",

              left:
                "24px",

              width:
                "380px",

              maxWidth:
                "calc(100vw - 48px)",

              maxHeight:
                "calc(100vh - 120px)",

              overflowY:
                "auto",

              boxSizing:
                "border-box",

              padding:
                "22px",

              background:
                "rgba(7, 12, 16, 0.98)",

              border:
                "1px solid rgba(255,255,255,0.16)",

              color:
                "#eef4f4",

              boxShadow:
                "0 30px 90px rgba(0,0,0,0.60)",

              backdropFilter:
                "blur(24px)",
            }}
          >
            <div className="livetruth-header">
              <div className="livetruth-title">
                <div className="livetruth-icon">
                  <Sparkles
                    size={16}
                  />
                </div>

                <div>
                  <span>
                    LIVETRUTH
                  </span>

                  <strong>
                    Field
                    Evidence
                  </strong>
                </div>
              </div>


              <button
                className="livetruth-close"
                aria-label="Close LiveTruth"
                onClick={
                  closeLiveTruth
                }
              >
                <X
                  size={17}
                />
              </button>
            </div>


            {!interpretedReport ? (
              <>
                <p className="livetruth-intro">
                  Submit a
                  responder or
                  sensor report.
                  Gemini extracts
                  what the report
                  says without
                  treating it as
                  confirmed fact.
                </p>
                <VoiceRecorder
  onResult={(result) => {
    setInterpretedReport(result);
    setReportText(result.original_text);
    setReportError(null);

    if (result.extraction.asset_id !== "unknown") {
      setSelectedNodeId(result.extraction.asset_id);
    }
  }}
/>

                <label
                  className="livetruth-label"
                  htmlFor="field-report"
                >
                  FIELD REPORT
                </label>


                <textarea
                  id="field-report"
                  value={
                    reportText
                  }
                  maxLength={
                    1500
                  }
                  onChange={(
                    event
                  ) =>
                    setReportText(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: Water is rising around Pump W2, but I cannot confirm whether the equipment is damaged."
                />


                <div className="livetruth-helper-row">
                  <span>
                    {
                      reportText.length
                    }
                    /1500
                  </span>


                  <button
                    className="livetruth-sample"
                    onClick={() => {
                      setReportText(
                        SAMPLE_REPORT
                      );

                      setReportError(
                        null
                      );
                    }}
                  >
                    LOAD SAMPLE
                  </button>
                </div>


                {reportError && (
                  <div className="livetruth-api-error">
                    <strong>
                      REPORT
                      ANALYSIS
                      UNAVAILABLE
                    </strong>

                    <span>
                      {
                        reportError
                      }
                    </span>
                  </div>
                )}


                <button
                  className="livetruth-analyze"
                  disabled={
                    reportLoading
                  }
                  onClick={
                    analyzeReport
                  }
                >
                  {reportLoading ? (
                    <>
                      <LoaderCircle
                        className="livetruth-spinner"
                        size={16}
                      />

                      ANALYZING
                      REPORT
                    </>
                  ) : (
                    <>
                      <Sparkles
                        size={16}
                      />

                      ANALYZE
                      REPORT
                    </>
                  )}
                </button>


                <p className="livetruth-safety-note">
                  Analysis does
                  not verify the
                  identity of the
                  reporter or
                  confirm that the
                  event occurred.
                </p>
              </>
            ) : (
              <div className="livetruth-review">
                <div className="livetruth-verification">
                  <span className="livetruth-unverified-dot" />

                  UNVERIFIED
                  EVIDENCE
                </div>


                <div className="livetruth-review-block">
                  <span>
                    AI SUMMARY
                  </span>

                  <strong>
                    {
                      interpretedReport
                        .extraction
                        .summary
                    }
                  </strong>
                </div>


                <div className="livetruth-review-grid">
                  <div>
                    <span>
                      MATCHED ASSET
                    </span>

                    <strong>
                      {interpretedReport
                        .extraction
                        .asset_id ===
                      "unknown"
                        ? "Unknown"
                        : interpretedReport
                            .extraction
                            .asset_id}
                    </strong>
                  </div>


                  <div>
                    <span>
                      INCIDENT TYPE
                    </span>

                    <strong>
                      {interpretedReport
                        .extraction
                        .incident_type
                        .replaceAll(
                          "_",
                          " "
                        )}
                    </strong>
                  </div>
                </div>


                <div className="livetruth-review-block">
                  <span>
                    REPORTED
                    EVIDENCE
                  </span>

                  <p>
                    {
                      interpretedReport
                        .extraction
                        .evidence_description
                    }
                  </p>
                </div>


                <div className="livetruth-review-block uncertainty">
                  <span>
                    WHAT REMAINS
                    UNCERTAIN
                  </span>

                  <p>
                    {
                      interpretedReport
                        .extraction
                        .uncertainty
                    }
                  </p>
                </div>


                <div
                  className={`livetruth-eligibility ${
                    interpretedReport
                      .extraction
                      .simulation_eligibility ===
                    "confirmed_failure"
                      ? "confirmed"
                      : "evidence-only"
                  }`}
                >
                  <strong>
                    {interpretedReport
                      .extraction
                      .simulation_eligibility ===
                    "confirmed_failure"
                      ? "ELIGIBLE FOR HUMAN APPROVAL"
                      : "EVIDENCE ONLY"}
                  </strong>

                  <span>
                    {
                      interpretedReport
                        .extraction
                        .simulation_reason
                    }
                  </span>
                </div>


                {interpretedReport
                  .extraction
                  .simulation_eligibility ===
                  "confirmed_failure" &&
                  interpretedReport
                    .extraction
                    .asset_id !==
                    "unknown" && (
                    <>
                      {!currentReportApproved ? (
                        <button
                          className="livetruth-approve"
                          onClick={
                            approveReportAsScenarioInput
                          }
                        >
                          <ShieldCheck
                            size={16}
                          />

                          APPROVE AS
                          SCENARIO INPUT
                        </button>
                      ) : (
                        <div className="livetruth-approved">
                          <ShieldCheck
                            size={16}
                          />

                          <div>
                            <strong>
                              APPROVED
                              FOR
                              SCENARIO
                            </strong>

                            <span>
                              This
                              infrastructure
                              failure is
                              now an
                              input to
                              the
                              deterministic
                              CASCADE
                              model.
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}


                {interpretedReport
                  .extraction
                  .simulation_eligibility ===
                  "evidence_only" && (
                  <div className="livetruth-not-applied">
                    <ShieldCheck
                      size={15}
                    />

                    <div>
                      <strong>
                        Not applied
                        to simulation
                      </strong>

                      <span>
                        The report
                        does not
                        explicitly
                        confirm that
                        the asset
                        itself has
                        failed.
                      </span>
                    </div>
                  </div>
                )}


                <button
                  className="livetruth-review-another"
                  onClick={
                    clearReport
                  }
                >
                  REVIEW ANOTHER
                  REPORT
                </button>
              </div>
            )}
          </div>,

          document.body
        )}
    </div>
  );
}