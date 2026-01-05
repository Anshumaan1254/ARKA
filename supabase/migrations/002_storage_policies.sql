-- ARKA: Storage Bucket Setup for Supabase
-- Run this AFTER creating the main schema

-- Create storage buckets
-- Note: This should be done via Supabase Dashboard or API
-- Go to Storage > Create new bucket

-- Bucket 1: faces
-- - Public or Private: Private (for face images)
-- - Allowed file types: image/jpeg, image/png, image/webp
-- - Max file size: 5MB

-- Bucket 2: voices  
-- - Public or Private: Private (for voice memories)
-- - Allowed file types: audio/webm, audio/mp3, audio/wav, audio/mpeg
-- - Max file size: 10MB

-- Storage RLS Policies (run in SQL Editor)

-- Policy for faces bucket: Users can read their own or assigned patients' faces
CREATE POLICY "Users can view faces" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'faces' AND (
      -- Owner (caretaker who uploaded)
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Patient themselves  
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Caretaker of patient
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id::text = (storage.foldername(name))[1] 
        AND caretaker_id = auth.uid()
      )
    )
  );

-- Policy for faces bucket: Caretakers can upload faces
CREATE POLICY "Caretakers can upload faces" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'faces' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id::text = (storage.foldername(name))[1] 
      AND caretaker_id = auth.uid()
    )
  );

-- Policy for faces bucket: Caretakers can delete faces
CREATE POLICY "Caretakers can delete faces" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'faces' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id::text = (storage.foldername(name))[1] 
      AND caretaker_id = auth.uid()
    )
  );

-- Policy for voices bucket: Users can view voices
CREATE POLICY "Users can view voices" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'voices' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id::text = (storage.foldername(name))[1] 
        AND caretaker_id = auth.uid()
      )
    )
  );

-- Policy for voices bucket: Caretakers can upload voices
CREATE POLICY "Caretakers can upload voices" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'voices' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id::text = (storage.foldername(name))[1] 
      AND caretaker_id = auth.uid()
    )
  );

-- Policy for voices bucket: Caretakers can delete voices
CREATE POLICY "Caretakers can delete voices" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'voices' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id::text = (storage.foldername(name))[1] 
      AND caretaker_id = auth.uid()
    )
  );
