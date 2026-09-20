# CASCADE

### One outage. A thousand connections.

**CASCADE is an interactive disaster response simulator that shows how a failure in one essential service can affect an entire connected city.**

I built CASCADE at VTHacks 14 to explore a simple question: when something goes wrong in a city, how can we understand what might happen next and see how our response could change it?

Start with a power outage, follow the effects across the infrastructure network, compare different choices, and bring a field report into the scenario. CASCADE combines a clear visual simulation with AI assisted report analysis, while keeping the final decision in human hands.

**[Explore the live website](https://cascade-web-dpm7.onrender.com)** · **[View the project on Devpost](https://devpost.com/software/cascade-rkpsf2)**

## What you can do

| Experience | What it does |
| :--- | :--- |
| **Explore the city** | Select six infrastructure assets on an interactive map and see how the services depend on one another. |
| **Run the storm scenario** | Start with an outage at Power Substation N4 and follow the modeled effects over 30 minutes. |
| **Use FutureFork** | Compare no intervention, protecting the hospital, and supporting communications. Move through the timeline to see how each choice changes the modeled outcome. |
| **Send a LiveTruth report** | Type an observation or record a short voice report. Gemini helps organize what was reported, which asset may be involved, and what is still unknown. |
| **Review before applying** | A report remains unverified. If it explicitly describes an infrastructure failure, a person can choose to use it as an additional input to the fictional scenario. |
| **Reset and explore again** | Clear the scenario and try another response or report. |

The site is designed to work on both desktop and mobile.

## How it works

### 1. A connected city

CASCADE models a small fictional infrastructure network with six assets: a power substation, communications tower, hospital, water pump, traffic system, and emergency station. The connections between them help explain why a problem in one service may lead to problems elsewhere.

### 2. A simulation you can explore

The Python simulation engine uses the network dependencies and predefined scenario rules to calculate when each asset may be affected. FutureFork runs the scenario again when you change the intervention, move the timeline, or approve another failure as a scenario input.

**Gemini does not calculate the infrastructure failure timeline.** The simulation is rule based, which makes the different outcomes easier to inspect and compare.

### 3. Field reports with human review

LiveTruth accepts typed observations and voice recordings. For voice reports, the backend transcribes the audio before interpreting the report with Gemini. The review screen separates the original report from the AI interpretation, the reported evidence, and the remaining uncertainty.

For example, a report about rising water near the pump is not enough to treat the pump as failed if its operating status is unknown. A report that explicitly describes the communications tower as offline can be offered as a possible scenario input, but it is **still unverified**. The simulation changes only when a person approves that input.

Approval changes the **fictional model**, not the status of any real infrastructure.

## Built with

| Area | Tools and technologies |
| :--- | :--- |
| Website | React, TypeScript, Vite, HTML, CSS, React Router |
| Map and interface | MapLibre GL JS, OpenStreetMap map tiles, Lucide React, browser MediaRecorder API |
| Typography | DM Sans, Instrument Serif, Inter |
| Backend and simulation | Python, FastAPI, NetworkX, Uvicorn |
| Report interpretation | Google Gemini, Google Gen AI SDK, Google Cloud Vertex AI express mode |
| Deployment and source control | Render, Git, GitHub |

The frontend handles the interactive experience. The FastAPI backend runs the simulation and processes the reports. The Gemini API key stays on the backend and is not included in the frontend code.

## Run it locally

You will need Python, Node.js, npm, and a Gemini API key to use the report interpretation features. The simulation can be explored independently of the report workflow.

Clone the project:

```powershell
git clone https://github.com/madhavm2906/cascade.git
cd cascade
```

Open a terminal in the project folder. Create a Python environment, install the backend dependencies, and start the API:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi "uvicorn[standard]" networkx google-genai python-multipart python-dotenv
$env:GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
uvicorn backend.app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`. You can check its health endpoint at `http://127.0.0.1:8000/health` and its interactive API documentation at `http://127.0.0.1:8000/docs`.

Open a **second terminal** in the project folder for the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to view the website.

The frontend uses `http://127.0.0.1:8000` as its local API address by default. For deployment, set `VITE_API_BASE_URL` to the public backend URL in your frontend hosting environment. Keep `GOOGLE_API_KEY` on the backend only. Never commit real API keys or local environment files to GitHub.

## A note on the results

CASCADE is a **fictional demonstration and learning project**, not a live emergency system. Its assets, failure times, and projected effects are illustrative. Any displayed service exposure total refers to modeled exposures across services, not a count of unique people.

Field reports are not independently verified by Gemini or CASCADE. The project does not use live infrastructure data, confirm real incidents, or send emergency dispatch instructions.

## About the project

Built by **Madhav Mangalagiri**, a Computer Science student at **Virginia Tech**, as a solo project for **VTHacks 14 · 2026**.

I wanted to make infrastructure dependencies easier to see and give people a simple way to explore how a different decision could change a scenario. CASCADE is my attempt to bring those ideas together in one interactive experience.