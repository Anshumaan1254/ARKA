
import uvicorn
from fastapi import FastAPI, Request, File, UploadFile, Form, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import shutil
# --- Optimization & Config ---
import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2" # Suppress TF info/warnings

import json
import uuid
import numpy as np
from scipy.spatial.distance import cosine
from contextlib import asynccontextmanager

# --- DeepFace Import ---
try:
    from deepface import DeepFace
except ImportError:
    print("WARNING: DeepFace not found.")

# --- Configuration ---
UPLOAD_DIR = "static/uploads"
DATA_FILE = "data/embeddings.json"
MODEL_NAME = "ArcFace" # Reverting to ArcFace for maximum stability

# --- Lifecycle Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    
    # Initialize JSON DB if it doesn't exist
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w") as f:
            json.dump([], f)
    
    yield
    # Shutdown logic (if any)

app = FastAPI(lifespan=lifespan)

# --- Mount Static & Templates ---
# Ensure static directory exists before mounting
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Helper Functions ---
def load_embeddings():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_embedding(record):
    data = load_embeddings()
    data.append(record)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

def get_face_embedding(img_path):
    error_log = []
    
    # Strategy 1: Fast & Strict (MediaPipe)
    try:
        embedding_objs = DeepFace.represent(
            img_path=img_path, 
            model_name=MODEL_NAME, 
            detector_backend="mediapipe",
            enforce_detection=True
        )
        if len(embedding_objs) > 0:
            return embedding_objs[0]["embedding"], None
    except Exception as e:
        error_log.append(f"MediaPipe: {str(e)}")

    # Strategy 2: Robust & Strict (OpenCV)
    try:
        embedding_objs = DeepFace.represent(
            img_path=img_path, 
            model_name=MODEL_NAME, 
            detector_backend="opencv",
            enforce_detection=True
        )
        if len(embedding_objs) > 0:
            return embedding_objs[0]["embedding"], None
    except Exception as e:
        error_log.append(f"OpenCV: {str(e)}")

    # Strategy 3: Loose (OpenCV + No Enforce) - Takes whatever it finds
    try:
        # print("Trying Strategy 3: Enforce=False")
        embedding_objs = DeepFace.represent(
            img_path=img_path, 
            model_name=MODEL_NAME, 
            detector_backend="opencv", 
            enforce_detection=False
        )
        if len(embedding_objs) > 0:
            return embedding_objs[0]["embedding"], None
    except Exception as e:
        error_log.append(f"OpenCV_Loose: {str(e)}")

    # Strategy 4: Fallback (Skip) - Just process the image as-is
    try:
        embedding_objs = DeepFace.represent(
            img_path=img_path, 
            model_name=MODEL_NAME, 
            detector_backend="skip"
        )
        if len(embedding_objs) > 0:
            return embedding_objs[0]["embedding"], None
    except Exception as e:
        error_log.append(f"Skip: {str(e)}")

    # If we got here, everything failed. Return the logs.
    full_error_msg = " | ".join(error_log)
    print(f"FAILED: {full_error_msg}")
    return None, full_error_msg

# --- Routes ---

@app.get("/")
def read_root(request: Request):
    return templates.TemplateResponse("base.html", {"request": request})

@app.get("/register")
def get_register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/recognize")
def get_recognize(request: Request):
    return templates.TemplateResponse("recognize.html", {"request": request})

@app.post("/register")
async def register_user(
    name: str = Form(...),
    file: UploadFile = File(...),
    voice: UploadFile = File(...)
):
    user_id = str(uuid.uuid4())
    
    # Paths
    img_filename = f"{user_id}_{file.filename}"
    voice_filename = f"{user_id}_{voice.filename}"
    img_path = os.path.join(UPLOAD_DIR, img_filename)
    voice_path = os.path.join(UPLOAD_DIR, voice_filename)
    
    # Save files
    with open(img_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    with open(voice_path, "wb") as buffer:
        shutil.copyfileobj(voice.file, buffer)
        
    # Generate Embedding
    embedding, error = get_face_embedding(img_path)
    
    if embedding is None:
        # Cleanup voice if failed
        if os.path.exists(voice_path):
            os.remove(voice_path)
            
        return JSONResponse(status_code=400, content={"status": "fail", "message": f"Face detection failed. Details: {error}"})
    
    # Save Metadata
    record = {
        "id": user_id,
        "name": name,
        "voice_path": f"/static/uploads/{voice_filename}",
        "embedding": embedding
    }
    save_embedding(record)
    
    return JSONResponse(content={"status": "success", "message": f"User {name} registered successfully!"})

@app.post("/recognize")
async def recognize_user(file: UploadFile = File(...)):
    # Save upload temporarily
    temp_filename = f"temp_{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get embedding
    target_embedding, error = get_face_embedding(temp_path)
    
    # Cleanup temp file
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    if target_embedding is None:
        return JSONResponse(status_code=400, content={"status": "fail", "message": f"Face detection failed. Details: {error}"})
    
    # Vector Search
    known_users = load_embeddings()
    best_match = None
    min_dist = 100.0 # Start with a high distance
    
    threshold = 0.68 # ArcFace Threshold recommendation
    
    for user in known_users:
        stored_embedding = user["embedding"]
        dist = cosine(target_embedding, stored_embedding)
        
        if dist < min_dist:
            min_dist = dist
            best_match = user
            
    if best_match and min_dist < threshold:
        # Convert distance to a user-friendly percentage
        # Map [0, threshold] to [100, 60]
        # Formula: 100 - (distance / threshold) * 40
        score = int(100 - (min_dist / threshold) * 40)
        
        return JSONResponse(content={
            "status": "success",
            "name": best_match["name"],
            "audio_url": best_match["voice_path"],
            "confidence": score
        })
    else:
        return JSONResponse(content={"status": "fail", "message": "No match found."})

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
