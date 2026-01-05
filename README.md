# ARKA - Alzheimer's Recognition & Knowledge Assistant

A compassionate, production-grade web platform designed to help Alzheimer's patients recognize their loved ones and cherish precious memories.

## 🧠 Features

### For Patients
- **Face Recognition** - Point camera at someone to instantly identify them
- **Voice Memories** - Hear personalized stories about recognized people
- **SOS Emergency** - One-tap distress signal with live location sharing
- **Simplified UI** - Large buttons, calm colors, distraction-free design

### For Caretakers
- **Secure Dashboard** - Manage patient data and monitor activity
- **Add Known Faces** - Upload photos and record voice memories
- **Recognition Logs** - Track who your patient has recognized
- **SOS Alerts** - Receive instant notifications with patient location

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| ML Service | Python FastAPI + DeepFace |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |

## 📁 Project Structure

```
imaginecup/
├── frontend/          # React + Vite app
├── backend/           # Express API server
├── ml-service/        # FastAPI face recognition
└── supabase/          # SQL migrations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account (free tier works)

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_storage_policies.sql`
3. Go to **Database > Extensions** and enable `vector`
4. Go to **Storage** and create buckets: `faces` and `voices`
5. Copy your project URL and keys from **Settings > API**

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase keys
npm install
npm run dev
```

### 3. ML Service Setup

```bash
cd ml-service
cp .env.example .env
# Edit .env with your Supabase keys
pip install -r requirements.txt
python app/main.py
```

### 4. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase anon key
npm install
npm run dev
```

### 5. Access the App

Open http://localhost:5173

## 🔐 Security Features

- **JWT Authentication** via Supabase Auth
- **Row Level Security (RLS)** on all tables
- **Role-based access** (patient vs caretaker)
- **Rate limiting** on API endpoints
- **IP logging** for abuse protection
- **Signed URLs** for secure file access
- **Environment variables** for all secrets

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/people` | List known people |
| POST | `/api/people` | Add person |
| POST | `/api/recognize` | Face recognition |
| POST | `/api/sos` | Send SOS alert |
| GET | `/api/sos` | List alerts |

## 🎨 Design System

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Teal | `#14B8A6` | Brand, buttons |
| Secondary Green | `#22C55E` | Success, accents |
| Background | `#F0FDFA` | Page backgrounds |
| Text | `#134E4A` | Primary text |

## 📱 Screenshots

> Add screenshots of your app here

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

Built with 💚 for the Microsoft Imagine Cup
