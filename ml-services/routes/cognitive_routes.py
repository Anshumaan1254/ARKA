"""
ARKA - Cognitive Health Analysis ML Routes
Speech pattern analysis, cognitive scoring, and anomaly detection
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import numpy as np
from datetime import datetime, timedelta
import re

router = APIRouter()

class SpeechAnalysisRequest(BaseModel):
    audio_base64: Optional[str] = None
    transcript: Optional[str] = None

class DailyScoreRequest(BaseModel):
    user_id: str
    activities: List[Dict] = []
    date: str

class TrendsRequest(BaseModel):
    records: List[Dict]
    days: int = 30

class AnomalyRequest(BaseModel):
    records: List[Dict]

class WeeklyReportRequest(BaseModel):
    user_id: str
    records: List[Dict]

# Cognitive indicators from speech
HESITATION_WORDS = ['um', 'uh', 'er', 'ah', 'hmm', 'like', 'you know', 'well']
REPETITION_THRESHOLD = 3

def analyze_speech_patterns(transcript: str) -> Dict:
    """Analyze speech transcript for cognitive health indicators"""
    if not transcript:
        return {
            "hesitation_score": 0.0,
            "repetition_score": 0.0,
            "word_finding_difficulty": 0.0,
            "cognitive_score": 0.75,
            "recommendations": [],
            "alert_level": "normal"
        }
    
    words = transcript.lower().split()
    word_count = len(words)
    
    if word_count == 0:
        return {
            "hesitation_score": 0.0,
            "repetition_score": 0.0,
            "word_finding_difficulty": 0.0,
            "cognitive_score": 0.75,
            "recommendations": [],
            "alert_level": "normal"
        }
    
    # Hesitation analysis
    hesitation_count = sum(1 for word in words if word in HESITATION_WORDS)
    hesitation_score = min(1.0, hesitation_count / (word_count * 0.1))
    
    # Repetition analysis
    word_freq = {}
    for word in words:
        if len(word) > 3:  # Ignore short words
            word_freq[word] = word_freq.get(word, 0) + 1
    
    repetitions = sum(1 for count in word_freq.values() if count >= REPETITION_THRESHOLD)
    repetition_score = min(1.0, repetitions * 0.2)
    
    # Word finding difficulty (pauses indicated by "...")
    pause_pattern = r'\.{3,}|…'
    pauses = len(re.findall(pause_pattern, transcript))
    word_finding_difficulty = min(1.0, pauses * 0.15)
    
    # Calculate overall cognitive score (1.0 = excellent, 0.0 = concerning)
    cognitive_score = max(0.0, 1.0 - (hesitation_score * 0.3 + repetition_score * 0.4 + word_finding_difficulty * 0.3))
    
    # Determine alert level
    if cognitive_score < 0.4:
        alert_level = "high"
        recommendations = [
            "Consider scheduling a cognitive assessment",
            "Increase memory exercises frequency",
            "Alert caregiver about speech pattern changes"
        ]
    elif cognitive_score < 0.6:
        alert_level = "moderate"
        recommendations = [
            "Continue daily memory exercises",
            "Monitor for further changes"
        ]
    else:
        alert_level = "normal"
        recommendations = ["Keep up the good work with daily activities"]
    
    return {
        "hesitation_score": round(hesitation_score, 3),
        "repetition_score": round(repetition_score, 3),
        "word_finding_difficulty": round(word_finding_difficulty, 3),
        "cognitive_score": round(cognitive_score, 3),
        "recommendations": recommendations,
        "alert_level": alert_level
    }

@router.post("/analyze-speech")
async def analyze_speech(request: SpeechAnalysisRequest):
    """Analyze speech for cognitive health indicators"""
    try:
        # If audio is provided, we would transcribe it first
        # For now, use transcript directly
        transcript = request.transcript or ""
        
        analysis = analyze_speech_patterns(transcript)
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/daily-score")
async def calculate_daily_score(request: DailyScoreRequest):
    """Calculate daily cognitive performance score"""
    try:
        activities = request.activities
        
        # Score components
        scores = {
            "memory_exercises": 0.0,
            "social_interactions": 0.0,
            "medication_adherence": 0.0,
            "physical_activity": 0.0,
            "sleep_quality": 0.0
        }
        
        for activity in activities:
            activity_type = activity.get("type", "")
            success = activity.get("success", False)
            score = activity.get("score", 0.5)
            
            if "memory" in activity_type or "training" in activity_type:
                scores["memory_exercises"] = max(scores["memory_exercises"], score if success else score * 0.5)
            elif "social" in activity_type or "call" in activity_type or "visit" in activity_type:
                scores["social_interactions"] = max(scores["social_interactions"], 0.8 if success else 0.4)
            elif "medicine" in activity_type or "medication" in activity_type:
                scores["medication_adherence"] = 1.0 if success else 0.3
            elif "walk" in activity_type or "exercise" in activity_type:
                scores["physical_activity"] = 0.9 if success else 0.5
        
        # Default values for unmeasured activities
        for key in scores:
            if scores[key] == 0.0:
                scores[key] = 0.5  # Neutral score
        
        # Calculate weighted average
        weights = {
            "memory_exercises": 0.3,
            "social_interactions": 0.2,
            "medication_adherence": 0.25,
            "physical_activity": 0.15,
            "sleep_quality": 0.1
        }
        
        overall_score = sum(scores[k] * weights[k] for k in scores)
        
        # Determine trend (would compare with historical data)
        trend = "stable"  # Could be "improving", "declining", "stable"
        
        # Generate insights
        insights = []
        if scores["memory_exercises"] > 0.7:
            insights.append("Great job completing memory exercises today!")
        if scores["medication_adherence"] < 0.5:
            insights.append("Medication may have been missed. Please check.")
        if scores["social_interactions"] > 0.6:
            insights.append("Good social engagement today!")
        
        # Caregiver alerts
        caregiver_alerts = []
        if overall_score < 0.4:
            caregiver_alerts.append({
                "type": "cognitive_decline",
                "severity": "high",
                "message": "Daily cognitive score below threshold. Consider medical consultation."
            })
        
        return {
            "overall_score": round(overall_score, 3),
            "breakdown": {k: round(v, 3) for k, v in scores.items()},
            "trend": trend,
            "comparison_to_baseline": round(overall_score - 0.65, 3),  # 0.65 as example baseline
            "insights": insights,
            "caregiver_alerts": caregiver_alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calculate-trends")
async def calculate_trends(request: TrendsRequest):
    """Calculate cognitive health trends over time"""
    try:
        records = request.records
        days = request.days
        
        if not records:
            return {
                "trends": [],
                "average_score": 0.65,
                "trajectory": "insufficient_data",
                "significant_changes": [],
                "recommendations": ["Continue collecting daily data for trend analysis"]
            }
        
        # Calculate daily averages
        daily_scores = {}
        for record in records:
            date = record.get("date", "")
            score = record.get("score", 0.5)
            if date:
                if date not in daily_scores:
                    daily_scores[date] = []
                daily_scores[date].append(score)
        
        # Calculate averages
        trends = []
        for date, scores in sorted(daily_scores.items()):
            trends.append({
                "date": date,
                "score": round(sum(scores) / len(scores), 3)
            })
        
        if len(trends) >= 2:
            first_week_avg = sum(t["score"] for t in trends[:7]) / min(7, len(trends))
            last_week_avg = sum(t["score"] for t in trends[-7:]) / min(7, len(trends))
            
            if last_week_avg > first_week_avg + 0.1:
                trajectory = "improving"
            elif last_week_avg < first_week_avg - 0.1:
                trajectory = "declining"
            else:
                trajectory = "stable"
        else:
            trajectory = "insufficient_data"
        
        average_score = sum(t["score"] for t in trends) / len(trends) if trends else 0.65
        
        # Detect significant changes
        significant_changes = []
        for i in range(1, len(trends)):
            if abs(trends[i]["score"] - trends[i-1]["score"]) > 0.2:
                significant_changes.append({
                    "date": trends[i]["date"],
                    "change": round(trends[i]["score"] - trends[i-1]["score"], 3),
                    "direction": "improvement" if trends[i]["score"] > trends[i-1]["score"] else "decline"
                })
        
        # Generate recommendations
        recommendations = []
        if trajectory == "declining":
            recommendations.append("Consider increasing memory exercise frequency")
            recommendations.append("Schedule a check-up with healthcare provider")
        elif trajectory == "improving":
            recommendations.append("Current routine is working well - maintain it")
        else:
            recommendations.append("Continue with current care routine")
        
        return {
            "trends": trends[-days:],
            "average_score": round(average_score, 3),
            "trajectory": trajectory,
            "significant_changes": significant_changes,
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-anomalies")
async def detect_anomalies(request: AnomalyRequest):
    """Detect anomalies in cognitive patterns"""
    try:
        records = request.records
        
        if len(records) < 5:
            return {
                "alerts": [],
                "risk_level": "unknown",
                "action_required": False,
                "suggested_actions": ["Continue collecting data for accurate anomaly detection"]
            }
        
        # Analyze recent patterns
        recent_scores = []
        for record in records[-20:]:
            if record.get("type") == "daily_score":
                recent_scores.append(record.get("score", 0.5))
        
        if not recent_scores:
            return {
                "alerts": [],
                "risk_level": "unknown",
                "action_required": False,
                "suggested_actions": []
            }
        
        avg_score = sum(recent_scores) / len(recent_scores)
        std_dev = np.std(recent_scores) if len(recent_scores) > 1 else 0
        
        alerts = []
        
        # Check for sudden drops
        if len(recent_scores) >= 3 and recent_scores[-1] < avg_score - 2 * std_dev:
            alerts.append({
                "type": "sudden_decline",
                "severity": "high",
                "message": "Significant sudden decline in cognitive score detected",
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for consistent decline
        if len(recent_scores) >= 7:
            trend = recent_scores[-7:]
            declining = all(trend[i] <= trend[i-1] for i in range(1, len(trend)))
            if declining:
                alerts.append({
                    "type": "consistent_decline",
                    "severity": "moderate",
                    "message": "Consistent decline over past week",
                    "timestamp": datetime.now().isoformat()
                })
        
        # Determine overall risk level
        if any(a["severity"] == "high" for a in alerts):
            risk_level = "high"
            action_required = True
            suggested_actions = [
                "Contact healthcare provider immediately",
                "Increase monitoring frequency",
                "Review recent medication changes"
            ]
        elif any(a["severity"] == "moderate" for a in alerts):
            risk_level = "moderate"
            action_required = True
            suggested_actions = [
                "Schedule a check-up soon",
                "Increase engagement activities"
            ]
        else:
            risk_level = "low"
            action_required = False
            suggested_actions = ["Continue current care routine"]
        
        return {
            "alerts": alerts,
            "risk_level": risk_level,
            "action_required": action_required,
            "suggested_actions": suggested_actions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/weekly-report")
async def generate_weekly_report(request: WeeklyReportRequest):
    """Generate comprehensive weekly cognitive health report"""
    try:
        records = request.records
        user_id = request.user_id
        
        # Aggregate data
        speech_records = [r for r in records if r.get("type") == "speech_analysis"]
        daily_records = [r for r in records if r.get("type") == "daily_score"]
        interaction_records = [r for r in records if r.get("type") == "interaction"]
        
        # Calculate averages
        avg_cognitive_score = 0.65
        if daily_records:
            scores = [r.get("score", 0.5) for r in daily_records[-7:]]
            avg_cognitive_score = sum(scores) / len(scores)
        
        # Speech analysis summary
        speech_summary = "No speech data available this week"
        if speech_records:
            avg_hesitation = sum(r.get("analysis", {}).get("hesitation_score", 0) for r in speech_records) / len(speech_records)
            speech_summary = f"Average hesitation score: {round(avg_hesitation, 2)}. "
            if avg_hesitation < 0.3:
                speech_summary += "Speech patterns appear normal."
            else:
                speech_summary += "Some hesitation patterns detected - continue monitoring."
        
        # Behavioral patterns
        behavioral_patterns = []
        if interaction_records:
            success_rate = sum(1 for r in interaction_records if r.get("success")) / len(interaction_records)
            behavioral_patterns.append(f"Interaction success rate: {round(success_rate * 100)}%")
        
        # Summary
        summary = f"This week's cognitive performance was {'good' if avg_cognitive_score > 0.6 else 'concerning' if avg_cognitive_score < 0.4 else 'moderate'}. "
        summary += f"Average cognitive score: {round(avg_cognitive_score * 100)}%. "
        
        return {
            "summary": summary,
            "average_cognitive_score": round(avg_cognitive_score, 3),
            "speech_analysis_summary": speech_summary,
            "behavioral_patterns": behavioral_patterns,
            "alerts_summary": f"{len([r for r in records if 'alert' in str(r)])} alerts this week",
            "caregiver_recommendations": [
                "Continue daily memory exercises",
                "Maintain regular social interactions",
                "Ensure medication schedule is followed"
            ],
            "medical_notes": f"Weekly cognitive assessment for patient. Score: {round(avg_cognitive_score * 100)}%."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
