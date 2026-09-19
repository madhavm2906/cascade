import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Building2,
  Radio,
  ShieldCheck,
  Users,
  Zap,
  Droplets,
  Siren,
  ArrowRight,
} from "lucide-react";
import "./App.css";

function App() {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/health")
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  return (
    <div className="app-shell">
      <div className="background-overlay" />

      <header className="topbar">
        <div className="brand-block">
          <h1>CASCADE</h1>
          <p>Critical Infrastructure Intelligence Platform</p>
        </div>

        <div className="topbar-right">
          <div className="threat-badge high">
            <AlertTriangle size={14} />
            Elevated Weather Threat
          </div>

          <div className="system-status">
            <span className={backendOnline ? "dot online" : "dot offline"} />
            {backendOnline ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
          </div>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero-panel glass">
          <div className="hero-left">
            <p className="eyebrow">ACTIVE SCENARIO</p>
            <h2>Storm impact monitoring across critical city systems</h2>
            <p className="hero-text">
              CASCADE tracks infrastructure dependencies across power, water,
              communications, hospitals, and emergency services to predict
              cascading failures before they spread.
            </p>

            <div className="hero-actions">
              <button className="primary-btn">
                <AlertTriangle size={18} />
                Simulate Major Storm
              </button>

              <button className="secondary-btn">
                View Response Plan
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="hero-right">
            <div className="impact-card">
              <p>Population Protected</p>
              <h3>42,800</h3>
              <span>Across 5 critical service zones</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card glass">
            <div className="icon blue">
              <Zap />
            </div>
            <div>
              <span>Power Grid</span>
              <strong>Stable</strong>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="icon cyan">
              <Droplets />
            </div>
            <div>
              <span>Water Systems</span>
              <strong>Normal</strong>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="icon purple">
              <Radio />
            </div>
            <div>
              <span>Communications</span>
              <strong>Connected</strong>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="icon green">
              <Building2 />
            </div>
            <div>
              <span>Critical Facilities</span>
              <strong>12 Online</strong>
            </div>
          </div>
        </section>

        <section className="main-grid">
          <aside className="left-panel glass">
            <div className="panel-header">
              <div>
                <p className="eyebrow">SITUATIONAL AWARENESS</p>
                <h3>Incident Summary</h3>
              </div>
            </div>

            <div className="incident-card warning">
              <div className="incident-icon">
                <Siren size={18} />
              </div>
              <div>
                <strong>Storm front approaching west district</strong>
                <p>High wind and lightning risk near core infrastructure.</p>
              </div>
            </div>

            <div className="incident-card neutral">
              <div className="incident-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>No confirmed service failures</strong>
                <p>All major infrastructure currently remains operational.</p>
              </div>
            </div>

            <div className="incident-card neutral">
              <div className="incident-icon">
                <Users size={18} />
              </div>
              <div>
                <strong>Emergency crews available</strong>
                <p>3 field teams on standby for dispatch.</p>
              </div>
            </div>
          </aside>

          <section className="center-panel glass">
            <div className="panel-header">
              <div>
                <p className="eyebrow">DIGITAL TWIN</p>
                <h3>City Infrastructure Map</h3>
              </div>

              <div className="live-badge">
                <Activity size={14} />
                LIVE
              </div>
            </div>

            <div className="map-panel">
              <div className="map-overlay-grid" />

              <div className="node node1">Substation N1</div>
              <div className="node node2">Central Hospital</div>
              <div className="node node3">Water Pump W2</div>
              <div className="node node4">Tower C7</div>
              <div className="node node5">Fire Station F2</div>
              <div className="node node6">Traffic Hub T4</div>

              <div className="map-caption">
                Interactive infrastructure network will appear here next.
              </div>
            </div>
          </section>

          <aside className="right-panel glass">
            <div className="panel-header">
              <div>
                <p className="eyebrow">RESPONSE INTELLIGENCE</p>
                <h3>Recommended Action</h3>
              </div>
            </div>

            <div className="recommendation-card">
              <strong>Current status is stable</strong>
              <p>
                CASCADE is monitoring for early indicators of cascading risk.
              </p>
            </div>

            <div className="future-card">
              <p className="future-title">FutureFork Preview</p>
              <div className="future-row">
                <span>Repair upstream power</span>
                <span className="future-good">Best option</span>
              </div>
              <div className="future-row">
                <span>Protect hospital backup systems</span>
                <span className="future-mid">Secondary</span>
              </div>
              <div className="future-row">
                <span>Split emergency crews</span>
                <span className="future-low">Higher risk</span>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;