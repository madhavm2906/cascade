import {
  Activity,
  ArrowLeft,
  CloudLightning,
  Radio,
  RotateCcw,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  getInfrastructureNodes,
  type Scenario,
} from "../data/infrastructure";

import CityMap from "../components/command/CityMap";

import { useNavigate } from "react-router-dom";

import "../styles/command.css";

export default function CommandCenter() {
  const navigate = useNavigate();

  const [
    scenario,
    setScenario,
  ] =
    useState<Scenario>("normal");

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<string | null>(null);

  const nodes = useMemo(
    () =>
      getInfrastructureNodes(
        scenario
      ),
    [scenario]
  );

  const selectedNode =
    selectedNodeId
      ? nodes.find(
          (node) =>
            node.id ===
            selectedNodeId
        ) ?? null
      : null;

  const affectedNodes =
    nodes.filter(
      (node) =>
        node.status !== "healthy"
    );

  const serviceExposure =
    affectedNodes.reduce(
      (total, node) =>
        total +
        node.populationServed,
      0
    );

  function startStorm() {
    setScenario("storm");

    setSelectedNodeId(
      "substation-n4"
    );
  }

  function resetScenario() {
    setScenario("normal");

    setSelectedNodeId(null);
  }

  return (
    <div
      className={`command-center ${
        scenario === "storm"
          ? "storm-active"
          : ""
      }`}
    >
      {/* MAP IS THE EXPERIENCE */}

      <div className="command-map-stage">
        <CityMap
          nodes={nodes}
          selectedNodeId={
            selectedNodeId
          }
          onNodeSelect={(node) =>
            setSelectedNodeId(
              node?.id ?? null
            )
          }
        />
      </div>

      {/* TOP HUD */}

      <header className="command-hud">
        <div className="hud-brand">
          <button
            className="hud-back"
            onClick={() =>
              navigate("/")
            }
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <strong>CASCADE</strong>

            <span>
              COMMAND INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="hud-center">
          <span
            className={`scenario-dot ${
              scenario
            }`}
          />

          {scenario === "normal"
            ? "MONITORING"
            : "SIMULATION ACTIVE"}
        </div>

        <div className="hud-right">
          <Activity size={14} />

          LIVE MODEL
        </div>
      </header>

      {/* INCIDENT BANNER */}

      {scenario === "storm" && (
        <div className="incident-banner">
          <CloudLightning
            size={16}
          />

          <div>
            <span>
              SIMULATED INCIDENT
            </span>

            <strong>
              Severe storm impacting
              north grid sector
            </strong>
          </div>
        </div>
      )}

      {/* LIVE TRUTH FLOATING INTELLIGENCE */}

      <aside className="truth-dock">
        <div className="dock-heading">
          <span>LIVE TRUTH</span>

          <strong>
            Situational Intelligence
          </strong>
        </div>

        {scenario === "normal" ? (
          <>
            <div className="truth-event">
              <ShieldCheck
                size={15}
              />

              <div>
                <strong>
                  Sources verified
                </strong>

                <span>
                  6 infrastructure
                  systems reporting
                  normally
                </span>
              </div>
            </div>

            <div className="truth-event">
              <Radio size={15} />

              <div>
                <strong>
                  No conflicting
                  reports
                </strong>

                <span>
                  Evidence streams
                  agree
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="truth-event danger">
              <Zap size={15} />

              <div>
                <strong>
                  Substation N4
                  offline
                </strong>

                <span>
                  Grid telemetry
                  confirms failure
                </span>
              </div>
            </div>

            <div className="truth-event warning">
              <Radio size={15} />

              <div>
                <strong>
                  Tower C7 degraded
                </strong>

                <span>
                  Battery fallback
                  detected
                </span>
              </div>
            </div>

            <div className="truth-event">
              <ShieldCheck
                size={15}
              />

              <div>
                <strong>
                  Incident evidence
                  consistent
                </strong>

                <span>
                  Confidence 94%
                </span>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* RIGHT INTELLIGENCE */}

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
                {selectedNode.name}
              </strong>
            </div>

            <div className="asset-status-row">
              <span>
                CURRENT STATUS
              </span>

              <strong
                className={`status-text ${selectedNode.status}`}
              >
                {selectedNode.status}
              </strong>
            </div>

            <p className="asset-description">
              {
                selectedNode.description
              }
            </p>

            <div className="asset-stat">
              <span>
                SERVICE EXPOSURE
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
                    .dependsOn.length
                }
              </strong>
            </div>

            {selectedNode.predictedFailureMinutes !==
              undefined && (
              <div className="failure-clock">
                <span>
                  PREDICTED FAILURE
                </span>

                <strong>
                  {selectedNode.predictedFailureMinutes ===
                  0
                    ? "NOW"
                    : `${selectedNode.predictedFailureMinutes} MIN`}
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
                  No active cascade
                </strong>

                <span>
                  Select any
                  infrastructure node
                  to inspect it.
                </span>
              </div>
            ) : (
              <div className="risk-summary">
                <span>
                  SYSTEMS AT RISK
                </span>

                <strong>
                  {
                    affectedNodes.length
                  }
                </strong>

                <small>
                  Service exposure:
                  {" "}
                  {serviceExposure.toLocaleString()}
                </small>
              </div>
            )}
          </>
        )}
      </aside>

      {/* NODE SELECTOR */}

      <div className="node-dock">
        <div className="node-dock-title">
          INFRASTRUCTURE
        </div>

        {nodes.map((node) => (
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
          >
            <span
              className={`node-status ${node.status}`}
            />

            <span>
              {node.shortName}
            </span>
          </button>
        ))}
      </div>

      {/* SCENARIO CONTROL */}

      <div className="scenario-control">
        {scenario === "normal" ? (
          <button
            className="storm-trigger"
            onClick={startStorm}
          >
            <CloudLightning
              size={17}
            />

            SIMULATE MAJOR STORM
          </button>
        ) : (
          <button
            className="reset-trigger"
            onClick={
              resetScenario
            }
          >
            <RotateCcw
              size={16}
            />

            RESET SIMULATION
          </button>
        )}
      </div>

      {/* IMPACT COUNTER */}

      {scenario === "storm" && (
        <div className="impact-counter">
          <Users size={14} />

          <div>
            <span>
              SERVICE EXPOSURE
            </span>

            <strong>
              {serviceExposure.toLocaleString()}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}