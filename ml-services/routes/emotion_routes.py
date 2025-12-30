"""
ARKA - Emotion Recognition ML Routes
Real-time facial emotion detection and adaptive response
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import base64
import numpy as np
from io import BytesIO
from PIL import Image
import cv2

router = APIRouter()

# Try to import DeepFace for emotion detection
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("DeepFace not available, using fallback emotion detection")

class FaceEmotionRequest(BaseModel):
    image_base64: str
    context: Optional[Dict] = {}

class CaregiverAnalysisRequest(BaseModel):
    image_base64: Optional[str] = None
    interaction_data: Dict = {}

class AdaptiveResponseRequest(BaseModel):
    user_id: Optional[str] = None
    current_emotion: str
    context: Dict = {}

# Emotion to UI adaptation mapping
EMOTION_UI_MAPPING = {
    "happy": {
        "ui_theme": "bright",
        "color_scheme": {"primary": "#4CAF50", "background": "#E8F5E9"},
        "font_size": "normal",
        "animation_speed": "normal",
        "voice_tone": "cheerful"
    },
    "sad": {
        "ui_theme": "warm",
        "color_scheme": {"primary": "#FF9800", "background": "#FFF3E0"},
        "font_size": "larger",
        "animation_speed": "slow",
        "voice_tone": "gentle"
    },
    "angry": {
        "ui_theme": "calm",
        "color_scheme": {"primary": "#2196F3", "background": "#E3F2FD"},
        "font_size": "larger",
        "animation_speed": "slow",
        "voice_tone": "soothing"
    },
    "fear": {
        "ui_theme": "reassuring",
        "color_scheme": {"primary": "#9C27B0", "background": "#F3E5F5"},
        "font_size": "larger",
        "animation_speed": "slow",
        "voice_tone": "calm_reassuring"
    },
    "surprise": {
        "ui_theme": "neutral",
        "color_scheme": {"primary": "#607D8B", "background": "#ECEFF1"},
        "font_size": "normal",
        "animation_speed": "normal",
        "voice_tone": "neutral"
    },
    "neutral": {
        "ui_theme": "default",
        "color_scheme": {"primary": "#3F51B5", "background": "#E8EAF6"},
        "font_size": "normal",
        "animation_speed": "normal",
        "voice_tone": "friendly"
    },
    "disgust": {
        "ui_theme": "calm",
        "color_scheme": {"primary": "#00BCD4", "background": "#E0F7FA"},
        "font_size": "normal",
        "animation_speed": "slow",
        "voice_tone": "understanding"
    }
}

def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decode base64 image to numpy array"""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_data))
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

def analyze_emotion_deepface(img_array: np.ndarray) -> Dict:
    """Analyze emotions using DeepFace"""
    try:
        result = DeepFace.analyze(
            img_array, 
            actions=['emotion'],
            enforce_detection=False,
            silent=True
        )
        
        if isinstance(result, list):
            result = result[0]
        
        emotions = result.get('emotion', {})
        dominant = result.get('dominant_emotion', 'neutral')
        
        return {
            "dominant_emotion": dominant,
            "confidence": emotions.get(dominant, 50) / 100,
            "all_emotions": {k: round(v / 100, 3) for k, v in emotions.items()}
        }
    except Exception as e:
        print(f"DeepFace analysis error: {e}")
        return {
            "dominant_emotion": "neutral",
            "confidence": 0.5,
            "all_emotions": {"neutral": 0.5}
        }

def analyze_emotion_fallback(img_array: np.ndarray) -> Dict:
    """Fallback emotion detection using basic image analysis"""
    # Simple brightness and color analysis as proxy
    gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray) / 255
    
    # Very basic heuristic
    if brightness > 0.6:
        dominant = "happy"
        confidence = 0.4
    elif brightness < 0.3:
        dominant = "sad"
        confidence = 0.4
    else:
        dominant = "neutral"
        confidence = 0.5
    
    return {
        "dominant_emotion": dominant,
        "confidence": confidence,
        "all_emotions": {dominant: confidence}
    }

def calculate_confusion_level(emotions: Dict, context: Dict = {}) -> float:
    """Calculate confusion level from emotions"""
    # Confusion indicators: fear, surprise, with low confidence
    fear = emotions.get("fear", 0)
    surprise = emotions.get("surprise", 0)
    angry = emotions.get("angry", 0)
    
    # Context can increase confusion detection
    rapid_context_switch = context.get("rapid_context_switch", False)
    asking_repeated_questions = context.get("repeated_questions", False)
    
    base_confusion = (fear * 0.4 + surprise * 0.3 + angry * 0.3)
    
    if rapid_context_switch:
        base_confusion += 0.2
    if asking_repeated_questions:
        base_confusion += 0.3
    
    return min(1.0, base_confusion)

def calculate_stress_level(emotions: Dict) -> float:
    """Calculate stress level from emotions"""
    angry = emotions.get("angry", 0)
    fear = emotions.get("fear", 0)
    sad = emotions.get("sad", 0)
    
    return min(1.0, angry * 0.4 + fear * 0.4 + sad * 0.2)

def get_suggested_response(emotion: str, confusion: float, stress: float) -> str:
    """Get suggested response based on emotional state"""
    if confusion > 0.7:
        return "I'm here to help. Let me show you something familiar."
    if stress > 0.8:
        return "Take a deep breath. Everything is okay. Would you like to see a happy memory?"
    if emotion == "sad":
        return "I'm here with you. Would you like to see photos of your family?"
    if emotion == "fear":
        return "You're safe. Your family loves you very much."
    if emotion == "angry":
        return "I understand. Let's take a moment. Is there something I can help with?"
    if emotion == "happy":
        return "It's wonderful to see you happy! Would you like to do an activity?"
    return "Hello! How can I help you today?"

@router.post("/analyze-face")
async def analyze_face_emotion(request: FaceEmotionRequest):
    """Analyze facial emotions in real-time"""
    try:
        img_array = decode_base64_image(request.image_base64)
        
        # Analyze emotions
        if DEEPFACE_AVAILABLE:
            emotion_result = analyze_emotion_deepface(img_array)
        else:
            emotion_result = analyze_emotion_fallback(img_array)
        
        all_emotions = emotion_result.get("all_emotions", {})
        dominant = emotion_result.get("dominant_emotion", "neutral")
        
        # Calculate derived metrics
        confusion_level = calculate_confusion_level(all_emotions, request.context)
        stress_level = calculate_stress_level(all_emotions)
        
        # Get suggested response and UI adaptation
        suggested_response = get_suggested_response(dominant, confusion_level, stress_level)
        ui_adaptation = EMOTION_UI_MAPPING.get(dominant, EMOTION_UI_MAPPING["neutral"])
        
        return {
            "dominant_emotion": dominant,
            "confidence": emotion_result.get("confidence", 0.5),
            "all_emotions": all_emotions,
            "confusion_level": round(confusion_level, 3),
            "stress_level": round(stress_level, 3),
            "suggested_response": suggested_response,
            "ui_adaptation": ui_adaptation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/caregiver-analysis")
async def analyze_caregiver_status(request: CaregiverAnalysisRequest):
    """Analyze caregiver wellbeing and detect burnout signs"""
    try:
        stress_level = 0.3  # Default low stress
        emotional_state = "stable"
        
        # Analyze image if provided
        if request.image_base64:
            img_array = decode_base64_image(request.image_base64)
            if DEEPFACE_AVAILABLE:
                emotion_result = analyze_emotion_deepface(img_array)
            else:
                emotion_result = analyze_emotion_fallback(img_array)
            
            all_emotions = emotion_result.get("all_emotions", {})
            stress_level = calculate_stress_level(all_emotions)
            emotional_state = emotion_result.get("dominant_emotion", "neutral")
        
        # Analyze interaction data for burnout indicators
        interaction_data = request.interaction_data
        hours_caring = interaction_data.get("hours_caring_today", 0)
        breaks_taken = interaction_data.get("breaks_taken", 0)
        incidents_today = interaction_data.get("incidents", 0)
        
        # Burnout risk calculation
        burnout_risk = 0.2  # Base risk
        
        if hours_caring > 8:
            burnout_risk += 0.2
        if hours_caring > 12:
            burnout_risk += 0.2
        if breaks_taken < 2:
            burnout_risk += 0.15
        if incidents_today > 3:
            burnout_risk += 0.15
        if stress_level > 0.6:
            burnout_risk += 0.2
        
        burnout_risk = min(1.0, burnout_risk)
        
        # Recommendations
        recommendations = []
        suggest_break = False
        
        if burnout_risk > 0.6:
            recommendations.append("Consider taking a longer break or asking for help")
            recommendations.append("Your wellbeing matters - a short rest helps everyone")
            suggest_break = True
        elif burnout_risk > 0.4:
            recommendations.append("Remember to take regular breaks")
            suggest_break = True
        else:
            recommendations.append("You're doing great! Keep taking care of yourself too")
        
        return {
            "stress_level": round(stress_level, 3),
            "burnout_risk": round(burnout_risk, 3),
            "emotional_state": emotional_state,
            "recommendations": recommendations,
            "suggest_break": suggest_break,
            "support_resources": [
                {"name": "Caregiver Support Hotline", "phone": "1-800-XXX-XXXX"},
                {"name": "Local respite care services", "url": "https://respitecare.org"}
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/adaptive-response")
async def get_adaptive_ui_response(request: AdaptiveResponseRequest):
    """Get adaptive UI and response based on emotional state"""
    try:
        emotion = request.current_emotion.lower()
        context = request.context
        
        # Get UI mapping
        ui_config = EMOTION_UI_MAPPING.get(emotion, EMOTION_UI_MAPPING["neutral"])
        
        # Calming content suggestions
        calming_content = []
        if emotion in ["fear", "angry", "sad"]:
            calming_content = [
                {"type": "music", "name": "Gentle Piano", "url": "/assets/calming_piano.mp3"},
                {"type": "image", "name": "Nature Scene", "url": "/assets/nature_calm.jpg"},
                {"type": "breathing", "name": "Breathing Exercise", "duration": 60}
            ]
        
        # Suggested actions based on emotion
        suggested_actions = []
        if emotion == "happy":
            suggested_actions = ["Record this moment", "Call a family member", "Do a fun activity"]
        elif emotion == "sad":
            suggested_actions = ["View happy memories", "Listen to favorite music", "Call someone"]
        elif emotion == "fear":
            suggested_actions = ["View familiar photos", "Hear a loved one's voice", "SOS if needed"]
        else:
            suggested_actions = ["Check reminders", "Start memory training", "View today's schedule"]
        
        return {
            "ui_theme": ui_config["ui_theme"],
            "color_scheme": ui_config["color_scheme"],
            "font_size": ui_config["font_size"],
            "animation_speed": ui_config["animation_speed"],
            "voice_tone": ui_config["voice_tone"],
            "suggested_actions": suggested_actions,
            "calming_content": calming_content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
