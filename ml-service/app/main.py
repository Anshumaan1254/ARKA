import os
import uuid
import io
from contextlib import asynccontextmanager

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from dotenv import load_dotenv
load_dotenv()

import numpy as np
from scipy.spatial.distance import cosine
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from PIL import Image

# MediaPipe for object detection
try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    print("WARNING: MediaPipe not found. Install with: pip install mediapipe")
    MEDIAPIPE_AVAILABLE = False

# YOLOv8 for object detection
try:
    from ultralytics import YOLO
    YOLO_MODEL = YOLO("yolov8n.pt")  # Nano model - fast and lightweight
    YOLO_AVAILABLE = True
    print("YOLOv8 loaded successfully")
except Exception as e:
    print(f"WARNING: YOLOv8 not available: {e}")
    YOLO_MODEL = None
    YOLO_AVAILABLE = False

try:
    from deepface import DeepFace
except ImportError:
    print("WARNING: DeepFace not found. Install with: pip install deepface")
    DeepFace = None

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "ArcFace")
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.68"))

supabase: Client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"ML Service connected to Supabase")
    print(f"Using model: {MODEL_NAME}, threshold: {SIMILARITY_THRESHOLD}")
    yield
    print("ML Service shutting down")

app = FastAPI(
    title="ARKA ML Service",
    description="Face recognition and voice processing for Alzheimer's patients",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


def get_face_embedding(img_path: str):
    if DeepFace is None:
        return None, "DeepFace not installed"
    
    error_log = []
    
    backends = [
        ("mediapipe", True),
        ("opencv", True),
        ("opencv", False),
        ("skip", False)
    ]
    
    for backend, enforce in backends:
        try:
            embedding_objs = DeepFace.represent(
                img_path=img_path,
                model_name=MODEL_NAME,
                detector_backend=backend,
                enforce_detection=enforce
            )
            if len(embedding_objs) > 0:
                return embedding_objs[0]["embedding"], None
        except Exception as e:
            error_log.append(f"{backend}: {str(e)}")
    
    return None, " | ".join(error_log)


async def save_temp_file(file: UploadFile) -> str:
    temp_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    
    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)
    
    return temp_path


def cleanup_temp_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Warning: Could not delete temp file {path}: {e}")


def find_best_match(target_embedding: list, patient_id: str):
    response = supabase.table("people").select(
        "id, name, face_embedding, image_path"
    ).eq("patient_id", patient_id).not_.is_("face_embedding", "null").execute()
    
    if not response.data:
        return None, 1.0
    
    best_match = None
    min_distance = 1.0
    
    target_np = np.array(target_embedding)
    
    for person in response.data:
        stored_embedding = person.get("face_embedding")
        if stored_embedding:
            if isinstance(stored_embedding, str):
                stored_embedding = eval(stored_embedding)
            
            stored_np = np.array(stored_embedding)
            distance = cosine(target_np, stored_np)
            
            if distance < min_distance:
                min_distance = distance
                best_match = person
    
    return best_match, min_distance


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "threshold": SIMILARITY_THRESHOLD,
        "deepface_available": DeepFace is not None
    }


@app.post("/register")
async def register_face(
    person_id: str = Form(...),
    patient_id: str = Form(...),
    file: UploadFile = File(...)
):
    temp_path = None
    try:
        temp_path = await save_temp_file(file)
        
        embedding, error = get_face_embedding(temp_path)
        
        if embedding is None:
            raise HTTPException(
                status_code=400,
                detail=f"Face detection failed: {error}"
            )
        
        storage_path = f"{patient_id}/{person_id}_{uuid.uuid4()}.jpg"
        
        with open(temp_path, "rb") as f:
            file_content = f.read()
        
        supabase.storage.from_("faces").upload(
            storage_path,
            file_content,
            {"content-type": "image/jpeg"}
        )
        
        supabase.table("people").update({
            "face_embedding": embedding,
            "image_path": storage_path
        }).eq("id", person_id).execute()
        
        return JSONResponse(content={
            "status": "success",
            "message": "Face registered successfully",
            "person_id": person_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path:
            cleanup_temp_file(temp_path)


@app.post("/recognize")
async def recognize_face(
    patient_id: str = Form(...),
    file: UploadFile = File(...)
):
    temp_path = None
    try:
        temp_path = await save_temp_file(file)
        
        target_embedding, error = get_face_embedding(temp_path)
        
        if target_embedding is None:
            return JSONResponse(
                status_code=400,
                content={"status": "fail", "message": f"Face detection failed: {error}"}
            )
        
        best_match, min_distance = find_best_match(target_embedding, patient_id)
        
        if best_match and min_distance < SIMILARITY_THRESHOLD:
            confidence = int(100 - (min_distance / SIMILARITY_THRESHOLD) * 40)
            
            memories_response = supabase.table("voice_memories").select(
                "id, audio_path, description"
            ).eq("person_id", best_match["id"]).eq("is_primary", True).limit(1).execute()
            
            audio_url = None
            if memories_response.data:
                audio_path = memories_response.data[0].get("audio_path")
                if audio_path:
                    signed = supabase.storage.from_("voices").create_signed_url(
                        audio_path, 3600
                    )
                    audio_url = signed.get("signedURL") if signed else None
            
            return JSONResponse(content={
                "status": "success",
                "person_id": best_match["id"],
                "name": best_match["name"],
                "confidence": confidence,
                "audio_url": audio_url
            })
        else:
            return JSONResponse(content={
                "status": "fail",
                "message": "No match found"
            })
            
    except Exception as e:
        print(f"Recognition error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
    finally:
        if temp_path:
            cleanup_temp_file(temp_path)


@app.post("/upload-voice")
async def upload_voice(
    person_id: str = Form(...),
    description: str = Form(None),
    is_primary: bool = Form(False),
    file: UploadFile = File(...)
):
    try:
        person = supabase.table("people").select("patient_id").eq(
            "id", person_id
        ).single().execute()
        
        if not person.data:
            raise HTTPException(status_code=404, detail="Person not found")
        
        patient_id = person.data["patient_id"]
        storage_path = f"{patient_id}/{person_id}_{uuid.uuid4()}.webm"
        
        content = await file.read()
        supabase.storage.from_("voices").upload(
            storage_path,
            content,
            {"content-type": file.content_type or "audio/webm"}
        )
        
        if is_primary:
            supabase.table("voice_memories").update({
                "is_primary": False
            }).eq("person_id", person_id).execute()
        
        supabase.table("voice_memories").insert({
            "person_id": person_id,
            "audio_path": storage_path,
            "description": description,
            "is_primary": is_primary
        }).execute()
        
        return JSONResponse(content={
            "status": "success",
            "message": "Voice memory uploaded",
            "path": storage_path
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Voice upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Object/Landmark Detection - Common object labels
COMMON_OBJECTS = {
    "person": "A person is in the image",
    "cell phone": "This is a mobile phone",
    "remote": "This is a remote control",
    "book": "This is a book",
    "clock": "This is a clock showing the time",
    "vase": "This is a decorative vase",
    "scissors": "These are scissors - handle with care",
    "toothbrush": "This is a toothbrush for dental hygiene",
    "cup": "This is a cup or mug for drinking",
    "fork": "This is a fork for eating",
    "knife": "This is a knife - handle carefully",
    "spoon": "This is a spoon for eating",
    "bowl": "This is a bowl",
    "banana": "This is a banana fruit",
    "apple": "This is an apple fruit",
    "sandwich": "This is a sandwich",
    "orange": "This is an orange fruit",
    "broccoli": "This is broccoli, a healthy vegetable",
    "carrot": "This is a carrot",
    "hot dog": "This is a hot dog",
    "pizza": "This is pizza",
    "donut": "This is a donut",
    "cake": "This is a cake",
    "chair": "This is a chair for sitting",
    "couch": "This is a couch or sofa",
    "potted plant": "This is a potted plant",
    "bed": "This is a bed for sleeping",
    "dining table": "This is a dining table",
    "toilet": "This is a toilet",
    "tv": "This is a television",
    "laptop": "This is a laptop computer",
    "mouse": "This is a computer mouse",
    "keyboard": "This is a keyboard",
    "bottle": "This is a bottle",
    "wine glass": "This is a wine glass",
    "suitcase": "This is a suitcase for travel",
    "umbrella": "This is an umbrella",
    "handbag": "This is a handbag or purse",
    "tie": "This is a necktie",
    "backpack": "This is a backpack",
    "car": "This is a car",
    "bicycle": "This is a bicycle",
    "motorcycle": "This is a motorcycle",
    "bus": "This is a bus",
    "train": "This is a train",
    "truck": "This is a truck",
    "boat": "This is a boat",
    "airplane": "This is an airplane",
    "dog": "This is a dog",
    "cat": "This is a cat",
    "bird": "This is a bird",
    "glasses": "These are eyeglasses",
    "watch": "This is a wristwatch",
    "medicine bottle": "This could be medication - check with your caretaker",
    "pill": "This appears to be medication - consult your caretaker",
    "keys": "These are keys",
    "wallet": "This is a wallet"
}


def detect_objects_simple(img_path: str) -> list:
    """
    Object detection using YOLOv8.
    Returns list of detected object labels with confidence > 0.5.
    """
    detected_labels = []
    
    # Try YOLOv8 first (most accurate)
    if YOLO_AVAILABLE and YOLO_MODEL is not None:
        try:
            results = YOLO_MODEL(img_path, verbose=False)
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        confidence = float(box.conf[0])
                        if confidence > 0.5:
                            class_id = int(box.cls[0])
                            class_name = result.names[class_id]
                            if class_name not in detected_labels:
                                detected_labels.append(class_name)
            
            if detected_labels:
                print(f"YOLO detected: {detected_labels}")
                return detected_labels
                
        except Exception as e:
            print(f"YOLO detection error: {e}")
    
    # Fallback: return empty list
    return detected_labels


def get_object_description(label: str, patient_id: str) -> dict:
    """
    Get description for detected object.
    First checks DB for custom patient-specific description.
    Falls back to default description if not found.
    """
    # Check database for custom description
    try:
        response = supabase.table("object_descriptions").select(
            "custom_description, audio_path, importance_level"
        ).eq("patient_id", patient_id).eq("object_label", label.lower()).execute()
        
        if response.data and len(response.data) > 0:
            record = response.data[0]
            audio_url = None
            
            if record.get("audio_path"):
                signed = supabase.storage.from_("voices").create_signed_url(
                    record["audio_path"], 3600
                )
                audio_url = signed.get("signedURL") if signed else None
            
            return {
                "label": label,
                "description": record["custom_description"],
                "source": "custom",
                "importance": record.get("importance_level", 1),
                "audio_url": audio_url
            }
    except Exception as e:
        print(f"DB lookup error: {e}")
    
    # Fall back to default description
    default_desc = COMMON_OBJECTS.get(label.lower(), f"This is a {label}")
    
    return {
        "label": label,
        "description": default_desc,
        "source": "default",
        "importance": 1,
        "audio_url": None
    }


@app.post("/detect-objects")
async def detect_objects(
    patient_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Detect objects in image and return descriptions.
    Uses custom DB descriptions if available, otherwise default ML labels.
    """
    temp_path = None
    try:
        temp_path = await save_temp_file(file)
        
        # Detect objects in image
        detected_labels = detect_objects_simple(temp_path)
        
        # If no objects detected, return helpful message
        if not detected_labels:
            return JSONResponse(content={
                "status": "success",
                "objects": [],
                "message": "Point your camera at an object to identify it. Try holding the camera steady."
            })
        
        # Get descriptions for each detected object
        objects = []
        for label in detected_labels[:5]:  # Limit to top 5 objects
            obj_info = get_object_description(label, patient_id)
            objects.append(obj_info)
        
        # Sort by importance
        objects.sort(key=lambda x: x.get("importance", 1), reverse=True)
        
        return JSONResponse(content={
            "status": "success",
            "objects": objects,
            "count": len(objects)
        })
        
    except Exception as e:
        print(f"Object detection error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
    finally:
        if temp_path:
            cleanup_temp_file(temp_path)


@app.post("/add-object-description")
async def add_object_description(
    patient_id: str = Form(...),
    object_label: str = Form(...),
    custom_description: str = Form(...),
    importance_level: int = Form(1),
    file: UploadFile = File(None)
):
    """
    Add custom description for an object.
    Caretakers use this to personalize object descriptions for their patient.
    """
    try:
        audio_path = None
        
        # Upload audio if provided
        if file:
            storage_path = f"{patient_id}/objects/{object_label.lower().replace(' ', '_')}_{uuid.uuid4()}.webm"
            content = await file.read()
            supabase.storage.from_("voices").upload(
                storage_path,
                content,
                {"content-type": file.content_type or "audio/webm"}
            )
            audio_path = storage_path
        
        # Upsert the object description
        supabase.table("object_descriptions").upsert({
            "patient_id": patient_id,
            "object_label": object_label.lower(),
            "custom_description": custom_description,
            "audio_path": audio_path,
            "importance_level": min(max(importance_level, 1), 5)
        }, on_conflict="patient_id,object_label").execute()
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Description saved for '{object_label}'",
            "object_label": object_label.lower()
        })
        
    except Exception as e:
        print(f"Add object description error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/object-descriptions/{patient_id}")
async def list_object_descriptions(patient_id: str):
    """
    List all custom object descriptions for a patient.
    """
    try:
        response = supabase.table("object_descriptions").select("*").eq(
            "patient_id", patient_id
        ).order("importance_level", desc=True).execute()
        
        return JSONResponse(content={
            "status": "success",
            "descriptions": response.data or [],
            "count": len(response.data) if response.data else 0
        })
        
    except Exception as e:
        print(f"List descriptions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
