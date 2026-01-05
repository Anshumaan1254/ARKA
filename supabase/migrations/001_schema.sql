-- ARKA: Alzheimer's Care Platform Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'caretaker')),
  full_name TEXT NOT NULL,
  phone TEXT,
  caretaker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- People (known faces for recognition)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  face_embedding VECTOR(512),
  image_path TEXT,
  notes TEXT,
  last_seen_at TIMESTAMPTZ,
  last_seen_location JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice memories attached to people
CREATE TABLE IF NOT EXISTS voice_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  audio_path TEXT NOT NULL,
  description TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recognition event logs
CREATE TABLE IF NOT EXISTS recognition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  confidence REAL,
  matched BOOLEAN DEFAULT FALSE,
  image_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS emergency alerts
CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location JSONB,
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_patient ON people(patient_id);
CREATE INDEX IF NOT EXISTS idx_people_embedding ON people USING ivfflat (face_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_voice_memories_person ON voice_memories(person_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_patient ON recognition_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_created ON recognition_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_patient ON sos_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_unresolved ON sos_alerts(patient_id) WHERE resolved = FALSE;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read their own profile
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Profiles: Caretakers can read their assigned patients
CREATE POLICY "Caretakers read assigned patients" ON profiles
  FOR SELECT USING (caretaker_id = auth.uid());

-- Profiles: Users can update their own profile
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- People: Patients see their own people
CREATE POLICY "Patients read own people" ON people
  FOR SELECT USING (patient_id = auth.uid());

-- People: Caretakers see their assigned patients' people
CREATE POLICY "Caretakers read assigned patients people" ON people
  FOR SELECT USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- People: Caretakers can insert people for their patients
CREATE POLICY "Caretakers insert people" ON people
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- People: Caretakers can update people for their patients
CREATE POLICY "Caretakers update people" ON people
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- People: Caretakers can delete people for their patients
CREATE POLICY "Caretakers delete people" ON people
  FOR DELETE USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Voice memories: Access via people relationship
CREATE POLICY "Read voice memories" ON voice_memories
  FOR SELECT USING (
    person_id IN (
      SELECT id FROM people WHERE 
        patient_id = auth.uid() OR 
        patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
    )
  );

-- Voice memories: Caretakers can manage
CREATE POLICY "Caretakers manage voice memories" ON voice_memories
  FOR ALL USING (
    person_id IN (
      SELECT id FROM people WHERE 
        patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
    )
  );

-- Recognition logs: Patients see their own logs
CREATE POLICY "Patients read own logs" ON recognition_logs
  FOR SELECT USING (patient_id = auth.uid());

-- Recognition logs: Caretakers see their patients' logs
CREATE POLICY "Caretakers read patients logs" ON recognition_logs
  FOR SELECT USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- SOS: Patients can create their own alerts
CREATE POLICY "Patients create SOS" ON sos_alerts
  FOR INSERT WITH CHECK (patient_id = auth.uid());

-- SOS: Patients can read their own alerts
CREATE POLICY "Patients read own SOS" ON sos_alerts
  FOR SELECT USING (patient_id = auth.uid());

-- SOS: Caretakers can read and update their patients' alerts
CREATE POLICY "Caretakers manage SOS" ON sos_alerts
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Storage buckets setup (run in Supabase Dashboard or via API)
-- Bucket: faces - for face images
-- Bucket: voices - for voice memory audio files
