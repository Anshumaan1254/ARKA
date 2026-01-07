"""
Anomaly Detection Service using Isolation Forest
Predicts wandering/panic before it happens
"""
import os
import pickle
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

# Scikit-learn for Isolation Forest
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    print("WARNING: scikit-learn not found. Install with: pip install scikit-learn")
    SKLEARN_AVAILABLE = False

# Model storage
MODELS_DIR = "anomaly_models"
os.makedirs(MODELS_DIR, exist_ok=True)

# Feature names for the model
FEATURE_NAMES = [
    "heart_rate",
    "walking_speed",
    "location_diff",
    "hour_of_day",
    "is_night",  # 1 if between 10pm-6am
    "speed_change",  # Delta from previous reading
    "outside_safe_zone"  # 1 if outside geofence
]


def get_hour_features(timestamp: datetime) -> Tuple[int, int]:
    """Extract hour-based features"""
    hour = timestamp.hour
    is_night = 1 if (hour >= 22 or hour < 6) else 0
    return hour, is_night


def prepare_features(telemetry: Dict, prev_telemetry: Dict = None) -> np.ndarray:
    """
    Convert raw telemetry to feature vector.
    
    Expected telemetry keys:
    - heart_rate: BPM
    - walking_speed: m/s
    - location_diff: distance from safe zone center in meters
    - timestamp: datetime or ISO string
    - is_inside_safe_zone: bool
    """
    timestamp = telemetry.get("timestamp", datetime.now())
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    
    hour, is_night = get_hour_features(timestamp)
    
    # Calculate speed change
    speed_change = 0
    if prev_telemetry:
        prev_speed = prev_telemetry.get("walking_speed", 0) or 0
        curr_speed = telemetry.get("walking_speed", 0) or 0
        speed_change = abs(curr_speed - prev_speed)
    
    features = np.array([
        telemetry.get("heart_rate", 70) or 70,
        telemetry.get("walking_speed", 0) or 0,
        telemetry.get("location_diff", 0) or 0,
        hour,
        is_night,
        speed_change,
        0 if telemetry.get("is_inside_safe_zone", True) else 1
    ])
    
    return features


def generate_training_data(n_normal: int = 500, n_anomaly: int = 50) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic training data for demo purposes.
    In production, this would use real patient data.
    """
    np.random.seed(42)
    
    # Normal behavior patterns
    normal_data = []
    for _ in range(n_normal):
        hour = np.random.choice(range(6, 23))  # Mostly daytime
        normal_data.append([
            np.random.normal(72, 8),  # heart_rate: normal ~72 bpm
            np.random.uniform(0, 1.2),  # walking_speed: slow walk
            np.random.uniform(0, 50),  # location_diff: close to home
            hour,
            0,  # not night
            np.random.uniform(0, 0.3),  # small speed changes
            0  # inside safe zone
        ])
    
    # Anomalous patterns (wandering, panic)
    anomaly_data = []
    for _ in range(n_anomaly):
        scenario = np.random.choice(["wandering_night", "panic", "fast_movement"])
        
        if scenario == "wandering_night":
            # Late night movement outside safe zone
            anomaly_data.append([
                np.random.normal(85, 10),  # elevated heart rate
                np.random.uniform(0.8, 2.0),  # walking
                np.random.uniform(100, 500),  # far from home
                np.random.choice([0, 1, 2, 3, 23]),  # late night/early morning
                1,  # is night
                np.random.uniform(0.5, 1.5),  # sudden speed changes
                1  # outside safe zone
            ])
        elif scenario == "panic":
            # High heart rate, erratic movement
            anomaly_data.append([
                np.random.normal(110, 15),  # very elevated heart rate
                np.random.uniform(0.2, 1.5),  # variable speed
                np.random.uniform(10, 200),  # variable location
                np.random.randint(0, 24),
                np.random.choice([0, 1]),
                np.random.uniform(0.8, 2.0),  # erratic speed changes
                np.random.choice([0, 1])
            ])
        else:
            # Fast movement at unusual time
            anomaly_data.append([
                np.random.normal(95, 12),
                np.random.uniform(1.5, 3.0),  # fast walking/running
                np.random.uniform(50, 300),
                np.random.choice([0, 1, 2, 3, 4, 5]),  # early morning
                1,
                np.random.uniform(1.0, 2.5),
                np.random.choice([0, 1])
            ])
    
    X_normal = np.array(normal_data)
    X_anomaly = np.array(anomaly_data)
    
    return X_normal, X_anomaly


class AnomalyDetector:
    """Isolation Forest-based anomaly detector for patient behavior"""
    
    def __init__(self, patient_id: str = "default"):
        self.patient_id = patient_id
        self.model = None
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.is_fitted = False
        self.model_path = os.path.join(MODELS_DIR, f"{patient_id}_model.pkl")
        
        # Try to load existing model
        self._load_model()
    
    def _load_model(self):
        """Load saved model if exists"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    saved = pickle.load(f)
                    self.model = saved["model"]
                    self.scaler = saved["scaler"]
                    self.is_fitted = True
                print(f"Loaded anomaly model for {self.patient_id}")
            except Exception as e:
                print(f"Could not load model: {e}")
    
    def _save_model(self):
        """Save model to disk"""
        try:
            with open(self.model_path, "wb") as f:
                pickle.dump({
                    "model": self.model,
                    "scaler": self.scaler
                }, f)
        except Exception as e:
            print(f"Could not save model: {e}")
    
    def train(self, normal_data: np.ndarray = None, contamination: float = 0.1):
        """
        Train the Isolation Forest model.
        
        Args:
            normal_data: Training data (normal behavior). If None, uses synthetic data.
            contamination: Expected proportion of anomalies (0.05-0.2)
        """
        if not SKLEARN_AVAILABLE:
            print("scikit-learn not available, using rule-based detection")
            return
        
        if normal_data is None:
            # Use synthetic data for demo
            normal_data, _ = generate_training_data()
        
        # Scale features
        X_scaled = self.scaler.fit_transform(normal_data)
        
        # Train Isolation Forest
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled)
        self.is_fitted = True
        
        self._save_model()
        print(f"Trained anomaly model for {self.patient_id}")
    
    def predict(self, telemetry: Dict, prev_telemetry: Dict = None) -> Dict:
        """
        Predict if current telemetry is anomalous.
        
        Returns:
            dict with:
            - is_anomaly: bool
            - confidence: float (0-1)
            - alert_type: str
            - severity: str
            - reason: str
        """
        features = prepare_features(telemetry, prev_telemetry)
        
        # Rule-based fallback if model not available
        if not SKLEARN_AVAILABLE or not self.is_fitted:
            return self._rule_based_detection(features, telemetry)
        
        # Scale and predict
        X = features.reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        
        # Get anomaly score (-1 = anomaly, 1 = normal)
        prediction = self.model.predict(X_scaled)[0]
        score = self.model.decision_function(X_scaled)[0]
        
        # Convert score to confidence (lower score = more anomalous)
        # score typically ranges from -0.5 (very anomalous) to 0.5 (very normal)
        confidence = max(0, min(1, 0.5 - score))
        
        is_anomaly = prediction == -1
        
        if is_anomaly:
            alert_type, severity, reason = self._classify_anomaly(features, telemetry)
        else:
            alert_type, severity, reason = None, None, None
        
        return {
            "is_anomaly": is_anomaly,
            "confidence": round(confidence, 3),
            "alert_type": alert_type,
            "severity": severity,
            "reason": reason,
            "raw_score": round(score, 4)
        }
    
    def _classify_anomaly(self, features: np.ndarray, telemetry: Dict) -> Tuple[str, str, str]:
        """Classify the type and severity of detected anomaly"""
        heart_rate = features[0]
        walking_speed = features[1]
        location_diff = features[2]
        is_night = features[4]
        outside_safe = features[6]
        
        # Determine alert type and severity
        if outside_safe and is_night and walking_speed > 0.5:
            return "wandering", "critical", "Patient moving outside safe zone at night"
        
        if heart_rate > 110:
            return "panic", "high", f"Elevated heart rate ({int(heart_rate)} BPM) detected"
        
        if walking_speed > 2.0:
            severity = "high" if is_night else "medium"
            return "unusual_activity", severity, f"Unusually fast movement ({walking_speed:.1f} m/s)"
        
        if outside_safe:
            return "wandering", "medium", f"Patient {int(location_diff)}m outside safe zone"
        
        if is_night and walking_speed > 0.3:
            return "wandering", "low", "Unusual nighttime activity detected"
        
        return "unusual_activity", "low", "Unusual behavior pattern detected"
    
    def _rule_based_detection(self, features: np.ndarray, telemetry: Dict) -> Dict:
        """Fallback rule-based anomaly detection"""
        heart_rate = features[0]
        walking_speed = features[1]
        location_diff = features[2]
        is_night = features[4]
        outside_safe = features[6]
        
        is_anomaly = False
        confidence = 0
        alert_type = None
        severity = None
        reason = None
        
        # Critical: Outside safe zone at night
        if outside_safe and is_night:
            is_anomaly = True
            confidence = 0.9
            alert_type = "wandering"
            severity = "critical"
            reason = "Patient outside safe zone during night hours"
        
        # High: Very elevated heart rate
        elif heart_rate > 120:
            is_anomaly = True
            confidence = 0.85
            alert_type = "panic"
            severity = "high"
            reason = f"Very high heart rate: {int(heart_rate)} BPM"
        
        # Medium: Fast movement at night
        elif is_night and walking_speed > 1.0:
            is_anomaly = True
            confidence = 0.7
            alert_type = "wandering"
            severity = "medium"
            reason = "Fast movement during night hours"
        
        # Low: Elevated heart rate
        elif heart_rate > 100:
            is_anomaly = True
            confidence = 0.5
            alert_type = "unusual_activity"
            severity = "low"
            reason = f"Elevated heart rate: {int(heart_rate)} BPM"
        
        return {
            "is_anomaly": is_anomaly,
            "confidence": confidence,
            "alert_type": alert_type,
            "severity": severity,
            "reason": reason,
            "raw_score": None
        }


# Global detector cache
_detectors: Dict[str, AnomalyDetector] = {}


def get_detector(patient_id: str) -> AnomalyDetector:
    """Get or create anomaly detector for patient"""
    if patient_id not in _detectors:
        _detectors[patient_id] = AnomalyDetector(patient_id)
    return _detectors[patient_id]


def train_detector(patient_id: str, training_data: np.ndarray = None):
    """Train anomaly detector for patient"""
    detector = get_detector(patient_id)
    detector.train(training_data)
    return detector


def check_anomaly(patient_id: str, telemetry: Dict, prev_telemetry: Dict = None) -> Dict:
    """Check if telemetry data indicates an anomaly"""
    detector = get_detector(patient_id)
    
    # Auto-train with synthetic data if not fitted
    if not detector.is_fitted:
        detector.train()
    
    return detector.predict(telemetry, prev_telemetry)


def is_available() -> bool:
    """Check if anomaly detection is available"""
    return SKLEARN_AVAILABLE
