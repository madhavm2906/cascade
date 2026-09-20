import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import VoiceRecorder from "../components/command/VoiceRecorder";
import { API_BASE_URL } from "../lib/api";
import { Activity, ArrowLeft, ArrowUpRight, CloudLightning, ChevronDown, FileText, Layers, MapPin, LoaderCircle, Radio, RotateCcw, ShieldCheck, X, Zap, } from "lucide-react";
import CityMap from "../components/command/CityMap";
import { getInfrastructureNodes, type InfrastructureNode, } from "../data/infrastructure";
import "../styles/command.css";
type Intervention = "none" | "protect_hospital" | "stabilize_comms";
type Scenario = "normal" | "storm";
type InfrastructureAssetId = "substation-n4" | "hospital-north" | "tower-c7" | "pump-w2" | "traffic-t4" | "fire-f2";
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
    asset_id: InfrastructureAssetId | "unknown";
    incident_type: "power_failure" | "communications_failure" | "flooding" | "road_blockage" | "water_disruption" | "medical_disruption" | "other";
    evidence_description: string;
    uncertainty: string;
    simulation_eligibility: "confirmed_failure" | "evidence_only";
    simulation_reason: string;
};
type InterpretedReport = {
    original_text: string;
    extraction: ExtractedReport;
    verification_status: "unverified";
    applied_to_simulation: false;
    note: string;
};
const BASE_NODES = getInfrastructureNodes("normal");
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
const SAMPLE_REPORT = "I am a responder near Water Pump W2. I can see water rising around the pump station, but I cannot confirm whether the pump is damaged or still operating.";
export default function CommandCenter() {
    const navigate = useNavigate();
    const [scenario, setScenario] = useState<Scenario>("normal");
    const [intervention, setIntervention] = useState<Intervention>("none");
    const [atMinute, setAtMinute] = useState(0);
    const [selectedNodeId, setSelectedNodeId,] = useState<string | null>(null);
    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /*
      Human-approved infrastructure
      failures from LiveTruth.
    */
    const [approvedFailures, setApprovedFailures,] = useState<InfrastructureAssetId[]>([]);
    /*
      LiveTruth state
    */
    const [liveTruthOpen, setLiveTruthOpen,] = useState(false);
    const [mobilePanel, setMobilePanel] = useState<"trace" | "asset" | null>(null);
    const [mobileForkExpanded, setMobileForkExpanded] = useState(false);
    const [reportText, setReportText,] = useState("");
    const [reportLoading, setReportLoading,] = useState(false);
    const [reportError, setReportError,] = useState<string | null>(null);
    const [interpretedReport, setInterpretedReport,] = useState<InterpretedReport | null>(null);
    /*
      Request simulation from Python.
    */
    useEffect(() => {
        if (scenario !== "storm") {
            return;
        }
        const controller = new AbortController();
        async function loadSimulation() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/api/simulate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        intervention,
                        at_minute: atMinute,
                        approved_failures: approvedFailures,
                    }),
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error(`Simulation request failed: ${response.status}`);
                }
                const result = (await response.json()) as SimulationResult;
                if (!controller.signal.aborted) {
                    setSimulation(result);
                }
            }
            catch (requestError) {
                if (controller.signal.aborted) {
                    return;
                }
                console.error("CASCADE simulation error:", requestError);
                setError("Could not reach the Python simulation engine.");
            }
            finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
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
    const nodes = useMemo(() => {
        if (scenario === "normal" ||
            !simulation) {
            return BASE_NODES;
        }
        const calculatedNodes = new Map(simulation.nodes.map((node) => [
            node.id,
            node,
        ]));
        return BASE_NODES.map((baseNode) => {
            const calculated = calculatedNodes.get(baseNode.id);
            if (!calculated) {
                return baseNode;
            }
            return {
                ...baseNode,
                status: calculated.status,
                predictedFailureMinutes: calculated
                    .failure_minute ??
                    undefined,
            };
        });
    }, [
        scenario,
        simulation,
    ]);
    const selectedNode = nodes.find((node) => node.id ===
        selectedNodeId) ?? null;
    const selectedResult = simulation?.nodes.find((node) => node.id ===
        selectedNodeId) ?? null;
    const currentReportAsset = interpretedReport?.extraction
        .asset_id;
    const currentReportApproved = currentReportAsset !==
        undefined &&
        currentReportAsset !==
            "unknown" &&
        approvedFailures.includes(currentReportAsset);
    /*
      LiveTruth Gemini
      interpretation.
    */
    async function analyzeReport() {
        const cleanedReport = reportText.trim();
        if (cleanedReport.length < 10) {
            setReportError("Enter a little more detail before analyzing the report.");
            return;
        }
        setReportLoading(true);
        setReportError(null);
        setInterpretedReport(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/interpret`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: cleanedReport,
                }),
            });
            if (!response.ok) {
                const payload = await response
                    .json()
                    .catch(() => null);
                const message = payload?.detail ??
                    `LiveTruth request failed: ${response.status}`;
                throw new Error(message);
            }
            const result = (await response.json()) as InterpretedReport;
            setInterpretedReport(result);
            /*
              Select the infrastructure
              asset Gemini matched.
      
              This does NOT apply it
              to the simulation.
            */
            if (result.extraction
                .asset_id !==
                "unknown") {
                setSelectedNodeId(result.extraction
                    .asset_id);
            }
        }
        catch (requestError) {
            console.error("CASCADE LiveTruth error:", requestError);
            setReportError(requestError
                instanceof Error
                ? requestError.message
                : "The report could not be interpreted.");
        }
        finally {
            setReportLoading(false);
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
        const extraction = interpretedReport.extraction;
        if (extraction
            .simulation_eligibility !==
            "confirmed_failure") {
            return;
        }
        if (extraction.asset_id ===
            "unknown") {
            return;
        }
        const assetId = extraction.asset_id;
        setApprovedFailures((current) => {
            if (current.includes(assetId)) {
                return current;
            }
            return [
                ...current,
                assetId,
            ];
        });
        setSelectedNodeId(assetId);
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
        if (scenario === "normal") {
            setIntervention("none");
            setScenario("storm");
        }
    }
    function clearReport() {
        setReportText("");
        setReportError(null);
        setInterpretedReport(null);
    }
    function openLiveTruth() {
        setMobilePanel(null);
        setLiveTruthOpen(true);
    }
    useEffect(() => {
        if (!liveTruthOpen)
            return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape")
                setLiveTruthOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [liveTruthOpen]);
    function closeLiveTruth() {
        setLiveTruthOpen(false);
        setReportError(null);
    }
    /*
      Simulation controls.
    */
    function startStorm() {
        setIntervention("none");
        setAtMinute(0);
        setApprovedFailures([]);
        setSelectedNodeId("substation-n4");
        setSimulation(null);
        setError(null);
        setScenario("storm");
    }
    function resetSimulation() {
        setScenario("normal");
        setIntervention("none");
        setAtMinute(0);
        setApprovedFailures([]);
        setSelectedNodeId(null);
        setSimulation(null);
        setError(null);
        setLoading(false);
    }
    return (<div className={`command-center ${scenario === "storm"
            ? "storm-active"
            : ""}`}>
      {/* MAP */}

      <div className="command-map-stage">
        <CityMap nodes={nodes} selectedNodeId={selectedNodeId} futureForkOpen={scenario === "storm"} onNodeSelect={(node) => {
            setSelectedNodeId(node?.id ?? null);
            if (node)
                setMobilePanel("asset");
            else
                setMobilePanel((current) => current === "asset" ? null : current);
        }}/>
      </div>

      {/* TOP HUD */}

      <header className="command-hud">
        <div className="hud-brand">
          <button className="hud-back" aria-label="Return to landing page" onClick={() => navigate("/")}>
            <ArrowLeft size={17}/>
          </button>

          <div>
            <strong>
              CASCADE
            </strong>

            <span>
              CITY SIMULATION
            </span>
          </div>
        </div>

        <div className="hud-center" role="status">
          <span className={`scenario-dot ${scenario}`} aria-hidden="true"/>
          <div className="hud-context">
            <span>{scenario === "normal" ? "EXERCISE READY" : "SCENARIO 01  /  STORM EVENT"}</span>
            <strong>{scenario === "normal" ? "Explore the network" : `N4 offline · T + ${atMinute} min`}</strong>
          </div>
        </div>

        <div className="hud-right">
          <Activity size={14}/>

          FICTIONAL EXERCISE  /  NO LIVE DATA
        </div>
      </header>

      {/* LEFT PANEL */}

      <aside className={`truth-dock ${mobilePanel === "trace" ? "mobile-visible" : ""}`}>
        <div className="dock-heading">
          <span>01  /  MODEL TRACE</span>

          <strong>
            {scenario ===
            "normal"
            ? "Scenario ready"
            : "The chain reaction"}
          </strong>
        </div>

        {scenario === "normal" ? (<div className="trace-intro">
            <span className="trace-index">01 / NETWORK EXERCISE</span>
            <p>One outage can reach far beyond its starting point. Explore six connected services across a fictional city.</p>
            <button type="button" className="trace-start" onClick={startStorm}>
              Run the scenario <ArrowUpRight size={17} aria-hidden="true"/>
            </button>
          </div>) : (<>
            <div className="truth-event danger">
              <Zap size={15}/>

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
                0 && (<div className="truth-event warning">
                <ShieldCheck size={15}/>

                <div>
                  <strong>
                    Human-approved
                    field input
                  </strong>

                  <span>
                    {approvedFailures
                    .length}{" "}
                    additional
                    reported failure
                    {approvedFailures.length ===
                    1
                    ? ""
                    : "s"}{" "}
                    applied.
                  </span>
                </div>
              </div>)}

            {simulation?.timeline
                .filter((event) => event.minute >
                0 &&
                event.minute <=
                    atMinute)
                .slice(-3)
                .map((event) => (<div className="truth-event warning" key={event.node_id}>
                    <Activity size={15}/>

                    <div>
                      <strong>
                        {event.name}{" "}
                        failed
                      </strong>

                      <span>
                        Simulated
                        minute{" "}
                        {event.minute}
                      </span>
                    </div>
                  </div>))}

            {atMinute ===
                0 && (<div className="truth-event">
                <Radio size={15}/>

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
              </div>)}
          </>)}

        <button className="livetruth-launch" onClick={openLiveTruth}>
          <FileText size={15}/>

          <span>
            SUBMIT FIELD REPORT
          </span>
        </button>
      </aside>

      {/* RIGHT PANEL */}

      <aside className={`asset-dock ${mobilePanel === "asset" ? "mobile-visible" : ""}`}>
        {selectedNode ? (<>
            <div className="dock-heading">
              <span>
                {selectedNode.type}
              </span>

              <strong>
                {selectedNode.name}
              </strong>
            </div>

            <div className="asset-status-row">
              <span>
                CURRENT STATUS
              </span>

              <strong className={`status-text ${selectedNode.status}`}>
                {selectedNode.status}
              </strong>
            </div>

            <p className="asset-description">
              {selectedNode.description}
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
                {selectedNode
                .dependsOn
                .length}
              </strong>
            </div>

            {scenario ===
                "storm" &&
                simulation &&
                selectedResult && (<div className="failure-clock">
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
                </div>)}
          </>) : (<>
            <div className="dock-heading">
              <span>
                CASCADE FORECAST
              </span>

              <strong>
                Network Risk
              </strong>
            </div>

            {scenario ===
                "normal" ? (<div className="forecast-clear">
                <ShieldCheck size={25}/>

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
              </div>) : (<div className="risk-summary">
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
              </div>)}
          </>)}
      </aside>

      {/* INFRASTRUCTURE SELECTOR */}

      <div className="node-dock">
        <div className="node-dock-title">
          INFRASTRUCTURE
        </div>

        {nodes.map((node) => (<button key={node.id} className={selectedNodeId ===
                node.id
                ? "selected"
                : ""} onClick={() => setSelectedNodeId(node.id)} title={node.name} aria-label={`Inspect ${node.name}`}>
              <span className={`node-status ${node.status}`}/>

              <span>
                {node.shortName}
              </span>
            </button>))}
      </div>

      {/* FUTUREFORK */}

      {scenario ===
            "storm" && (<section className={`futurefork-dock ${mobileForkExpanded ? "" : "mobile-collapsed"}`}>
          <button type="button" className="futurefork-mobile-toggle" aria-expanded={mobileForkExpanded} onClick={() => {
                setMobileForkExpanded((expanded) => !expanded);
                setMobilePanel(null);
            }}>
            <span>FutureFork <small>Explore the next 30 minutes</small></span>
            <ChevronDown size={18} aria-hidden="true"/>
          </button>
          <div className="futurefork-topline">
            <div>
              <span>03  /  FUTUREFORK</span>

              <strong>
                Explore another outcome
              </strong>
            </div>

            <span className="futurefork-engine">
              {loading ? "Updating model…" : "30-minute outlook"}
            </span>
          </div>

          <div className="futurefork-options">
            {INTERVENTIONS.map((option) => (<button key={option.id} className={intervention ===
                    option.id
                    ? "active"
                    : ""} onClick={() => setIntervention(option.id)}>
                  {option.label}
                </button>))}
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

            <input type="range" min="0" max="30" step="1" value={atMinute} aria-label="Simulation minute" onChange={(event) => setAtMinute(Number(event.target
                .value))}/>

            <div className="futurefork-time-ends">
              <span>
                NOW
              </span>

              <span>
                +30 MIN
              </span>
            </div>
          </div>

          {simulation && (<div className="futurefork-outcome">
              <strong>
                {simulation
                    .summary
                    .projected_affected_systems}{" "}
                projected
                system failures
              </strong>

              <span>
                {simulation.summary.service_exposures.toLocaleString()}{" "}
                service
                exposures*
              </span>
            </div>)}

          {approvedFailures.length >
                0 && (<div className="futurefork-approved-input">
              HUMAN-APPROVED INPUT:{" "}
              {approvedFailures.join(", ")}
            </div>)}

          {error && (<p className="futurefork-error">
              {error}
            </p>)}

          <p className="futurefork-disclaimer">
            *Fictional network.
            Illustrative failure
            times. Service
            populations can
            overlap. Results are
            simulated, not live
            forecasts.
          </p>
        </section>)}

      {/* STORM / RESET */}

      <div className="scenario-control">
        {scenario ===
            "normal" ? (<button className="storm-trigger" onClick={startStorm}>
            <CloudLightning size={17}/>

            SIMULATE MAJOR
            STORM
          </button>) : (<button className="reset-trigger" onClick={resetSimulation}>
            <RotateCcw size={16}/>

            RESET SIMULATION
          </button>)}
      </div>

      {/* Narrow-screen controls */}
      <nav className="mobile-command-bar" aria-label="Command Center tools">
        <button type="button" className={mobilePanel === "trace" ? "active" : ""} aria-expanded={mobilePanel === "trace"} onClick={() => setMobilePanel((current) => current === "trace" ? null : "trace")}>
          <Layers size={18} aria-hidden="true"/>
          <span>Network</span>
        </button>
        <button type="button" className={mobilePanel === "asset" ? "active" : ""} aria-expanded={mobilePanel === "asset"} onClick={() => setMobilePanel((current) => current === "asset" ? null : "asset")}>
          <MapPin size={18} aria-hidden="true"/>
          <span>Asset</span>
        </button>
        <button type="button" onClick={openLiveTruth}>
          <FileText size={18} aria-hidden="true"/>
          <span>Report</span>
        </button>
        <button type="button" className="mobile-run" onClick={scenario === "normal" ? startStorm : resetSimulation}>
          {scenario === "normal"
            ? <CloudLightning size={18} aria-hidden="true"/>
            : <RotateCcw size={18} aria-hidden="true"/>}
          <span>{scenario === "normal" ? "Run storm" : "Reset"}</span>
        </button>
      </nav>

      {/* Human review drawer */}
      {liveTruthOpen && createPortal(<>
          <button type="button" className="livetruth-scrim" aria-label="Close field evidence" onClick={closeLiveTruth}/>
          <section className="livetruth-workbench" role="dialog" aria-modal="true" aria-labelledby="livetruth-heading">
            <header className="livetruth-header">
              <div className="livetruth-title">
                <span className="livetruth-eyebrow"><span className="live-indicator"/> LIVETRUTH / FIELD EVIDENCE</span>
                <h2 id="livetruth-heading">{interpretedReport ? "Review the report." : "Tell us what you see."}</h2>
              </div>
              <button type="button" className="livetruth-close" aria-label="Close field evidence" onClick={closeLiveTruth}><X size={20}/></button>
            </header>

            {!interpretedReport ? (<div className="livetruth-compose">
                <p className="livetruth-intro">A short observation is enough. Record it or type it below. Gemini will organize the details for your review, not verify an incident.</p>
                <VoiceRecorder onResult={(result) => {
                    setInterpretedReport(result);
                    setReportText(result.original_text);
                    setReportError(null);
                    if (result.extraction.asset_id !== "unknown")
                        setSelectedNodeId(result.extraction.asset_id);
                }}/>
                <div className="livetruth-entry-divider"><span>OR TYPE YOUR REPORT</span></div>
                <label className="livetruth-label" htmlFor="field-report">Your observation</label>
                <textarea id="field-report" value={reportText} maxLength={1500} onChange={(event) => setReportText(event.target.value)} placeholder="What did you see? Which infrastructure asset is involved? What remains unknown?"/>
                <div className="livetruth-helper-row">
                  <button type="button" className="livetruth-sample" onClick={() => { setReportText(SAMPLE_REPORT); setReportError(null); }}>Try an example <ArrowUpRight size={14}/></button>
                  <span>{reportText.length} / 1500</span>
                </div>
                {reportError && <div className="livetruth-api-error" role="alert">{reportError}</div>}
                <button type="button" className="livetruth-analyze" disabled={reportLoading} onClick={analyzeReport}>
                  {reportLoading ? <><LoaderCircle className="livetruth-spinner" size={17}/> Reading your report…</> : <>Review with Gemini <ArrowUpRight size={17}/></>}
                </button>
                <p className="livetruth-safety-note">Your report stays unverified. No live infrastructure or emergency service is affected.</p>
              </div>) : (<div className="livetruth-review">
                <div className="livetruth-verification"><span className="livetruth-unverified-dot"/> UNVERIFIED  <span className="livetruth-status-explainer">Human review required</span></div>
                <div className="livetruth-review-block livetruth-report-source">
                  <span>01 / ORIGINAL REPORT</span>
                  <p>“{interpretedReport.original_text}”</p>
                </div>
                <div className="livetruth-review-block livetruth-summary">
                  <span>02 / GEMINI INTERPRETATION</span>
                  <strong>{interpretedReport.extraction.summary}</strong>
                  <div className="livetruth-review-grid">
                    <div><span>MATCHED ASSET</span><strong>{interpretedReport.extraction.asset_id === "unknown" ? "Unknown" : nodes.find((node) => node.id === interpretedReport.extraction.asset_id)?.name ?? interpretedReport.extraction.asset_id}</strong></div>
                    <div><span>REPORTED INCIDENT</span><strong>{interpretedReport.extraction.incident_type.replaceAll("_", " ")}</strong></div>
                  </div>
                </div>
                <div className="livetruth-review-block">
                  <span>03 / WHAT WAS REPORTED</span>
                  <p>{interpretedReport.extraction.evidence_description}</p>
                </div>
                <div className="livetruth-review-block uncertainty">
                  <span>04 / WHAT IS STILL UNKNOWN</span>
                  <p>{interpretedReport.extraction.uncertainty}</p>
                </div>
                <div className={`livetruth-eligibility ${interpretedReport.extraction.simulation_eligibility === "confirmed_failure" ? "confirmed" : "evidence-only"}`}>
                  <span className="livetruth-decision-label">05 / SCENARIO DECISION</span>
                  <strong>{interpretedReport.extraction.simulation_eligibility === "confirmed_failure" ? "Explicit failure claim" : "Evidence only"}</strong>
                  <p>{interpretedReport.extraction.simulation_reason}</p>
                </div>
                {interpretedReport.extraction.simulation_eligibility === "confirmed_failure" && interpretedReport.extraction.asset_id !== "unknown" && (!currentReportApproved ? (<button type="button" className="livetruth-approve" onClick={approveReportAsScenarioInput}>Use as fictional scenario input <ArrowUpRight size={17}/></button>) : (<div className="livetruth-approved"><ShieldCheck size={18}/><div><strong>Scenario updated</strong><span>This report is now an input to the fictional CASCADE model, not a verified incident.</span></div></div>))}
                {interpretedReport.extraction.simulation_eligibility === "evidence_only" && <div className="livetruth-not-applied"><ShieldCheck size={18}/><div><strong>Not applied to the scenario</strong><span>An infrastructure failure was not explicitly reported.</span></div></div>}
                <button type="button" className="livetruth-review-another" onClick={clearReport}>Review another report <ArrowUpRight size={15}/></button>
              </div>)}
          </section>
        </>, document.body)}
    </div>);
}
