-- ARKA: Geofencing Schema
-- Safe zones for patients with breach alerts

-- Safe zones table
CREATE TABLE IF NOT EXISTS safe_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  notify_on_exit BOOLEAN DEFAULT TRUE,
  notify_on_enter BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence breach logs
CREATE TABLE IF NOT EXISTS geofence_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES safe_zones(id) ON DELETE SET NULL,
  breach_type TEXT NOT NULL CHECK (breach_type IN ('exit', 'enter')),
  location JSONB NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient location history (for tracking)
CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safe_zones_patient ON safe_zones(patient_id);
CREATE INDEX IF NOT EXISTS idx_geofence_breaches_patient ON geofence_breaches(patient_id);
CREATE INDEX IF NOT EXISTS idx_geofence_breaches_unack ON geofence_breaches(patient_id) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_location_history_patient ON location_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_location_history_time ON location_history(created_at DESC);

-- Enable RLS
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- RLS: Safe zones
CREATE POLICY "Patients read own zones" ON safe_zones
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Caretakers manage zones" ON safe_zones
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- RLS: Geofence breaches
CREATE POLICY "Patients read own breaches" ON geofence_breaches
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Caretakers manage breaches" ON geofence_breaches
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- RLS: Location history
CREATE POLICY "Patients read own location" ON location_history
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients insert own location" ON location_history
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Caretakers read patient locations" ON location_history
  FOR SELECT USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER safe_zones_updated_at
  BEFORE UPDATE ON safe_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to check if point is within zone
CREATE OR REPLACE FUNCTION is_within_zone(
  point_lat DOUBLE PRECISION,
  point_lng DOUBLE PRECISION,
  zone_lat DOUBLE PRECISION,
  zone_lng DOUBLE PRECISION,
  radius_m INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  earth_radius_m CONSTANT INTEGER := 6371000;
  distance_m DOUBLE PRECISION;
BEGIN
  -- Haversine formula
  distance_m := earth_radius_m * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(point_lat - zone_lat) / 2), 2) +
      COS(RADIANS(zone_lat)) * COS(RADIANS(point_lat)) *
      POWER(SIN(RADIANS(point_lng - zone_lng) / 2), 2)
    )
  );
  RETURN distance_m <= radius_m;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
