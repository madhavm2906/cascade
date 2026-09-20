import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  ChevronRight,
  GitBranch,
  Layers3,
  Menu,
  RadioTower,
  ShieldCheck,
  Waves,
  X,
  Zap,
} from "lucide-react";
import "../styles/landing.css";

const steps = [
  {
    number: "01",
    label: "Understand the network",
    description: "Six connected services. One city. Explore how a failure in one place can reach another.",
    icon: Layers3,
  },
  {
    number: "02",
    label: "Explore a different future",
    description: "Move through a 30 minute scenario and compare the modeled effects of response choices.",
    icon: GitBranch,
  },
  {
    number: "03",
    label: "Bring in the field",
    description: "Speak or type a report. Gemini organizes the evidence for a person to review.",
    icon: AudioLines,
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "CASCADE | See what happens next";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="cascade-site">
      <a className="landing-skip" href="#main">Skip to content</a>
      <header className="landing-nav">
        <Link className="landing-logo" to="/" aria-label="CASCADE home" onClick={() => setMenuOpen(false)}>
          <span className="landing-logo-mark" aria-hidden="true"><Waves size={20} strokeWidth={2.2} /></span>
          <span>CASCADE<span className="landing-logo-dot">.</span></span>
        </Link>
        <nav className={`landing-nav-links ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <a href="#experience" onClick={() => setMenuOpen(false)}>The experience</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <Link to="/command" className="landing-nav-mobile-cta" onClick={() => setMenuOpen(false)}>Open simulation <ArrowUpRight size={16} /></Link>
        </nav>
        <Link className="landing-nav-cta" to="/command">Open simulation <ArrowUpRight size={15} /></Link>
        <button className="landing-nav-toggle" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <main id="main">
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing-hero-photo" role="img" aria-label="Atmospheric illustration of a city at dusk" />
          <div className="landing-hero-shade" />
          <div className="landing-hero-inner">
            <div className="landing-eyebrow"><span className="landing-eyebrow-line" /> A CITY IS A CONNECTED SYSTEM <span className="landing-eyebrow-end">01 / INTRODUCTION</span></div>
            <div className="landing-hero-copy">
              <h1 id="hero-heading">One outage.<br /><em>A thousand</em><br />connections.</h1>
              <p>What happens after the first failure? See how essential services depend on each other, explore the next 30 minutes, and find out how one decision changes the story.</p>
              <div className="landing-hero-actions">
                <Link className="landing-button landing-button-primary" to="/command">Enter the simulation <ArrowUpRight size={19} /></Link>
                <a className="landing-button landing-button-text" href="#experience">Explore the idea <ArrowDownRight size={18} /></a>
              </div>
            </div>
            <div className="landing-hero-footer">
              <span><span className="landing-pulse" /> INTERACTIVE FICTIONAL CITY</span>
              <span>BUILT AT VTHACKS 14 <span className="landing-footer-rule" /> SCROLL TO EXPLORE ↓</span>
            </div>
          </div>
        </section>

        <section id="experience" className="landing-statement" aria-label="What CASCADE explores">
          <div className="landing-statement-kicker">THE BIGGER PICTURE <span>02 / THE IDEA</span></div>
          <div className="landing-statement-grid">
            <h2>Nothing fails <em>alone.</em></h2>
            <div className="landing-statement-copy">
              <p>When the power goes out, the story doesn’t end at the substation. Communications, water, traffic, healthcare, and emergency services are connected in ways that are easy to miss.</p>
              <p>CASCADE makes those connections visible. Not as a real world prediction, but as a scenario you can explore, question, and change.</p>
              <Link className="landing-inline-link" to="/command">See the network <ArrowUpRight size={17} /></Link>
            </div>
          </div>
        </section>

        <section className="landing-feature" aria-labelledby="feature-heading">
          <div className="landing-feature-image" role="img" aria-label="Electric substation in a fictional infrastructure scenario">
            <div className="landing-feature-image-label"><Zap size={17} /> THE FIRST FAILURE <span>N4 / POWER</span></div>
          </div>
          <div className="landing-feature-story">
            <span className="landing-section-kicker">SEE THE RIPPLE EFFECT / 01</span>
            <h2 id="feature-heading">An entire city.<br /><em>One starting point.</em></h2>
            <p>Start with a substation outage and watch how the modeled consequences move through the network. Select any asset to understand what it depends on and when it may be affected.</p>
            <div className="landing-feature-facts">
              <span><strong>06</strong> connected services</span>
              <span><strong>30</strong> simulated minutes</span>
            </div>
            <Link className="landing-round-link" to="/command" aria-label="Explore the city network"><ArrowUpRight size={22} /></Link>
          </div>
        </section>

        <section id="how-it-works" className="landing-process" aria-labelledby="process-heading">
          <div className="landing-process-top"><span className="landing-section-kicker">HOW IT WORKS / 03</span><span>THREE WAYS INTO THE STORY</span></div>
          <div className="landing-process-heading"><h2 id="process-heading">Don’t just watch.<br /><em>Explore what’s next.</em></h2><p>CASCADE combines a deterministic network simulation with AI assisted report interpretation and a human decision point.</p></div>
          <div className="landing-process-list">
            {steps.map(({ number, label, description, icon: Icon }) => (
              <Link to="/command" className="landing-process-row" key={number}>
                <span className="landing-process-number">{number}</span>
                <span className="landing-process-icon"><Icon size={23} strokeWidth={1.65} /></span>
                <span className="landing-process-text"><strong>{label}</strong><span>{description}</span></span>
                <ChevronRight className="landing-process-arrow" size={22} />
              </Link>
            ))}
          </div>
        </section>

        <section className="landing-voice" aria-labelledby="voice-heading">
          <div className="landing-voice-visual"><div className="landing-voice-icon"><RadioTower size={34} strokeWidth={1.4} /></div><span>FIELD REPORT / AUDIO + TEXT</span><div className="landing-waveform" aria-hidden="true">{Array.from({ length: 25 }, (_, index) => <i key={index} style={{ height: `${15 + (Math.sin(index * 2.3) + 1) * 23 + (index % 4) * 3}px` }} />)}</div><div className="landing-voice-caption"><span>REVIEW REQUIRED</span><ShieldCheck size={19} /></div></div>
          <div className="landing-voice-copy"><span className="landing-section-kicker">LIVETRUTH / 04</span><h2 id="voice-heading">A voice from the field.<br /><em>A clearer picture.</em></h2><p>Record or type a report. Gemini transcribes and organizes what was reported, including what is still uncertain. A person decides whether an eligible report becomes part of the fictional scenario.</p><Link className="landing-inline-link" to="/command">Try a field report <ArrowUpRight size={17} /></Link></div>
        </section>

        <section className="landing-last" aria-labelledby="last-heading"><span>READY TO SEE THE CONNECTIONS?</span><h2 id="last-heading">The next move<br />is <em>yours.</em></h2><Link className="landing-button landing-button-primary" to="/command">Enter CASCADE <ArrowUpRight size={18} /></Link><p>Fictional exercise. Illustrative outcomes. No live infrastructure data or emergency dispatch.</p></section>
      </main>
      <footer className="landing-footer" aria-label="Project information">
        <div className="landing-footer-about">
          <Link className="landing-footer-brand" to="/" aria-label="CASCADE home">CASCADE<span>.</span></Link>
          <p>See how one failure can affect a connected city, and explore what a different response might change.</p>
          <small>Fictional simulation for demonstration and learning. No live emergency data.</small>
        </div>
        <div className="landing-footer-credit">
          <span>INDEPENDENT PROJECT / VTHACKS 14 · 2026</span>
          <strong>Built by Madhav Mangalagiri</strong>
          <span>Virginia Tech</span>
          <div className="landing-footer-links">
            <a href="https://github.com/madhavm2906/cascade" target="_blank" rel="noopener noreferrer" aria-label="CASCADE source code on GitHub (opens in a new tab)">GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
            <a href="https://devpost.com/software/cascade-rkpsf2" target="_blank" rel="noopener noreferrer" aria-label="CASCADE on Devpost (opens in a new tab)">Devpost <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
        <a className="landing-footer-top" href="#main">BACK TO TOP ↑</a>
      </footer>
    </div>
  );
}
