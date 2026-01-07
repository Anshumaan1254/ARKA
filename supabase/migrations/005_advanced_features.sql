-- ARKA Advanced AI Features Schema
-- Migration 005: Living Memory Graph, Voice Cloning, Anomaly Detection
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. LIVING MEMORY GRAPH - Memory Events Table
-- ============================================
-- Stores life events, visits, activities for contextual narratives

CREATE TABLE IF NOT EXISTS memory_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'call', 'activity', 'milestone', 'medical', 'other')),
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  emotional_tone TEXT CHECK (emotional_tone IN ('happy', 'neutral', 'sad', 'exciting', 'peaceful')),
  location TEXT,
  participants TEXT[], -- Array of names who participated
  photos TEXT[], -- Array of storage paths
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast retrieval of recent events
CREATE INDEX IF NOT EXISTS idx_memory_events_patient_date ON memory_events(patient_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_memory_events_person ON memory_events(person_id);

-- ============================================
-- 2. FAMILY VOICE CLONING - Voice Samples Table
-- ============================================
-- Stores voice samples for TTS cloning

CREATE TABLE IF NOT EXISTS voice_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  audio_path TEXT NOT NULL, -- Path to the voice sample in storage
  duration_seconds REAL, -- Duration of the sample
  quality_score REAL, -- 0-1 quality rating from ML analysis
  is_active BOOLEAN DEFAULT TRUE, -- Whether to use this sample
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_voice_samples_person ON voice_samples(person_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_patient ON voice_samples(patient_id);

-- ============================================
-- 3. PREDICTIVE SENTINEL - Health Telemetry Table
-- ============================================
-- Stores real-time health/sensor data for anomaly detection

CREATE TABLE IF NOT EXISTS health_telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heart_rate INTEGER, -- BPM
  walking_speed REAL, -- meters per second
  location JSONB, -- {lat, lng}
  location_diff REAL, -- Distance from home/safe zone in meters
  activity_level TEXT CHECK (activity_level IN ('resting', 'low', 'moderate', 'high', 'extreme')),
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening', 'night'
  is_inside_safe_zone BOOLEAN DEFAULT TRUE,
  device_id TEXT, -- Source device identifier
  raw_data JSONB -- Additional sensor data
);

-- Partition-friendly index for time-series queries
CREATE INDEX IF NOT EXISTS idx_health_telemetry_patient_time ON health_telemetry(patient_id, recorded_at DESC);

-- ============================================
-- 4. PREDICTIVE SENTINEL - Anomaly Alerts Table
-- ============================================
-- Stores predicted wandering/panic events

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('wandering', 'panic', 'fall', 'irregular_heart', 'unusual_activity')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence REAL NOT NULL, -- 0-1 confidence score
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  telemetry_snapshot JSONB, -- The data that triggered the alert
  prediction_reason TEXT, -- Human-readable explanation
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  action_taken TEXT,
  false_positive BOOLEAN, -- Feedback for model improvement
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_patient ON anomaly_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_unacked ON anomaly_alerts(patient_id) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_time ON anomaly_alerts(triggered_at DESC);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;

-- Memory Events: Patients see their own, Caretakers see their patients'
CREATE POLICY "Patients read own memory events" ON memory_events
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Caretakers manage memory events" ON memory_events
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Voice Samples: Caretakers manage, Patients can read
CREATE POLICY "Patients read voice samples" ON voice_samples
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Caretakers manage voice samples" ON voice_samples
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Health Telemetry: Patients can insert own, Caretakers can read
CREATE POLICY "Patients insert own telemetry" ON health_telemetry
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients read own telemetry" ON health_telemetry
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Caretakers read patient telemetry" ON health_telemetry
  FOR SELECT USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Anomaly Alerts: Patients see own, Caretakers manage
CREATE POLICY "Patients read own alerts" ON anomaly_alerts
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Caretakers manage alerts" ON anomaly_alerts
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to get recent memory events for a person (for Gemini context)
CREATE OR REPLACE FUNCTION get_recent_memories(p_patient_id UUID, p_person_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  event_type TEXT,
  event_date DATE,
  title TEXT,
  description TEXT,
  emotional_tone TEXT,
  days_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.event_type,
    me.event_date,
    me.title,
    me.description,
    me.emotional_tone,
    (CURRENT_DATE - me.event_date)::INTEGER as days_ago
  FROM memory_events me
  WHERE me.patient_id = p_patient_id
    AND (me.person_id = p_person_id OR p_person_id IS NULL)
    AND me.event_date <= CURRENT_DATE
  ORDER BY me.event_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest telemetry for anomaly check
CREATE OR REPLACE FUNCTION get_latest_telemetry(p_patient_id UUID, p_minutes INTEGER DEFAULT 30)
RETURNS TABLE (
  heart_rate INTEGER,
  walking_speed REAL,
  location_diff REAL,
  time_of_day TEXT,
  is_inside_safe_zone BOOLEAN,
  telemetry_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ht.heart_rate,
    ht.walking_speed,
    ht.location_diff,
    ht.time_of_day,
    ht.is_inside_safe_zone,
    ht.recorded_at AS telemetry_time
  FROM health_telemetry ht
  WHERE ht.patient_id = p_patient_id
    AND ht.recorded_at >= NOW() - (p_minutes || ' minutes')::INTERVAL
  ORDER BY ht.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER memory_events_updated_at
  BEFORE UPDATE ON memory_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
