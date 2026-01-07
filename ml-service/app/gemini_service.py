"""
Gemini API Service for Living Memory Graph
Generates context-aware, emotional narratives for face recognition
"""
import os
import google.generativeai as genai
from datetime import datetime

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def configure_gemini():
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        return True
    return False

# Initialize on import
GEMINI_AVAILABLE = configure_gemini()

def generate_memory_context(
    person_name: str,
    relationship: str,
    recent_events: list,
    patient_name: str = None
) -> str:
    """
    Generate an emotional, context-aware greeting using Gemini.
    
    Args:
        person_name: Name of the recognized person
        relationship: Their relationship to the patient (e.g., "son", "daughter")
        recent_events: List of recent memory events from database
        patient_name: Optional name of the patient
    
    Returns:
        A warm, contextual greeting string
    """
    if not GEMINI_AVAILABLE:
        # Fallback to simple greeting
        return f"This is {person_name}, your {relationship}."
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Build context from events
        events_context = ""
        if recent_events:
            for event in recent_events[:3]:  # Use top 3 recent events
                days_ago = event.get('days_ago', 0)
                if days_ago == 0:
                    time_str = "today"
                elif days_ago == 1:
                    time_str = "yesterday"
                elif days_ago < 7:
                    time_str = f"{days_ago} days ago"
                elif days_ago < 14:
                    time_str = "last week"
                elif days_ago < 30:
                    time_str = f"{days_ago // 7} weeks ago"
                else:
                    time_str = f"on {event.get('event_date', 'recently')}"
                
                events_context += f"- {event.get('title', '')} ({time_str}): {event.get('description', '')}\n"
        
        prompt = f"""You are a compassionate assistant helping an Alzheimer's patient recognize their loved one.

The patient is looking at: {person_name}, their {relationship}.

Recent shared memories:
{events_context if events_context else "No recent events recorded."}

Generate a SHORT, WARM greeting (2-3 sentences max) that:
1. Identifies who this person is
2. References a recent memory if available (makes it personal)
3. Ends with something emotionally reassuring
4. Uses simple, clear language

IMPORTANT: Keep it brief and natural, like how a caring person would speak.
Do NOT use any formatting, asterisks, or special characters.
Respond with ONLY the greeting text, nothing else."""

        response = model.generate_content(prompt)
        
        if response and response.text:
            # Clean up response
            text = response.text.strip()
            # Remove any markdown formatting
            text = text.replace('*', '').replace('_', '').replace('#', '')
            return text
        
        # Fallback
        return f"This is {person_name}, your {relationship}. They love you very much."
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Graceful fallback
        if recent_events and len(recent_events) > 0:
            event = recent_events[0]
            return f"This is {person_name}, your {relationship}. You recently {event.get('title', 'spent time together').lower()}."
        return f"This is {person_name}, your {relationship}."


def generate_object_context(
    object_label: str,
    custom_description: str = None,
    patient_context: dict = None
) -> str:
    """
    Generate helpful context for recognized objects.
    
    Args:
        object_label: The detected object (e.g., "medicine bottle")
        custom_description: Custom description if set by caretaker
        patient_context: Optional patient-specific context
    
    Returns:
        A helpful description string
    """
    if custom_description:
        return custom_description
    
    if not GEMINI_AVAILABLE:
        return f"This is a {object_label}."
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""You are helping an Alzheimer's patient identify objects.

Object detected: {object_label}

Generate a VERY SHORT (1 sentence) helpful description that:
1. Clearly identifies what the object is
2. Gives a brief hint about its use if relevant
3. Uses simple, reassuring language

Respond with ONLY the description, no formatting."""

        response = model.generate_content(prompt)
        
        if response and response.text:
            return response.text.strip().replace('*', '').replace('_', '')
        
        return f"This is a {object_label}."
        
    except Exception as e:
        print(f"Gemini API error for object: {e}")
        return f"This is a {object_label}."


def generate_soothing_message(
    patient_name: str = None,
    alert_type: str = "general",
    caretaker_name: str = None
) -> str:
    """
    Generate a calming message for when anomaly is detected.
    Used for the Predictive Sentinel feature.
    """
    if not GEMINI_AVAILABLE:
        return "Everything is okay. You are safe. Help is on the way."
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        context = {
            "wandering": "The patient may be disoriented or wandering.",
            "panic": "The patient may be experiencing anxiety or panic.",
            "fall": "A possible fall was detected.",
            "general": "The patient may need reassurance."
        }
        
        prompt = f"""You are a soothing voice assistant for an Alzheimer's patient.

Situation: {context.get(alert_type, context['general'])}
{f"Patient's name: {patient_name}" if patient_name else ""}
{f"Their caretaker's name: {caretaker_name}" if caretaker_name else ""}

Generate a SHORT, CALMING message (2-3 sentences) that:
1. Reassures them they are safe
2. Mentions their caretaker is coming if name is known
3. Uses a gentle, warm tone
4. Is simple and easy to understand

Respond with ONLY the message, no formatting."""

        response = model.generate_content(prompt)
        
        if response and response.text:
            return response.text.strip().replace('*', '').replace('_', '')
        
        return "Everything is okay. You are safe. Someone who loves you is coming to help."
        
    except Exception as e:
        print(f"Gemini soothing message error: {e}")
        return "Everything is okay. You are safe. Help is on the way."
