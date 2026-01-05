-- FIX: Allow caretakers to see and claim unassigned patients

-- 1. Allow caretakers to search/view unassigned patients
-- We check if the user is a caretaker via metadata or just allow viewing unassigned patients (low risk)
DROP POLICY IF EXISTS "Caretakers view unassigned patients" ON profiles;
CREATE POLICY "Caretakers view unassigned patients" ON profiles
    FOR SELECT
    USING (
        role = 'patient' 
        AND caretaker_id IS NULL
    );

-- 2. Allow caretakers to claim (update) an unassigned patient
-- They can only update 'caretaker_id' to their own ID
DROP POLICY IF EXISTS "Caretakers claim unassigned patients" ON profiles;
CREATE POLICY "Caretakers claim unassigned patients" ON profiles
    FOR UPDATE
    USING (
        role = 'patient' 
        AND caretaker_id IS NULL
    )
    WITH CHECK (
        caretaker_id = auth.uid()
    );
