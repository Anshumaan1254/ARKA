"""
Voice Cloning Service using Bark (Suno AI)
Generates speech with voice cloning capability
"""
import os
import io
import uuid
import base64
import tempfile
from pathlib import Path
import numpy as np

# Bark will be imported when available
BARK_AVAILABLE = False
generate_audio = None
preload_models = None

try:
    from bark import generate_audio as bark_generate, preload_models as bark_preload
    from bark import SAMPLE_RATE
    import scipy.io.wavfile as wavfile
    generate_audio = bark_generate
    preload_models = bark_preload
    BARK_AVAILABLE = True
    print("✅ Bark TTS loaded successfully")
except ImportError as e:
    print(f"WARNING: Bark TTS not found: {e}")
except Exception as e:
    print(f"WARNING: Bark TTS error: {e}")

# Global state
_models_loaded = False
VOICE_SAMPLES_DIR = "voice_samples"
GENERATED_AUDIO_DIR = "generated_audio"
SAMPLE_RATE_OUT = 24000  # Bark sample rate

# Create directories
os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)
os.makedirs(GENERATED_AUDIO_DIR, exist_ok=True)

# Voice presets for different personas (Bark has built-in voice presets)
VOICE_PRESETS = {
    "default": "v2/en_speaker_6",
    "warm_male": "v2/en_speaker_6",
    "warm_female": "v2/en_speaker_9",
    "gentle": "v2/en_speaker_1",
    "energetic": "v2/en_speaker_3",
}


def load_models():
    """Load Bark models (lazy loading)"""
    global _models_loaded
    
    if not BARK_AVAILABLE:
        return False
    
    if not _models_loaded:
        try:
            print("Loading Bark TTS models... (this may take a minute)")
            preload_models()
            _models_loaded = True
            print("✅ Bark models loaded successfully")
        except Exception as e:
            print(f"Failed to load Bark models: {e}")
            return False
    
    return True


def save_voice_sample(audio_bytes: bytes, person_id: str) -> str:
    """
    Save a voice sample for later reference.
    Note: Bark uses voice presets, not direct voice cloning from samples.
    The sample is saved for potential future use with fine-tuning.
    """
    sample_path = os.path.join(VOICE_SAMPLES_DIR, f"{person_id}_{uuid.uuid4()}.wav")
    
    with open(sample_path, "wb") as f:
        f.write(audio_bytes)
    
    return sample_path


def get_voice_sample_path(person_id: str) -> str:
    """Get the most recent voice sample for a person"""
    samples = list(Path(VOICE_SAMPLES_DIR).glob(f"{person_id}_*.wav"))
    if samples:
        samples.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return str(samples[0])
    return None


def generate_speech(
    text: str,
    voice_preset: str = "warm_female",
    person_id: str = None
) -> bytes:
    """
    Generate speech using Bark TTS.
    
    Args:
        text: Text to speak
        voice_preset: Voice style to use
        person_id: Optional person ID (for future voice matching)
    
    Returns:
        WAV audio bytes
    """
    if not load_models():
        raise RuntimeError("Bark TTS models not available")
    
    try:
        # Get the voice preset
        preset = VOICE_PRESETS.get(voice_preset, VOICE_PRESETS["default"])
        
        # Generate audio with Bark
        audio_array = generate_audio(text, history_prompt=preset)
        
        # Convert to WAV bytes
        output_path = os.path.join(GENERATED_AUDIO_DIR, f"speech_{uuid.uuid4()}.wav")
        
        # Normalize and convert to int16
        audio_array = np.clip(audio_array, -1, 1)
        audio_int16 = (audio_array * 32767).astype(np.int16)
        
        # Write WAV file
        import scipy.io.wavfile as wavfile
        wavfile.write(output_path, SAMPLE_RATE_OUT, audio_int16)
        
        # Read back as bytes
        with open(output_path, "rb") as f:
            audio_bytes = f.read()
        
        # Cleanup
        os.remove(output_path)
        
        return audio_bytes
        
    except Exception as e:
        print(f"Bark TTS error: {e}")
        raise e


def clone_voice_speak(
    text: str,
    voice_sample_path: str = None,
    language: str = "en"
) -> bytes:
    """
    Generate speech with voice cloning.
    Note: Bark uses presets. For true cloning, sample is saved for reference.
    """
    # Use warm female voice as default (sounds friendly for caregiving context)
    return generate_speech(text, voice_preset="warm_female")


def speak_with_default_voice(text: str) -> bytes:
    """
    Generate speech using a warm default voice.
    """
    try:
        return generate_speech(text, voice_preset="warm_female")
    except Exception as e:
        print(f"Default TTS error: {e}")
        return None


def speak_with_persona(text: str, persona: str = "gentle") -> bytes:
    """
    Generate speech with a specific persona.
    
    Personas:
    - gentle: Calm, soothing voice
    - warm_male: Friendly male voice
    - warm_female: Friendly female voice
    - energetic: Upbeat, cheerful voice
    """
    return generate_speech(text, voice_preset=persona)


def audio_to_base64(audio_bytes: bytes) -> str:
    """Convert audio bytes to base64 string for API response"""
    return base64.b64encode(audio_bytes).decode('utf-8')


def validate_voice_sample(audio_path: str) -> dict:
    """
    Validate a voice sample for quality.
    """
    try:
        import wave
        
        with wave.open(audio_path, 'rb') as wav:
            frames = wav.getnframes()
            rate = wav.getframerate()
            duration = frames / float(rate)
            channels = wav.getnchannels()
        
        if duration < 3:
            return {
                "valid": False,
                "duration_seconds": duration,
                "quality_score": 0,
                "message": "Audio too short. Please provide at least 6 seconds."
            }
        
        if duration > 120:
            return {
                "valid": False,
                "duration_seconds": duration,
                "quality_score": 0,
                "message": "Audio too long. Please keep it under 60 seconds."
            }
        
        quality = min(1.0, duration / 10)
        
        return {
            "valid": True,
            "duration_seconds": duration,
            "quality_score": quality,
            "message": "Voice sample saved!" if duration >= 6 else "Good, but longer samples work better."
        }
        
    except Exception as e:
        return {
            "valid": False,
            "duration_seconds": 0,
            "quality_score": 0,
            "message": f"Could not read audio file: {str(e)}"
        }


def is_available() -> bool:
    """Check if voice synthesis is available"""
    return BARK_AVAILABLE


def get_available_voices() -> list:
    """Get list of available voice presets"""
    return list(VOICE_PRESETS.keys())
