from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CASCADE API",
    description="AI powered infrastructure resilience and disaster response system",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "CASCADE",
        "status": "online",
        "message": "CASCADE command system is operational"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}