"""
ARKA - Memory Training ML Routes
Spaced repetition algorithm and adaptive learning system
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import random
import math

router = APIRouter()

class GenerateSessionRequest(BaseModel):
    user_id: str
    session_type: str = "full"
    previous_results: List[Dict] = []

class UpdateStrengthRequest(BaseModel):
    user_id: str
    person_id: str
    correct: bool
    response_time: Optional[float] = None
    attempts: int = 1
    previous_strength: float = 0.0

class AnalyzeProgressRequest(BaseModel):
    user_id: str
    records: List[Dict]
    strengths: Dict[str, float]

# Exercise types
EXERCISE_TYPES = [
    {
        "type": "face_match",
        "name": "Face Matching",
        "description": "Match the face with the correct name",
        "difficulty_range": (1, 5)
    },
    {
        "type": "voice_recognition",
        "name": "Voice Recognition",
        "description": "Listen to the voice and identify the person",
        "difficulty_range": (2, 5)
    },
    {
        "type": "story_recall",
        "name": "Story Recall",
        "description": "Remember details about this person's story",
        "difficulty_range": (3, 5)
    },
    {
        "type": "relationship_quiz",
        "name": "Relationship Quiz",
        "description": "Answer questions about how you know this person",
        "difficulty_range": (2, 4)
    },
    {
        "type": "photo_memory",
        "name": "Photo Memory",
        "description": "Recall memories from shared photos",
        "difficulty_range": (3, 5)
    }
]

# Encouragement messages
ENCOURAGEMENTS = {
    "correct": [
        "Excellent! You remembered!",
        "That's right! Great job!",
        "Wonderful memory!",
        "You're doing amazing!",
        "Perfect! Keep it up!"
    ],
    "incorrect": [
        "That's okay, let's try again!",
        "Don't worry, memory takes practice!",
        "Good effort! Let me remind you.",
        "No problem, we'll work on this together!"
    ],
    "streak": [
        "You're on a roll!",
        "What a streak! Fantastic!",
        "Your memory is getting stronger!",
        "Incredible consistency!"
    ]
}

def calculate_sm2_interval(previous_strength: float, correct: bool, attempts: int) -> tuple:
    """
    Calculate new strength and review interval using SM-2 variant algorithm
    Returns (new_strength, days_until_review)
    """
    # Quality score (0-5 scale)
    if correct and attempts == 1:
        quality = 5  # Perfect response
    elif correct and attempts == 2:
        quality = 4  # Correct with hesitation
    elif correct:
        quality = 3  # Correct with difficulty
    else:
        quality = 1  # Incorrect
    
    # Calculate new easiness factor (strength)
    ef = previous_strength if previous_strength > 0 else 2.5
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ef = max(1.3, min(5.0, ef))  # Keep between 1.3 and 5.0
    
    # Normalize to 0-1 scale for storage
    new_strength = (ef - 1.3) / 3.7  # Maps 1.3-5.0 to 0-1
    
    # Calculate interval
    if quality < 3:
        # Reset for incorrect
        interval = 1
    elif previous_strength < 0.2:
        interval = 1
    elif previous_strength < 0.4:
        interval = 3
    elif previous_strength < 0.6:
        interval = 7
    elif previous_strength < 0.8:
        interval = 14
    else:
        interval = int(previous_strength * 30)
    
    return round(new_strength, 3), interval

def generate_exercise(person_id: str, exercise_type: Dict, difficulty: int) -> Dict:
    """Generate a single exercise"""
    return {
        "exercise_id": f"ex_{datetime.now().timestamp()}_{random.randint(1000, 9999)}",
        "person_id": person_id,
        "type": exercise_type["type"],
        "name": exercise_type["name"],
        "description": exercise_type["description"],
        "difficulty": difficulty,
        "instructions": f"Difficulty level {difficulty}/5",
        "time_limit": 30 + (5 - difficulty) * 10,  # More time for harder exercises
        "hints_available": difficulty <= 3
    }

@router.post("/generate-session")
async def generate_training_session(request: GenerateSessionRequest):
    """Generate personalized training session"""
    try:
        user_id = request.user_id
        session_type = request.session_type
        previous_results = request.previous_results
        
        # Determine which people need reinforcement
        person_performance = {}
        for result in previous_results:
            pid = result.get("personId", "")
            if pid:
                if pid not in person_performance:
                    person_performance[pid] = {"correct": 0, "total": 0}
                person_performance[pid]["total"] += 1
                if result.get("correct"):
                    person_performance[pid]["correct"] += 1
        
        # Identify weak areas
        weak_persons = []
        strong_persons = []
        for pid, perf in person_performance.items():
            accuracy = perf["correct"] / perf["total"] if perf["total"] > 0 else 0.5
            if accuracy < 0.6:
                weak_persons.append(pid)
            else:
                strong_persons.append(pid)
        
        # Generate exercises
        exercises = []
        
        # Session parameters based on type
        if session_type == "quick":
            num_exercises = 3
            max_difficulty = 3
            focus = "reinforcement"
        elif session_type == "intensive":
            num_exercises = 10
            max_difficulty = 5
            focus = "challenge"
        else:  # full
            num_exercises = 5
            max_difficulty = 4
            focus = "balanced"
        
        # Create exercise list
        for i in range(num_exercises):
            # Prioritize weak persons
            if weak_persons and random.random() < 0.7:
                person_id = random.choice(weak_persons)
            elif strong_persons:
                person_id = random.choice(strong_persons)
            else:
                person_id = f"person_{i}"
            
            # Select exercise type
            exercise_type = random.choice(EXERCISE_TYPES)
            
            # Adjust difficulty based on performance
            if person_id in [p for p in weak_persons]:
                difficulty = min(max_difficulty, random.randint(1, 3))
            else:
                difficulty = random.randint(2, max_difficulty)
            
            exercises.append(generate_exercise(person_id, exercise_type, difficulty))
        
        # Session metadata
        session_id = f"session_{datetime.now().strftime('%Y%m%d%H%M%S')}_{user_id}"
        
        encouragement = random.choice([
            "Let's exercise your memory today!",
            "Ready to strengthen your memories?",
            "Each exercise makes your memories stronger!",
            "You're doing great - let's keep going!"
        ])
        
        return {
            "session_id": session_id,
            "session_type": session_type,
            "estimated_duration": num_exercises * 2,  # ~2 min per exercise
            "exercises": exercises,
            "difficulty": focus,
            "focus_people": weak_persons[:3] if weak_persons else [],
            "encouragement_message": encouragement
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-strength")
async def update_memory_strength(request: UpdateStrengthRequest):
    """Update memory strength after exercise"""
    try:
        new_strength, interval = calculate_sm2_interval(
            request.previous_strength,
            request.correct,
            request.attempts
        )
        
        strength_change = new_strength - request.previous_strength
        next_review = datetime.now() + timedelta(days=interval)
        
        # Select encouragement message
        if request.correct:
            encouragement = random.choice(ENCOURAGEMENTS["correct"])
        else:
            encouragement = random.choice(ENCOURAGEMENTS["incorrect"])
        
        # Calculate streak (would query from DB)
        streak = 5 if request.correct else 0  # Simplified
        
        return {
            "previous_strength": request.previous_strength,
            "new_strength": new_strength,
            "strength_change": round(strength_change, 3),
            "next_review_date": next_review.isoformat(),
            "streak": streak,
            "encouragement": encouragement
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-progress")
async def analyze_training_progress(request: AnalyzeProgressRequest):
    """Analyze comprehensive training progress"""
    try:
        records = request.records
        strengths = request.strengths
        
        # Count sessions and exercises
        session_ids = set()
        exercise_count = 0
        correct_count = 0
        
        for record in records:
            if record.get("sessionId"):
                session_ids.add(record["sessionId"])
            if record.get("exerciseId"):
                exercise_count += 1
                if record.get("correct"):
                    correct_count += 1
        
        # Calculate statistics
        overall_accuracy = correct_count / exercise_count if exercise_count > 0 else 0
        
        # Memory strength analysis
        memory_strengths = []
        strongest = []
        needs_reinforcement = []
        
        for person_id, strength in strengths.items():
            memory_strengths.append({
                "person_id": person_id,
                "strength": strength,
                "level": "strong" if strength > 0.7 else "moderate" if strength > 0.4 else "weak"
            })
            
            if strength > 0.7:
                strongest.append(person_id)
            elif strength < 0.4:
                needs_reinforcement.append(person_id)
        
        # Weekly progress (simplified)
        weekly_progress = [
            {"week": 1, "score": 0.4, "exercises": 10},
            {"week": 2, "score": 0.5, "exercises": 15},
            {"week": 3, "score": 0.55, "exercises": 12},
            {"week": 4, "score": overall_accuracy, "exercises": exercise_count}
        ]
        
        # Achievements
        achievements = []
        if exercise_count >= 10:
            achievements.append({"name": "Getting Started", "icon": "🎯", "description": "Completed 10 exercises"})
        if exercise_count >= 50:
            achievements.append({"name": "Memory Champion", "icon": "🏆", "description": "Completed 50 exercises"})
        if overall_accuracy > 0.8:
            achievements.append({"name": "Sharp Mind", "icon": "🧠", "description": "80%+ accuracy"})
        if len(strongest) >= 3:
            achievements.append({"name": "Strong Bonds", "icon": "💪", "description": "3+ strong memories"})
        
        # Next milestone
        next_milestone = {
            "name": "Memory Master",
            "requirement": "Complete 100 exercises",
            "progress": min(100, exercise_count),
            "target": 100
        }
        
        return {
            "total_sessions": len(session_ids),
            "total_exercises": exercise_count,
            "overall_accuracy": round(overall_accuracy, 3),
            "current_streak": 5,  # Would calculate from data
            "longest_streak": 12,  # Would calculate from data
            "memory_strengths": memory_strengths,
            "strongest_memories": strongest,
            "needs_reinforcement": needs_reinforcement,
            "weekly_progress": weekly_progress,
            "achievements": achievements,
            "next_milestone": next_milestone
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
