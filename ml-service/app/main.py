import os
import uuid
import io
from contextlib import asynccontextmanager

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_USE_LEGACY_KERAS"] = "1"  # Use legacy Keras for DeepFace compatibility

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

# DeepFace for face recognition - handle Keras 3 compatibility
DeepFace = None
try:
    from deepface import DeepFace
    print("DeepFace loaded successfully")
except ValueError as e:
    if "keras 3" in str(e).lower() or "tf-keras" in str(e).lower():
        print("WARNING: DeepFace requires legacy Keras. Trying workaround...")
        try:
            import tensorflow as tf
            # Force TF to use legacy keras behavior
            from deepface import DeepFace
            print("DeepFace loaded with workaround")
        except Exception as e2:
            print(f"WARNING: DeepFace not available due to Keras 3 incompatibility: {e2}")
            DeepFace = None
    else:
        print(f"WARNING: DeepFace import error: {e}")
        DeepFace = None
except ImportError as e:
    print(f"WARNING: DeepFace not found. Install with: pip install deepface: {e}")
    DeepFace = None
except Exception as e:
    print(f"WARNING: DeepFace could not be loaded: {e}")
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


# ============================================
# ADVANCED AI FEATURES
# ============================================

# Import advanced modules
try:
    from app.gemini_service import (
        generate_memory_context,
        generate_object_context,
        generate_soothing_message,
        GEMINI_AVAILABLE
    )
except ImportError:
    GEMINI_AVAILABLE = False
    print("WARNING: Gemini service not available")

try:
    from app.voice_cloning import (
        clone_voice_speak,
        save_voice_sample,
        get_voice_sample_path,
        validate_voice_sample,
        is_available as voice_available
    )
    VOICE_CLONING_AVAILABLE = voice_available()
except ImportError:
    VOICE_CLONING_AVAILABLE = False
    print("WARNING: Voice cloning not available")

try:
    from app.anomaly_detector import (
        check_anomaly,
        train_detector,
        is_available as anomaly_available
    )
    ANOMALY_DETECTION_AVAILABLE = anomaly_available()
except ImportError:
    ANOMALY_DETECTION_AVAILABLE = False
    print("WARNING: Anomaly detection not available")


@app.get("/features")
async def get_features():
    """Return available advanced features"""
    return {
        "gemini_context": GEMINI_AVAILABLE,
        "voice_cloning": VOICE_CLONING_AVAILABLE,
        "anomaly_detection": ANOMALY_DETECTION_AVAILABLE,
        "face_recognition": DeepFace is not None,
        "object_detection": YOLO_AVAILABLE
    }


# ============================================
# LIVING MEMORY GRAPH (Gemini)
# ============================================

@app.post("/generate-context")
async def generate_context(
    patient_id: str = Form(...),
    person_id: str = Form(...),
    person_name: str = Form(...),
    relationship: str = Form(...)
):
    """
    Generate context-aware greeting using Gemini and recent memories.
    """
    try:
        # Fetch recent memory events from database
        response = supabase.rpc(
            "get_recent_memories",
            {"p_patient_id": patient_id, "p_person_id": person_id, "p_limit": 5}
        ).execute()
        
        recent_events = response.data if response.data else []
        
        # Generate context with Gemini
        if GEMINI_AVAILABLE:
            context = generate_memory_context(
                person_name=person_name,
                relationship=relationship,
                recent_events=recent_events
            )
        else:
            # Fallback
            if recent_events:
                event = recent_events[0]
                context = f"This is {person_name}, your {relationship}. You recently {event.get('title', 'spent time together').lower()}."
            else:
                context = f"This is {person_name}, your {relationship}. They love you very much."
        
        return JSONResponse(content={
            "success": True,
            "context": context,
            "events_used": len(recent_events),
            "gemini_used": GEMINI_AVAILABLE
        })
        
    except Exception as e:
        print(f"Context generation error: {e}")
        return JSONResponse(content={
            "success": True,
            "context": f"This is {person_name}, your {relationship}.",
            "error": str(e)
        })


@app.post("/add-memory-event")
async def add_memory_event(
    patient_id: str = Form(...),
    person_id: str = Form(None),
    event_type: str = Form(...),
    event_date: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    emotional_tone: str = Form("happy"),
    created_by: str = Form(None)
):
    """
    Add a memory event for the Living Memory Graph.
    """
    try:
        data = {
            "patient_id": patient_id,
            "event_type": event_type,
            "event_date": event_date,
            "title": title,
            "description": description,
            "emotional_tone": emotional_tone
        }
        if person_id:
            data["person_id"] = person_id
        if created_by:
            data["created_by"] = created_by
        
        response = supabase.table("memory_events").insert(data).execute()
        
        return JSONResponse(content={
            "success": True,
            "message": "Memory event added",
            "event_id": response.data[0]["id"] if response.data else None
        })
        
    except Exception as e:
        print(f"Add memory event error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory-events/{patient_id}")
async def list_memory_events(patient_id: str, person_id: str = None, limit: int = 20):
    """List memory events for a patient"""
    try:
        query = supabase.table("memory_events").select("*").eq(
            "patient_id", patient_id
        ).order("event_date", desc=True).limit(limit)
        
        if person_id:
            query = query.eq("person_id", person_id)
        
        response = query.execute()
        
        return JSONResponse(content={
            "success": True,
            "events": response.data or [],
            "count": len(response.data) if response.data else 0
        })
        
    except Exception as e:
        print(f"List memory events error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# FAMILY VOICE CLONING (Coqui XTTS)
# ============================================

@app.post("/upload-voice-sample")
async def upload_voice_sample(
    person_id: str = Form(...),
    patient_id: str = Form(...),
    created_by: str = Form(None),
    file: UploadFile = File(...)
):
    """
    Upload a voice sample for cloning.
    Requires 6-60 seconds of clear speech.
    """
    temp_path = None
    try:
        # Save temp file
        temp_path = await save_temp_file(file)
        
        # Validate the sample
        if VOICE_CLONING_AVAILABLE:
            validation = validate_voice_sample(temp_path)
            if not validation["valid"]:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": validation["message"]}
                )
            quality_score = validation["quality_score"]
            duration = validation["duration_seconds"]
        else:
            quality_score = 0.5
            duration = 10
        
        # Upload to Supabase storage
        storage_path = f"{patient_id}/voices/{person_id}_{uuid.uuid4()}.wav"
        
        with open(temp_path, "rb") as f:
            content = f.read()
        
        supabase.storage.from_("voices").upload(
            storage_path, content, {"content-type": "audio/wav"}
        )
        
        # Save to database
        supabase.table("voice_samples").insert({
            "person_id": person_id,
            "patient_id": patient_id,
            "audio_path": storage_path,
            "duration_seconds": duration,
            "quality_score": quality_score,
            "is_active": True,
            "created_by": created_by
        }).execute()
        
        # Also save locally for TTS model
        if VOICE_CLONING_AVAILABLE:
            save_voice_sample(content, person_id)
        
        return JSONResponse(content={
            "success": True,
            "message": "Voice sample uploaded successfully",
            "duration": duration,
            "quality_score": quality_score
        })
        
    except Exception as e:
        print(f"Voice sample upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path:
            cleanup_temp_file(temp_path)


@app.post("/speak")
async def speak_text(
    text: str = Form(...),
    person_id: str = Form(None),
    use_cloned_voice: bool = Form(True)
):
    """
    Generate speech, optionally using a cloned voice.
    Returns WAV audio bytes.
    """
    try:
        audio_bytes = None
        voice_used = "default"
        
        if use_cloned_voice and person_id and VOICE_CLONING_AVAILABLE:
            voice_path = get_voice_sample_path(person_id)
            if voice_path:
                try:
                    audio_bytes = clone_voice_speak(text, voice_path)
                    voice_used = "cloned"
                except Exception as e:
                    print(f"Voice cloning error: {e}")
        
        if audio_bytes is None and VOICE_CLONING_AVAILABLE:
            from app.voice_cloning import speak_with_default_voice
            audio_bytes = speak_with_default_voice(text)
            voice_used = "default"
        
        if audio_bytes:
            # Return as base64 for easy frontend handling
            import base64
            audio_b64 = base64.b64encode(audio_bytes).decode()
            
            return JSONResponse(content={
                "success": True,
                "audio_base64": audio_b64,
                "voice_used": voice_used,
                "format": "wav"
            })
        else:
            # Return text for browser TTS fallback
            return JSONResponse(content={
                "success": True,
                "text": text,
                "voice_used": "browser_tts",
                "format": "text"
            })
        
    except Exception as e:
        print(f"Speak error: {e}")
        return JSONResponse(content={
            "success": True,
            "text": text,
            "voice_used": "browser_tts",
            "error": str(e)
        })


# ============================================
# PREDICTIVE SENTINEL (Anomaly Detection)
# ============================================

@app.post("/ingest-telemetry")
async def ingest_telemetry(
    patient_id: str = Form(...),
    heart_rate: int = Form(None),
    walking_speed: float = Form(None),
    location_lat: float = Form(None),
    location_lng: float = Form(None),
    location_diff: float = Form(None),
    is_inside_safe_zone: bool = Form(True),
    device_id: str = Form(None)
):
    """
    Ingest real-time health telemetry and check for anomalies.
    """
    try:
        from datetime import datetime
        
        now = datetime.now()
        hour = now.hour
        
        # Determine time of day
        if 5 <= hour < 12:
            time_of_day = "morning"
        elif 12 <= hour < 17:
            time_of_day = "afternoon"
        elif 17 <= hour < 21:
            time_of_day = "evening"
        else:
            time_of_day = "night"
        
        # Build location JSON
        location = None
        if location_lat and location_lng:
            location = {"lat": location_lat, "lng": location_lng}
        
        # Insert telemetry
        telemetry_data = {
            "patient_id": patient_id,
            "heart_rate": heart_rate,
            "walking_speed": walking_speed,
            "location": location,
            "location_diff": location_diff,
            "is_inside_safe_zone": is_inside_safe_zone,
            "time_of_day": time_of_day,
            "device_id": device_id
        }
        
        supabase.table("health_telemetry").insert(telemetry_data).execute()
        
        # Check for anomalies
        anomaly_result = None
        if ANOMALY_DETECTION_AVAILABLE:
            anomaly_result = check_anomaly(patient_id, telemetry_data)
            
            # If anomaly detected, create alert
            if anomaly_result["is_anomaly"]:
                alert_data = {
                    "patient_id": patient_id,
                    "alert_type": anomaly_result["alert_type"],
                    "severity": anomaly_result["severity"],
                    "confidence": anomaly_result["confidence"],
                    "prediction_reason": anomaly_result["reason"],
                    "telemetry_snapshot": telemetry_data
                }
                supabase.table("anomaly_alerts").insert(alert_data).execute()
        
        return JSONResponse(content={
            "success": True,
            "anomaly": anomaly_result,
            "message": "Telemetry recorded"
        })
        
    except Exception as e:
        print(f"Telemetry ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/check-anomaly")
async def check_anomaly_endpoint(
    patient_id: str = Form(...),
    heart_rate: int = Form(70),
    walking_speed: float = Form(0),
    location_diff: float = Form(0),
    is_inside_safe_zone: bool = Form(True)
):
    """
    Manually check if given telemetry is anomalous.
    """
    try:
        from datetime import datetime
        
        telemetry = {
            "heart_rate": heart_rate,
            "walking_speed": walking_speed,
            "location_diff": location_diff,
            "is_inside_safe_zone": is_inside_safe_zone,
            "timestamp": datetime.now()
        }
        
        if ANOMALY_DETECTION_AVAILABLE:
            result = check_anomaly(patient_id, telemetry)
        else:
            result = {
                "is_anomaly": False,
                "confidence": 0,
                "message": "Anomaly detection not available"
            }
        
        return JSONResponse(content={
            "success": True,
            **result
        })
        
    except Exception as e:
        print(f"Anomaly check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train-anomaly-model")
async def train_anomaly_model_endpoint(patient_id: str = Form(...)):
    """
    Train/retrain the anomaly detection model for a patient.
    Uses synthetic data for initial training.
    """
    try:
        if not ANOMALY_DETECTION_AVAILABLE:
            return JSONResponse(content={
                "success": False,
                "error": "Anomaly detection not available"
            })
        
        train_detector(patient_id)
        
        return JSONResponse(content={
            "success": True,
            "message": f"Anomaly model trained for patient {patient_id}"
        })
        
    except Exception as e:
        print(f"Model training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/anomaly-alerts/{patient_id}")
async def list_anomaly_alerts(
    patient_id: str,
    unacknowledged_only: bool = False,
    limit: int = 50
):
    """List anomaly alerts for a patient"""
    try:
        query = supabase.table("anomaly_alerts").select("*").eq(
            "patient_id", patient_id
        ).order("triggered_at", desc=True).limit(limit)
        
        if unacknowledged_only:
            query = query.eq("acknowledged", False)
        
        response = query.execute()
        
        return JSONResponse(content={
            "success": True,
            "alerts": response.data or [],
            "count": len(response.data) if response.data else 0
        })
        
    except Exception as e:
        print(f"List alerts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/acknowledge-alert")
async def acknowledge_alert(
    alert_id: str = Form(...),
    acknowledged_by: str = Form(None),
    action_taken: str = Form(None),
    false_positive: bool = Form(False)
):
    """Acknowledge an anomaly alert"""
    try:
        from datetime import datetime
        
        supabase.table("anomaly_alerts").update({
            "acknowledged": True,
            "acknowledged_by": acknowledged_by,
            "acknowledged_at": datetime.now().isoformat(),
            "action_taken": action_taken,
            "false_positive": false_positive
        }).eq("id", alert_id).execute()
        
        return JSONResponse(content={
            "success": True,
            "message": "Alert acknowledged"
        })
        
    except Exception as e:
        print(f"Acknowledge alert error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-soothing-message")
async def generate_soothing(
    patient_id: str = Form(None),
    alert_type: str = Form("general"),
    patient_name: str = Form(None),
    caretaker_name: str = Form(None)
):
    """
    Generate a calming message for the patient during an anomaly event.
    """
    try:
        if GEMINI_AVAILABLE:
            message = generate_soothing_message(
                patient_name=patient_name,
                alert_type=alert_type,
                caretaker_name=caretaker_name
            )
        else:
            message = "Everything is okay. You are safe. Someone who loves you is coming to help."
        
        return JSONResponse(content={
            "success": True,
            "message": message
        })
        
    except Exception as e:
        print(f"Soothing message error: {e}")
        return JSONResponse(content={
            "success": True,
            "message": "Everything is okay. You are safe. Help is on the way."
        })


# ============================================
# VOICE CLONING (Bark TTS)
# ============================================

@app.post("/speak")
async def speak_text(
    text: str = Form(...),
    person_id: str = Form(None),
    patient_id: str = Form(None),
    voice_preset: str = Form("warm_female")
):
    """
    Generate speech from text using Bark TTS.
    Returns base64-encoded WAV audio.
    """
    try:
        if not VOICE_CLONING_AVAILABLE:
            return JSONResponse(content={
                "success": False,
                "error": "Voice synthesis not available",
                "fallback": True
            })
        
        from app.voice_cloning import generate_speech, audio_to_base64
        
        # Generate speech
        audio_bytes = generate_speech(
            text=text,
            voice_preset=voice_preset,
            person_id=person_id
        )
        
        # Convert to base64 for API response
        audio_base64 = audio_to_base64(audio_bytes)
        
        return JSONResponse(content={
            "success": True,
            "audio_base64": audio_base64,
            "format": "wav"
        })
        
    except Exception as e:
        print(f"Speak error: {e}")
        return JSONResponse(content={
            "success": False,
            "error": str(e),
            "fallback": True
        })


@app.post("/upload-voice-sample")
async def upload_voice_sample(
    file: UploadFile = File(...),
    person_id: str = Form(...),
    patient_id: str = Form(...),
    created_by: str = Form(None)
):
    """
    Upload a voice sample for a person for future voice cloning.
    """
    try:
        if not VOICE_CLONING_AVAILABLE:
            return JSONResponse(content={
                "success": False,
                "error": "Voice synthesis not available"
            })
        
        from app.voice_cloning import save_voice_sample, validate_voice_sample
        
        # Read the uploaded file
        audio_bytes = await file.read()
        
        # Save the voice sample
        sample_path = save_voice_sample(audio_bytes, person_id)
        
        # Validate the sample
        validation = validate_voice_sample(sample_path)
        
        # Save reference to database
        try:
            supabase.table("voice_samples").insert({
                "person_id": person_id,
                "patient_id": patient_id,
                "sample_path": sample_path,
                "duration_seconds": validation.get("duration_seconds", 0),
                "quality_score": validation.get("quality_score", 0),
                "created_by": created_by or patient_id
            }).execute()
        except Exception as db_err:
            print(f"DB save warning: {db_err}")
        
        return JSONResponse(content={
            "success": True,
            "sample_path": sample_path,
            "validation": validation
        })
        
    except Exception as e:
        print(f"Upload voice sample error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/voice-samples/{person_id}")
async def get_voice_samples(person_id: str):
    """
    Get available voice samples for a person.
    """
    try:
        from app.voice_cloning import get_voice_sample_path
        
        sample_path = get_voice_sample_path(person_id)
        
        return JSONResponse(content={
            "success": True,
            "has_sample": sample_path is not None,
            "sample_path": sample_path
        })
        
    except Exception as e:
        print(f"Get voice samples error: {e}")
        return JSONResponse(content={
            "success": False,
            "has_sample": False,
            "error": str(e)
        })


@app.get("/available-voices")
async def get_available_voices():
    """
    Get list of available voice presets.
    """
    try:
        if VOICE_CLONING_AVAILABLE:
            from app.voice_cloning import get_available_voices
            voices = get_available_voices()
        else:
            voices = []
        
        return JSONResponse(content={
            "success": True,
            "available": VOICE_CLONING_AVAILABLE,
            "voices": voices
        })
        
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "voices": []
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )

