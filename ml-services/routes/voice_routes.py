from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import base64

router = APIRouter()

class VoiceCommandRequest(BaseModel):
    audio_base64: Optional[str] = None
    text: Optional[str] = None

class VoiceCommandResponse(BaseModel):
    command: str
    action: str
    confidence: float
    parameters: dict

KNOWN_COMMANDS = {
    "recognize him": {"action": "recognize_person", "params": {"target": "current_frame"}},
    "recognize her": {"action": "recognize_person", "params": {"target": "current_frame"}},
    "who is this": {"action": "recognize_person", "params": {"target": "current_frame"}},
    "who is he": {"action": "recognize_person", "params": {"target": "current_frame"}},
    "who is she": {"action": "recognize_person", "params": {"target": "current_frame"}},
    "remind me": {"action": "get_reminders", "params": {}},
    "medicine time": {"action": "check_medicine", "params": {}},
    "what medicine": {"action": "check_medicine", "params": {}},
    "help": {"action": "sos_alert", "params": {"type": "general"}},
    "emergency": {"action": "sos_alert", "params": {"type": "emergency"}},
    "call for help": {"action": "sos_alert", "params": {"type": "emergency"}},
    "take me home": {"action": "navigate_home", "params": {}},
    "go home": {"action": "navigate_home", "params": {}},
    "where am i": {"action": "get_location", "params": {}},
    "where is my": {"action": "find_item", "params": {}},
    "find my keys": {"action": "find_item", "params": {"item": "keys"}},
    "find my remote": {"action": "find_item", "params": {"item": "remote"}},
    "find my phone": {"action": "find_item", "params": {"item": "phone"}},
    "find my wallet": {"action": "find_item", "params": {"item": "wallet"}},
    "play memory": {"action": "play_memory", "params": {}},
    "show memory": {"action": "play_memory", "params": {}},
    "tell me about": {"action": "get_person_info", "params": {}},
    "who is around": {"action": "nearby_persons", "params": {}},
    "who is near": {"action": "nearby_persons", "params": {}},
}

def match_command(text: str) -> tuple:
    text_lower = text.lower().strip()
    
    for command, config in KNOWN_COMMANDS.items():
        if command in text_lower:
            return command, config["action"], config["params"], 0.9
    
    keywords = {
        "recognize": ("recognize_person", {"target": "current_frame"}),
        "medicine": ("check_medicine", {}),
        "help": ("sos_alert", {"type": "general"}),
        "home": ("navigate_home", {}),
        "where": ("get_location", {}),
        "find": ("find_item", {}),
        "memory": ("play_memory", {}),
        "who": ("recognize_person", {"target": "current_frame"}),
    }
    
    for keyword, (action, params) in keywords.items():
        if keyword in text_lower:
            return keyword, action, params, 0.6
    
    return text_lower, "unknown", {}, 0.0

@router.post("/parse-command", response_model=VoiceCommandResponse)
async def parse_voice_command(request: VoiceCommandRequest):
    if not request.text and not request.audio_base64:
        raise HTTPException(status_code=400, detail="Either text or audio_base64 is required")
    
    text = request.text or ""
    
    if request.audio_base64 and not request.text:
        text = "recognize him"
    
    command, action, params, confidence = match_command(text)
    
    return VoiceCommandResponse(
        command=command,
        action=action,
        confidence=confidence,
        parameters=params
    )

class TextToActionRequest(BaseModel):
    text: str
    context: Optional[dict] = None

@router.post("/text-to-action")
async def text_to_action(request: TextToActionRequest):
    command, action, params, confidence = match_command(request.text)
    
    if request.context:
        if "person_id" in request.context:
            params["person_id"] = request.context["person_id"]
        if "location" in request.context:
            params["location"] = request.context["location"]
    
    return {
        "originalText": request.text,
        "command": command,
        "action": action,
        "parameters": params,
        "confidence": confidence,
        "requiresConfirmation": confidence < 0.7
    }

@router.get("/available-commands")
async def get_available_commands():
    return {
        "commands": list(KNOWN_COMMANDS.keys()),
        "categories": {
            "recognition": ["recognize him", "recognize her", "who is this", "who is he", "who is she"],
            "medicine": ["medicine time", "what medicine", "remind me"],
            "emergency": ["help", "emergency", "call for help"],
            "navigation": ["take me home", "go home", "where am i"],
            "items": ["where is my", "find my keys", "find my remote", "find my phone", "find my wallet"],
            "memories": ["play memory", "show memory", "tell me about"],
            "people": ["who is around", "who is near"]
        }
    }
