"""
ARKA - Life Recorder ML Routes
AI moment detection, narration generation, and memory curation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import base64
import numpy as np
from io import BytesIO
from PIL import Image
import cv2
from datetime import datetime
import random

router = APIRouter()

class MomentAnalysisRequest(BaseModel):
    image_base64: Optional[str] = None
    audio_base64: Optional[str] = None
    transcript: Optional[str] = None
    location: Optional[Dict] = None
    detected_people: Optional[List[str]] = None

class NarrationRequest(BaseModel):
    memories: List[Dict]
    style: str = "warm"
    user_preferences: Dict = {}

class VoiceTagRequest(BaseModel):
    audio_base64: str

class RememberWhenRequest(BaseModel):
    memories: List[Dict]
    theme: Optional[str] = None
    duration_minutes: int = 5

class LegacyBookRequest(BaseModel):
    memories: List[Dict]
    title: str
    date_range: Optional[Dict] = None
    categories: Optional[List[str]] = None

# Moment types
MOMENT_TYPES = [
    "family_gathering",
    "celebration",
    "daily_routine",
    "outdoor_activity",
    "conversation",
    "meal",
    "special_occasion",
    "casual_moment",
    "visit",
    "achievement"
]

# Narration styles
NARRATION_STYLES = {
    "warm": {
        "tone": "gentle and loving",
        "pace": "slow",
        "emotional_focus": "positive"
    },
    "cheerful": {
        "tone": "upbeat and happy",
        "pace": "moderate",
        "emotional_focus": "joyful"
    },
    "nostalgic": {
        "tone": "reflective and tender",
        "pace": "slow",
        "emotional_focus": "memories"
    },
    "simple": {
        "tone": "clear and straightforward",
        "pace": "moderate",
        "emotional_focus": "factual"
    }
}

def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decode base64 image to numpy array"""
    if not base64_str:
        return None
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_data))
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception:
        return None

def analyze_image_content(img_array: np.ndarray) -> Dict:
    """Analyze image for moment significance"""
    if img_array is None:
        return {"has_faces": False, "brightness": 0.5, "activity_level": 0.5}
    
    try:
        # Face detection
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Brightness analysis
        brightness = np.mean(gray) / 255
        
        # Edge/activity analysis
        edges = cv2.Canny(gray, 50, 150)
        activity_level = np.count_nonzero(edges) / edges.size
        
        # Color analysis
        hsv = cv2.cvtColor(img_array, cv2.COLOR_BGR2HSV)
        saturation = np.mean(hsv[:, :, 1]) / 255
        
        return {
            "has_faces": len(faces) > 0,
            "face_count": len(faces),
            "brightness": round(brightness, 2),
            "activity_level": round(activity_level, 3),
            "colorfulness": round(saturation, 2)
        }
    except Exception as e:
        return {"has_faces": False, "brightness": 0.5, "activity_level": 0.5}

def calculate_moment_significance(image_analysis: Dict, people: List, location: Dict, transcript: str) -> float:
    """Calculate how significant/important a moment is"""
    score = 0.3  # Base score
    
    # Faces present = more significant
    if image_analysis.get("has_faces"):
        score += 0.2
        score += min(0.2, image_analysis.get("face_count", 1) * 0.05)
    
    # Known people present
    if people and len(people) > 0:
        score += min(0.2, len(people) * 0.05)
    
    # Good lighting/quality
    brightness = image_analysis.get("brightness", 0.5)
    if 0.3 < brightness < 0.8:
        score += 0.1
    
    # Activity/interaction happening
    if image_analysis.get("activity_level", 0) > 0.1:
        score += 0.1
    
    # Special location
    if location and location.get("name"):
        score += 0.05
    
    # Emotional transcript
    if transcript:
        emotional_words = ["love", "happy", "birthday", "celebrate", "together", "family", "miss", "remember"]
        if any(word in transcript.lower() for word in emotional_words):
            score += 0.15
    
    return min(1.0, score)

def determine_moment_type(image_analysis: Dict, people: List, transcript: str) -> str:
    """Determine the type of moment"""
    if transcript:
        transcript_lower = transcript.lower()
        if "birthday" in transcript_lower or "celebrate" in transcript_lower:
            return "celebration"
        if "dinner" in transcript_lower or "lunch" in transcript_lower or "breakfast" in transcript_lower:
            return "meal"
        if "visit" in transcript_lower or "came to see" in transcript_lower:
            return "visit"
    
    face_count = image_analysis.get("face_count", 0)
    if face_count > 3:
        return "family_gathering"
    elif face_count > 1:
        return "conversation"
    elif face_count == 1:
        return "casual_moment"
    
    return "daily_routine"

def generate_auto_description(moment_type: str, people: List, location: Dict) -> str:
    """Generate automatic description for a moment"""
    people_str = ", ".join(people) if people else "someone special"
    location_str = location.get("name", "a nice place") if location else "home"
    
    descriptions = {
        "family_gathering": f"A lovely time with family at {location_str}",
        "celebration": f"Celebrating a special moment with {people_str}",
        "conversation": f"A nice conversation with {people_str}",
        "meal": f"Sharing a meal at {location_str}",
        "visit": f"A visit from {people_str}",
        "casual_moment": f"A sweet moment with {people_str}",
        "daily_routine": f"A peaceful moment at {location_str}"
    }
    
    return descriptions.get(moment_type, "A special moment to remember")

@router.post("/analyze-moment")
async def analyze_moment(request: MomentAnalysisRequest):
    """Analyze captured moment for significance and categorization"""
    try:
        # Analyze image if provided
        image_analysis = {}
        if request.image_base64:
            img_array = decode_base64_image(request.image_base64)
            image_analysis = analyze_image_content(img_array)
        
        # Calculate significance
        significance = calculate_moment_significance(
            image_analysis,
            request.detected_people or [],
            request.location or {},
            request.transcript or ""
        )
        
        # Determine moment type
        moment_type = determine_moment_type(
            image_analysis,
            request.detected_people or [],
            request.transcript or ""
        )
        
        # Generate description
        auto_description = generate_auto_description(
            moment_type,
            request.detected_people or [],
            request.location
        )
        
        # Detected emotions (simplified)
        detected_emotions = ["happy", "content"] if significance > 0.5 else ["neutral"]
        
        # Auto tags
        auto_tags = [moment_type]
        if request.detected_people:
            auto_tags.extend(request.detected_people[:3])
        if request.location and request.location.get("name"):
            auto_tags.append(request.location["name"])
        
        # Capture suggestion
        if significance > 0.6:
            suggestion = "This looks like a special moment! I've saved it for you."
        elif significance > 0.4:
            suggestion = "Nice moment captured!"
        else:
            suggestion = "Moment analyzed but may not be significant enough to save."
        
        return {
            "significance_score": round(significance, 3),
            "moment_type": moment_type,
            "auto_description": auto_description,
            "detected_emotions": detected_emotions,
            "auto_tags": auto_tags,
            "capture_suggestion": suggestion,
            "image_analysis": image_analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-narration")
async def generate_narration(request: NarrationRequest):
    """Generate AI narration for memory playback"""
    try:
        memories = request.memories
        style = NARRATION_STYLES.get(request.style, NARRATION_STYLES["warm"])
        
        if not memories:
            return {
                "narration_text": "Let's look at some special moments together.",
                "audio_url": None,
                "estimated_duration": 0,
                "slide_transitions": [],
                "emotional_tone": "neutral"
            }
        
        # Generate narration for each memory
        narration_parts = []
        slide_transitions = []
        
        intro = "Let me share these beautiful memories with you..."
        narration_parts.append(intro)
        
        for i, memory in enumerate(memories):
            description = memory.get("description", "A special moment")
            people = memory.get("people", [])
            timestamp = memory.get("timestamp", "")
            
            # Parse date if available
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                date_str = dt.strftime("%B %d")
            except:
                date_str = "this day"
            
            # Generate narration for this memory
            if people:
                people_str = " and ".join(people[:2])
                narration = f"Here's {description.lower()}. You were with {people_str}."
            else:
                narration = f"Here's {description.lower()}."
            
            narration_parts.append(narration)
            
            slide_transitions.append({
                "memory_index": i,
                "start_time": i * 5,  # 5 seconds per slide
                "duration": 5,
                "transition": "fade"
            })
        
        # Closing
        closing = "These are such wonderful memories. Each one shows how loved you are."
        narration_parts.append(closing)
        
        full_narration = " ".join(narration_parts)
        estimated_duration = len(memories) * 5 + 10  # 5 sec per memory + intro/outro
        
        return {
            "narration_text": full_narration,
            "audio_url": None,  # Would generate TTS audio
            "estimated_duration": estimated_duration,
            "slide_transitions": slide_transitions,
            "emotional_tone": style["emotional_focus"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe-voice-tag")
async def transcribe_voice_tag(request: VoiceTagRequest):
    """Transcribe voice tag for a memory"""
    try:
        # In production, would use Azure Speech-to-Text or similar
        # For now, return mock transcription
        
        # Simulate transcription
        sample_transcripts = [
            "This was at Sarah's birthday party. We had such a wonderful time.",
            "This is my daughter and her children. I remember how happy we were.",
            "Our family vacation last summer. The beach was beautiful.",
            "My grandson's graduation. I'm so proud of him."
        ]
        
        transcript = random.choice(sample_transcripts)
        
        # Extract keywords
        keywords = []
        important_words = ["birthday", "daughter", "son", "grandson", "vacation", 
                         "christmas", "wedding", "graduation", "family", "friend"]
        for word in important_words:
            if word in transcript.lower():
                keywords.append(word)
        
        # Sentiment analysis (simplified)
        positive_words = ["happy", "wonderful", "beautiful", "proud", "love", "joy"]
        sentiment = "positive" if any(w in transcript.lower() for w in positive_words) else "neutral"
        
        return {
            "transcript": transcript,
            "keywords": keywords,
            "sentiment": sentiment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/remember-when-session")
async def generate_remember_when_session(request: RememberWhenRequest):
    """Generate 'Remember When' session with curated memories"""
    try:
        memories = request.memories
        theme = request.theme
        duration = request.duration_minutes
        
        # Filter memories by theme if specified
        if theme:
            themed_memories = [m for m in memories if theme.lower() in str(m).lower()]
            if themed_memories:
                memories = themed_memories
        
        # Select memories for session (based on duration, ~3 per minute)
        num_memories = min(len(memories), duration * 3)
        
        # Sort by significance and select
        sorted_memories = sorted(memories, key=lambda x: x.get("significance", 0.5), reverse=True)
        selected_memories = sorted_memories[:num_memories]
        
        # Generate session title
        if theme:
            session_title = f"Remember When: {theme.title()}"
        else:
            session_title = "Remember When: Beautiful Moments"
        
        # Generate narration
        narration_request = NarrationRequest(memories=selected_memories, style="nostalgic")
        # In practice, would call generate_narration
        narration = f"Let's take a journey through these {len(selected_memories)} beautiful memories..."
        
        return {
            "session_title": session_title,
            "theme": theme or "mixed",
            "duration": duration,
            "selected_memories": selected_memories,
            "narration": narration,
            "background_music": "gentle_piano",
            "transition_style": "slow_fade"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-legacy-book")
async def generate_legacy_book(request: LegacyBookRequest):
    """Generate shareable memory book"""
    try:
        memories = request.memories
        title = request.title
        
        # Filter by categories if specified
        if request.categories:
            memories = [m for m in memories if m.get("type") in request.categories]
        
        # Filter by date range if specified
        if request.date_range:
            # Would filter by date
            pass
        
        # Sort chronologically
        sorted_memories = sorted(memories, key=lambda x: x.get("timestamp", ""))
        
        # Calculate page count (4 memories per page)
        page_count = max(1, len(sorted_memories) // 4)
        
        book_id = f"book_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            "book_id": book_id,
            "title": title,
            "page_count": page_count,
            "memory_count": len(sorted_memories),
            "preview_url": f"/preview/{book_id}",
            "download_url": f"/download/{book_id}.pdf",
            "shareable_link": f"https://arka.care/book/{book_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
