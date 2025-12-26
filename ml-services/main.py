from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routes import frame_routes, voice_routes, object_routes

app = FastAPI(
    title="Alzheimer Care ML Services",
    description="ML services for face recognition, frame detection, and voice processing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(frame_routes.router, prefix="/frame", tags=["Frame Detection"])
app.include_router(voice_routes.router, prefix="/voice", tags=["Voice Processing"])
app.include_router(object_routes.router, prefix="/object", tags=["Object Detection"])

@app.get("/")
async def root():
    return {"message": "Alzheimer Care ML Services", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "services": ["frame_detection", "voice_processing", "object_detection"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", 8000)))
