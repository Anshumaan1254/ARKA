-- ARKA: Object Detection Schema
-- Stores custom descriptions for objects
-- When ML detects an object that's in this table, use custom description
-- Otherwise, use general ML-generated description

-- Object descriptions table
CREATE TABLE IF NOT EXISTS object_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  object_label TEXT NOT NULL,
  custom_description TEXT NOT NULL,
  audio_path TEXT,
  importance_level INTEGER DEFAULT 1 CHECK (importance_level BETWEEN 1 AND 5),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(patient_id, object_label)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_object_descriptions_patient_label 
  ON object_descriptions(patient_id, object_label);

-- Enable RLS
ALTER TABLE object_descriptions ENABLE ROW LEVEL SECURITY;

-- Patients can read their own object descriptions
CREATE POLICY "Patients read own objects" ON object_descriptions
  FOR SELECT USING (patient_id = auth.uid());

-- Caretakers can read their patients' object descriptions
CREATE POLICY "Caretakers read patient objects" ON object_descriptions
  FOR SELECT USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Caretakers can manage object descriptions
CREATE POLICY "Caretakers manage objects" ON object_descriptions
  FOR ALL USING (
    patient_id IN (SELECT id FROM profiles WHERE caretaker_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER object_descriptions_updated_at
  BEFORE UPDATE ON object_descriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Example entries for common objects
-- INSERT INTO object_descriptions (patient_id, object_label, custom_description, importance_level)
-- VALUES 
--   ('patient-uuid', 'medicine bottle', 'This is your heart medication. Take one pill every morning with breakfast.', 5),
--   ('patient-uuid', 'keys', 'These are your house keys. The silver one opens the front door.', 4),
--   ('patient-uuid', 'phone', 'This is your phone. Press the green button to call your daughter Sarah.', 5);
