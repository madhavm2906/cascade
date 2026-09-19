import {
  Activity,
  ArrowLeft,
  CloudLightning,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import CityMap from "../components/command/CityMap";
import "../styles/command.css";

export default function CommandCenter() {
  const navigate = useNavigate();

  return (
    <div className="command-center">
      <header className="command-header">
        <div className="command-brand">
          <button onClick={() => navigate("/")}>
            <ArrowLeft size={17} />
          </button>

          <div>
            <strong>CASCADE</strong>
            <span>COMMAND INTELLIGENCE</span>
          </div>
        </div>

        <div className="command-status">
          <div className="live-indicator">
            <span />
            LIVE SYSTEM
          </div>

          <div className="scenario-indicator">
            <CloudLightning size={15} />
            MONITORING
          </div>
        </div>
      </header>

      <main className="command-layout">
        <aside className="intelligence-panel">
          <div className="panel-heading">
            <span>LIVE TRUTH</span>
            <h2>Situational Intelligence</h2>
          </div>

          <div className="intel-item">
            <ShieldCheck size={17} />

            <div>
              <strong>Systems verified</strong>
              <p>6 infrastructure sources reporting normally.</p>
            </div>
          </div>

          <div className="intel-item">
            <Radio size={17} />

            <div>
              <strong>Communications stable</strong>
              <p>No conflicting reports detected.</p>
            </div>
          </div>

          <div className="intel-item">
            <Users size={17} />

            <div>
              <strong>42,800 protected</strong>
              <p>Population inside monitored service zones.</p>
            </div>
          </div>

          <div className="intel-footer">
            <span>LAST UPDATE</span>
            <strong>LIVE</strong>
          </div>
        </aside>

        <section className="map-workspace">
          <div className="map-topbar">
            <div>
              <span>DIGITAL TWIN</span>
              <h1>Critical Infrastructure Network</h1>
            </div>

            <div className="map-live">
              <Activity size={14} />
              REAL TIME
            </div>
          </div>

          <div className="map-container">
            <CityMap />

            <div className="map-legend">
              <div>
                <span className="legend-dot healthy-dot" />
                Healthy
              </div>

              <div>
                <span className="legend-dot watch-dot" />
                Watch
              </div>

              <div>
                <span className="legend-dot warning-dot" />
                At Risk
              </div>

              <div>
                <span className="legend-dot critical-dot" />
                Critical
              </div>
            </div>
          </div>
        </section>

        <aside className="forecast-panel">
          <div className="panel-heading">
            <span>CASCADE FORECAST</span>
            <h2>Predicted Risk</h2>
          </div>

          <div className="forecast-empty">
            <div className="forecast-ring">
              <ShieldCheck size={23} />
            </div>

            <strong>No active cascade</strong>

            <p>
              Infrastructure dependencies are being monitored for downstream
              failure risk.
            </p>
          </div>

          <button className="simulate-button">
            <CloudLightning size={17} />
            Simulate Major Storm
          </button>
        </aside>
      </main>
    </div>
  );
}