from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import base64
import numpy as np
import cv2
from io import BytesIO
from PIL import Image

router = APIRouter()

class FrameChangeRequest(BaseModel):
    current_frame: str  # base64
    previous_frame: Optional[str] = None  # base64

class FrameChangeResponse(BaseModel):
    changeDetected: bool
    confidence: float
    message: str
    changePercentage: Optional[float] = None

def decode_base64_image(base64_str: str) -> np.ndarray:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_data))
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

def calculate_frame_difference(frame1: np.ndarray, frame2: np.ndarray, threshold: float = 30.0) -> tuple:
    if frame1.shape != frame2.shape:
        frame2 = cv2.resize(frame2, (frame1.shape[1], frame1.shape[0]))
    
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    gray1 = cv2.GaussianBlur(gray1, (21, 21), 0)
    gray2 = cv2.GaussianBlur(gray2, (21, 21), 0)
    
    diff = cv2.absdiff(gray1, gray2)
    _, thresh = cv2.threshold(diff, int(threshold), 255, cv2.THRESH_BINARY)
    
    change_percentage = (np.count_nonzero(thresh) / thresh.size) * 100
    return change_percentage, change_percentage > 5.0

@router.post("/detect-change", response_model=FrameChangeResponse)
async def detect_frame_change(request: FrameChangeRequest):
    try:
        current_frame = decode_base64_image(request.current_frame)
        
        if not request.previous_frame:
            return FrameChangeResponse(
                changeDetected=True,
                confidence=1.0,
                message="First frame, assuming change",
                changePercentage=100.0
            )
        
        previous_frame = decode_base64_image(request.previous_frame)
        change_percentage, change_detected = calculate_frame_difference(current_frame, previous_frame)
        
        confidence = min(change_percentage / 20.0, 1.0) if change_detected else max(0.0, 1.0 - change_percentage / 5.0)
        
        return FrameChangeResponse(
            changeDetected=change_detected,
            confidence=confidence,
            message=f"Frame change {'detected' if change_detected else 'not detected'}",
            changePercentage=round(change_percentage, 2)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MotionDetectionRequest(BaseModel):
    frames: list[str]  # List of base64 frames
    sensitivity: Optional[float] = 0.05

@router.post("/detect-motion")
async def detect_motion(request: MotionDetectionRequest):
    try:
        if len(request.frames) < 2:
            raise HTTPException(status_code=400, detail="At least 2 frames required")
        
        frames = [decode_base64_image(f) for f in request.frames[:5]]
        motion_scores = []
        
        for i in range(1, len(frames)):
            change_pct, _ = calculate_frame_difference(frames[i-1], frames[i])
            motion_scores.append(change_pct)
        
        avg_motion = sum(motion_scores) / len(motion_scores)
        motion_detected = avg_motion > (request.sensitivity * 100)
        
        return {
            "motionDetected": motion_detected,
            "averageChange": round(avg_motion, 2),
            "frameScores": [round(s, 2) for s in motion_scores]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PersonDetectionRequest(BaseModel):
    frame: str  # base64
    
@router.post("/detect-person")
async def detect_person_in_frame(request: PersonDetectionRequest):
    try:
        frame = decode_base64_image(request.frame)
        
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        upper_body_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_upperbody.xml')
        bodies = upper_body_cascade.detectMultiScale(gray, 1.1, 4)
        
        return {
            "personDetected": len(faces) > 0 or len(bodies) > 0,
            "faceCount": len(faces),
            "bodyCount": len(bodies),
            "faces": [{"x": int(x), "y": int(y), "w": int(w), "h": int(h)} for (x, y, w, h) in faces],
            "confidence": min(1.0, (len(faces) + len(bodies)) * 0.3)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
