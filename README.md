# ARKA - AI-Powered Alzheimer's Care Companion
## Microsoft Imagine Cup 2026 Entry

<p align="center">
  <img src="https://img.shields.io/badge/Imagine%20Cup-2026-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Category-Health%20%26%20Life%20Sciences-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Ready-success?style=for-the-badge" />
</p>

> **Mission**: Restore independence, preserve memories, and provide peace of mind for 50+ million Alzheimer's patients and their caregivers worldwide.

## 🚀 Revolutionary Features

### 🧠 Cognitive Health Monitoring AI
Real-time detection of cognitive decline through speech patterns, behavioral analysis, and daily activity scoring.

### 🔮 Predictive Memory Assistant  
AI that learns patient life context and proactively provides information before they need to ask.

### 😊 Real-Time Emotion Recognition
Detects confusion, stress, and emotional states to auto-activate calming support and adaptive UI.

### 💡 Memory Reinforcement Learning
Scientifically-designed spaced repetition (SM-2 algorithm) to strengthen face-name associations.

### 📹 Digital Life Recorder
AI-curated life documentation with automatic moment detection and voice-narrated memories.

### 📊 Caregiver Analytics Dashboard
Web-based real-time monitoring with cognitive trends, location tracking, and medication adherence.

### ♿ Universal Accessibility
Ultra-simplified mode with just 3 buttons, complete voice control, and haptic guidance.

---

## 🏗️ Architecture

```
ARKA System Architecture
========================

┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT LAYER (Flutter App)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Face Camera │  │ Voice Input │  │ GPS Tracker │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         ├─────────────────┴─────────────────┘                    │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │                 Simplified Mode (3 Buttons)              │    │
│  │           [FACE]     [MEDICINE]     [HELP]               │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST API
┌───────────────────────────────▼─────────────────────────────────┐
│                    BACKEND LAYER (Express.js)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Cognitive  │  │  Emotion   │  │  Training  │  │   Life     │ │
│  │  Health    │  │    API     │  │    API     │  │  Recorder  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    ML LAYER (FastAPI + Python)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  DeepFace  │  │  Speech    │  │  SM-2      │  │  Moment    │ │
│  │  ArcFace   │  │  Analysis  │  │  Algorithm │  │  Detection │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    DATA LAYER (Azure)                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Cosmos DB  │  │   Blob     │  │  Face API  │                 │
│  │            │  │  Storage   │  │            │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                 CAREGIVER LAYER (React Dashboard)                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Cognitive  │  │  Location  │  │ Medication │  │  Training  │ │
│  │   Charts   │  │   Map      │  │  Adherence │  │  Progress  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ARKA/
├── backend/                      # Express.js API Server
│   ├── routes/
│   │   ├── cognitive-health.routes.js  # Cognitive monitoring
│   │   ├── emotion.routes.js           # Emotion detection
│   │   ├── memory-training.routes.js   # Spaced repetition
│   │   ├── life-recorder.routes.js     # Digital memories
│   │   └── ... (existing routes)
│   └── server.js
│
├── ml-services/                  # FastAPI ML Services
│   ├── routes/
│   │   ├── cognitive_routes.py   # Speech pattern analysis
│   │   ├── emotion_routes.py     # DeepFace emotion detection
│   │   ├── training_routes.py    # SM-2 algorithm
│   │   ├── recorder_routes.py    # Moment significance
│   │   └── ... (existing routes)
│   └── main.py
│
├── flutter_app/                  # Flutter Mobile App
│   └── lib/
│       ├── screens/
│       │   ├── simplified_mode_screen.dart   # 3-button mode
│       │   ├── cognitive_training_screen.dart
│       │   └── ... (existing screens)
│       └── services/
│           ├── emotion_service.dart
│           ├── cognitive_service.dart
│           ├── training_service.dart
│           └── ... (existing services)
│
├── web-dashboard/                # React Caregiver Dashboard
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── CognitiveHealth.jsx
│       │   ├── LocationTracker.jsx
│       │   ├── MedicationTracker.jsx
│       │   └── MemoryTraining.jsx
│       └── index.css             # Premium design system
│
└── Alzymer/                      # Original face recognition
    └── app.py                    # DeepFace ArcFace model
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure Azure credentials in .env
npm run dev
```

### 2. ML Services Setup
```bash
cd ml-services
pip install -r requirements.txt
python main.py
```

### 3. Flutter App
```bash
cd flutter_app
flutter pub get
flutter run
```

### 4. Caregiver Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

---

## 🎯 Why ARKA Will Win Imagine Cup

| Criteria | How ARKA Excels |
|----------|-----------------|
| **Innovation** | First comprehensive AI combining cognitive monitoring + predictive memory + emotion recognition |
| **Technical Excellence** | Multi-modal ML, real-time processing, Azure-native architecture |
| **Social Impact** | 50M+ Alzheimer's patients worldwide, massive caregiver burden reduction |
| **Scalability** | Cloud-native, works offline, adapts to any cultural context |
| **Business Model** | B2B2C through healthcare systems + direct subscription for families |
| **Personal Story** | Inspired by the challenges faced by families caring for loved ones |

---

## 🛠️ Technology Stack

- **Frontend**: Flutter (Mobile), React + Vite (Web Dashboard)
- **Backend**: Node.js + Express.js
- **ML/AI**: FastAPI + Python, DeepFace (ArcFace model), Custom cognitive models
- **Cloud**: Azure Cosmos DB, Azure Blob Storage, Azure Face API, Azure Vision
- **Real-time**: WebSocket for live updates
- **Design**: Glassmorphism UI, Dark theme, WCAG accessible

---

## 📞 Contact

**Team ARKA** - Microsoft Imagine Cup 2026

---

*Made with ❤️ for Alzheimer's patients and their caregivers worldwide*
