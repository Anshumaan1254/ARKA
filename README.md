# Alzheimer Care App - Imagine Cup 2026

A comprehensive care application for Alzheimer's patients that helps them recognize people, manage medications, track items, and stay safe.

## Architecture

```
FLUTTER APP (mobile)  
----------------------------------
|  Voice Commands  | Camera Feed |
|  GPS Location    | Reminders   |
----------------------------------
          |  REST API (HTTPS)
          v
EXPRESS JS BACKEND (Node.js)
--------------------------------
| Auth (Azure AD B2C - JWKS)   |
| Routes (people, memories)    |
| Calls AI services            |
--------------------------------
  /        |         |         \
Face API  Vision API  Maps API  Blob Storage
 (Identify) (Detect)           (Media)
           \         |                /
            \        |               /
              Azure Cosmos DB
```

## Project Structure

```
imaginecup/
├── backend/                 # Express.js API Server
│   ├── config/             # Azure service configs
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth middleware
│   └── server.js           # Entry point
├── ml-services/            # FastAPI ML Services
│   ├── routes/             # ML endpoints
│   └── main.py             # Entry point
└── flutter_app/            # Flutter Mobile App
    └── lib/
        ├── config/         # API config
        ├── models/         # Data models
        ├── services/       # API, Auth, Location
        └── screens/        # UI screens
```

## Setup

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Azure credentials
npm install
npm run dev
```

### 2. ML Services Setup

```bash
cd ml-services
cp .env.example .env
pip install -r requirements.txt
python main.py
```

### 3. Flutter App Setup

```bash
cd flutter_app
flutter pub get
flutter run
```

## Required Azure Services

1. **Azure Cosmos DB** - Database
2. **Azure Blob Storage** - Media storage
3. **Azure Face API** - Face recognition
4. **Azure Computer Vision** - Object detection
5. **Azure AD B2C** - Authentication (JWKS)
6. **Google Maps API** - Location services

## Features

- **Face Recognition** - Identify known people
- **Voice Commands** - "Recognize him", "Take me home"
- **Medicine Reminders** - Scheduled notifications
- **Memory Playback** - Audio/video memories
- **SOS Alerts** - Emergency contacts
- **Home Navigation** - One-tap directions
- **Geofencing** - Safety alerts
- **Item Tracking** - Find keys, remote, etc.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth/*` | Authentication |
| `/api/persons/*` | Person management |
| `/api/memories/*` | Memory CRUD |
| `/api/reminders/*` | Medicine reminders |
| `/api/sos/*` | SOS & geofencing |
| `/api/items/*` | Item tracking |
| `/api/frame/*` | Frame processing |
| `/api/location/*` | Location tracking |

## License

MIT - Microsoft Imagine Cup 2026
