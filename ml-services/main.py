from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

# Core ML Routes
from routes import frame_routes, voice_routes, object_routes

# ARKA Innovation ML Routes - Imagine Cup 2026
from routes import cognitive_routes, emotion_routes, training_routes, recorder_routes

app = FastAPI(
    title="ARKA - Alzheimer Care AI Services",
    description="Advanced ML services for cognitive health monitoring, emotion recognition, memory training, and life recording",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Routes
app.include_router(frame_routes.router, prefix="/frame", tags=["Frame Detection"])
app.include_router(voice_routes.router, prefix="/voice", tags=["Voice Processing"])
app.include_router(object_routes.router, prefix="/object", tags=["Object Detection"])

# ARKA Innovation Routes
app.include_router(cognitive_routes.router, prefix="/cognitive", tags=["Cognitive Health"])
app.include_router(emotion_routes.router, prefix="/emotion", tags=["Emotion Recognition"])
app.include_router(training_routes.router, prefix="/training", tags=["Memory Training"])
app.include_router(recorder_routes.router, prefix="/recorder", tags=["Life Recorder"])

@app.get("/")
async def root():
    return {
        "message": "ARKA - Alzheimer Care AI Services",
        "status": "running",
        "version": "2.0.0",
        "features": [
            "Cognitive Health Monitoring",
            "Real-time Emotion Recognition",
            "Memory Training (Spaced Repetition)",
            "AI Life Recorder"
        ]
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "services": [
            "frame_detection",
            "voice_processing",
            "object_detection",
            "cognitive_health",
            "emotion_recognition",
            "memory_training",
            "life_recorder"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", 8000)))

