const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;

        let query = supabaseAdmin
            .from('people')
            .select('*, voice_memories(id, audio_path, description, is_primary)')
            .order('updated_at', { ascending: false });

        if (user.role === 'patient') {
            query = query.eq('patient_id', user.id);
        } else {
            const { data: patients } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('caretaker_id', user.id);

            const patientIds = patients?.map(p => p.id) || [];
            query = query.in('patient_id', patientIds);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ people: data });
    } catch (err) {
        console.error('Get people error:', err);
        res.status(500).json({ error: 'Failed to fetch people' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('people')
            .select('*, voice_memories(*)')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Person not found' });
        }

        if (user.role === 'patient' && data.patient_id !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ person: data });
    } catch (err) {
        console.error('Get person error:', err);
        res.status(500).json({ error: 'Failed to fetch person' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { patient_id, name, relationship, notes } = req.body;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can add people' });
        }

        if (!patient_id || !name) {
            return res.status(400).json({ error: 'Patient ID and name are required' });
        }

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', patient_id)
            .eq('caretaker_id', user.id)
            .single();

        if (!patient) {
            return res.status(403).json({ error: 'Patient not assigned to you' });
        }

        const { data, error } = await supabaseAdmin
            .from('people')
            .insert({
                patient_id,
                name,
                relationship,
                notes,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ person: data });
    } catch (err) {
        console.error('Create person error:', err);
        res.status(500).json({ error: 'Failed to create person' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { id } = req.params;
        const { name, relationship, notes } = req.body;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can update people' });
        }

        const { data: existing } = await supabaseAdmin
            .from('people')
            .select('patient_id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', existing.patient_id)
            .eq('caretaker_id', user.id)
            .single();

        if (!patient) {
            return res.status(403).json({ error: 'Not authorized to update this person' });
        }

        const updates = {};
        if (name) updates.name = name;
        if (relationship !== undefined) updates.relationship = relationship;
        if (notes !== undefined) updates.notes = notes;

        const { data, error } = await supabaseAdmin
            .from('people')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ person: data });
    } catch (err) {
        console.error('Update person error:', err);
        res.status(500).json({ error: 'Failed to update person' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { id } = req.params;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can delete people' });
        }

        const { data: existing } = await supabaseAdmin
            .from('people')
            .select('patient_id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', existing.patient_id)
            .eq('caretaker_id', user.id)
            .single();

        if (!patient) {
            return res.status(403).json({ error: 'Not authorized to delete this person' });
        }

        const { error } = await supabaseAdmin
            .from('people')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: 'Person deleted successfully' });
    } catch (err) {
        console.error('Delete person error:', err);
        res.status(500).json({ error: 'Failed to delete person' });
    }
});

module.exports = router;
