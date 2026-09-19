import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <header className="nav">
        <div className="logo">CASCADE</div>

        <div className="nav-right">
          <span>CRITICAL INFRASTRUCTURE INTELLIGENCE</span>

          <button onClick={() => navigate("/command")}>
            Open Command Center
          </button>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-background">
            <img
              src="/images/cascade-hero-city.png"
              alt=""
              className="hero-background-image"
            />
            <div className="hero-background-overlay" />
          </div>

          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="hero-kicker">
              CRITICAL INFRASTRUCTURE INTELLIGENCE
            </p>

            <h1>
              One failure
              <br />
              rarely stays
              <br />
              <span>one failure.</span>
            </h1>

            <p className="hero-description">
              CASCADE models how power, water, communications, transportation,
              hospitals and emergency services depend on each other, then
              predicts what may fail next before the damage spreads.
            </p>

            <div className="hero-actions">
              <button
                className="enter-button"
                onClick={() => navigate("/command")}
              >
                Enter Command Center
                <ArrowRight size={18} />
              </button>

              <a className="discover" href="#problem">
                Explore the system
                <ArrowDown size={17} />
              </a>
            </div>
          </motion.div>

          <motion.div
            className="hero-network"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 1.1 }}
          >
            <div className="network-line line-a" />
            <div className="network-line line-b" />
            <div className="network-line line-c" />
            <div className="network-line line-d" />
            <div className="network-line line-e" />

            <div className="network-node node-power">
              <span />
              POWER
            </div>

            <div className="network-node node-water">
              <span />
              WATER
            </div>

            <div className="network-node node-comms">
              <span />
              COMMUNICATIONS
            </div>

            <div className="network-node node-hospital">
              <span />
              HOSPITAL
            </div>

            <div className="network-node node-traffic">
              <span />
              TRANSPORT
            </div>

            <div className="network-core">
              <div className="core-ring ring-one" />
              <div className="core-ring ring-two" />

              <strong>CASCADE</strong>
              <small>LIVE MODEL</small>
            </div>
          </motion.div>

          <div className="hero-footer">
            <span>LIVE SYSTEM MODEL</span>
            <span>01 / 04</span>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="problem-section" id="problem">
          <div className="problem-visual">
            <motion.div
              className="problem-image-frame"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9 }}
            >
              <img
                src="/images/cascade-substation.png"
                alt="Electrical infrastructure during severe weather"
              />

              <div className="problem-image-overlay" />

              <div className="image-data">
                <span>GRID NODE</span>
                <strong>SUBSTATION N4</strong>
                <small>PRIMARY POWER DISTRIBUTION</small>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="problem-copy"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8 }}
          >
            <p className="section-label">THE PROBLEM</p>

            <h2>
              Infrastructure
              <br />
              doesn't fail
              <br />
              <span>in isolation.</span>
            </h2>

            <p className="section-description">
              A damaged power system can affect communications. Communications
              can affect emergency response. Transportation failures can delay
              repair crews. Hospitals can suddenly become dependent on backup
              systems.
            </p>

            <p className="section-description">
              The first failure may not be the most dangerous one.
            </p>
          </motion.div>
        </section>

        {/* CASCADE CHAIN */}
        <section className="cascade-section">
          <div className="section-intro">
            <p className="section-label">THE CASCADE</p>

            <h2>
              One event.
              <br />
              Multiple consequences.
            </h2>
          </div>

          <div className="cascade-flow">
            <motion.div
              className="flow-item"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="flow-number">01</span>
              <div className="flow-status stable-status" />
              <h3>Power</h3>
              <p>Substation failure detected.</p>
            </motion.div>

            <div className="flow-line">
              <span />
            </div>

            <motion.div
              className="flow-item"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <span className="flow-number">02</span>
              <div className="flow-status watch-status" />
              <h3>Communications</h3>
              <p>Cell towers switch to battery backup.</p>
            </motion.div>

            <div className="flow-line danger-line">
              <span />
            </div>

            <motion.div
              className="flow-item"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <span className="flow-number">03</span>
              <div className="flow-status warning-status" />
              <h3>Transportation</h3>
              <p>Traffic systems become degraded.</p>
            </motion.div>

            <div className="flow-line danger-line">
              <span />
            </div>

            <motion.div
              className="flow-item critical-flow"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <span className="flow-number">04</span>
              <div className="flow-status critical-status" />
              <h3>Critical Services</h3>
              <p>Hospital operations become vulnerable.</p>
            </motion.div>
          </div>
        </section>

        {/* REAL WORLD IMPACT */}
        <section className="impact-section">
          <div className="impact-background">
            <img
              src="/images/cascade-flood-response.png"
              alt=""
              className="impact-background-image"
            />
            <div className="impact-background-overlay" />
          </div>

          <motion.div
            className="impact-copy"
            initial={{ opacity: 0, y: 45 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
          >
            <p className="section-label">REAL WORLD IMPACT</p>

            <h2>
              During a disaster,
              <br />
              responders don't have
              <br />
              <span>unlimited time.</span>
            </h2>

            <p>
              Roads close. Communications become unreliable. Crews are limited.
              CASCADE turns infrastructure conditions into an evolving model of
              what is happening now and what may happen next.
            </p>
          </motion.div>

          <div className="impact-stat">
            <span>PREDICT</span>
            <strong>BEFORE</strong>
            <small>the next failure happens</small>
          </div>
        </section>

        {/* PREDICTION */}
        <section className="prediction-section">
          <div className="prediction-left">
            <p className="section-label">SEE NEXT</p>

            <h2>
              Predict the
              <br />
              <span>chain reaction.</span>
            </h2>

            <p>
              CASCADE combines infrastructure dependencies and live signals to
              estimate downstream risk and time to failure.
            </p>
          </div>

          <div className="prediction-visual">
            <div className="prediction-event">
              <div className="prediction-dot critical-dot" />

              <div>
                <span>SUBSTATION N4</span>
                <strong>FAILURE DETECTED</strong>
                <small>00:00</small>
              </div>
            </div>

            <div className="prediction-link">
              <div />
            </div>

            <div className="prediction-event">
              <div className="prediction-dot warning-dot" />

              <div>
                <span>TOWER C7</span>
                <strong>AT RISK</strong>
                <small>11 MIN</small>
              </div>
            </div>

            <div className="prediction-link amber-link">
              <div />
            </div>

            <div className="prediction-event">
              <div className="prediction-dot watch-dot" />

              <div>
                <span>HOSPITAL NORTH</span>
                <strong>BACKUP POWER EXPECTED</strong>
                <small>19 MIN</small>
              </div>
            </div>
          </div>
        </section>

        {/* FUTUREFORK */}
        <section className="future-section">
          <motion.div
            className="future-content"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.8 }}
          >
            <p className="section-label">FUTUREFORK</p>

            <h2>
              Every decision creates
              <br />
              <span>a different future.</span>
            </h2>

            <p>
              Simulate competing response strategies before committing
              emergency resources. Compare infrastructure recovered, critical
              services protected and people affected.
            </p>

            <button onClick={() => navigate("/command")}>
              Launch CASCADE
              <ArrowRight size={19} />
            </button>
          </motion.div>
        </section>
      </main>
    </div>
  );
}