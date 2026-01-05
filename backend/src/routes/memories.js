const express = require('express');
const router = express.Router();

router.get('/:personId', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { personId } = req.params;

        const { data: person } = await supabaseAdmin
            .from('people')
            .select('patient_id')
            .eq('id', personId)
            .single();

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        if (user.role === 'patient' && person.patient_id !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (user.role === 'caretaker') {
            const { data: patient } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', person.patient_id)
                .eq('caretaker_id', user.id)
                .single();

            if (!patient) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('voice_memories')
            .select('*')
            .eq('person_id', personId)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ memories: data });
    } catch (err) {
        console.error('Get memories error:', err);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { person_id, audio_path, description, is_primary = false } = req.body;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can add memories' });
        }

        if (!person_id || !audio_path) {
            return res.status(400).json({ error: 'Person ID and audio path are required' });
        }

        const { data: person } = await supabaseAdmin
            .from('people')
            .select('patient_id')
            .eq('id', person_id)
            .single();

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', person.patient_id)
            .eq('caretaker_id', user.id)
            .single();

        if (!patient) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (is_primary) {
            await supabaseAdmin
                .from('voice_memories')
                .update({ is_primary: false })
                .eq('person_id', person_id);
        }

        const { data, error } = await supabaseAdmin
            .from('voice_memories')
            .insert({
                person_id,
                audio_path,
                description,
                is_primary,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ memory: data });
    } catch (err) {
        console.error('Create memory error:', err);
        res.status(500).json({ error: 'Failed to create memory' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { id } = req.params;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can delete memories' });
        }

        const { data: memory } = await supabaseAdmin
            .from('voice_memories')
            .select('person_id')
            .eq('id', id)
            .single();

        if (!memory) {
            return res.status(404).json({ error: 'Memory not found' });
        }

        const { data: person } = await supabaseAdmin
            .from('people')
            .select('patient_id')
            .eq('id', memory.person_id)
            .single();

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', person.patient_id)
            .eq('caretaker_id', user.id)
            .single();

        if (!patient) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabaseAdmin
            .from('voice_memories')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: 'Memory deleted successfully' });
    } catch (err) {
        console.error('Delete memory error:', err);
        res.status(500).json({ error: 'Failed to delete memory' });
    }
});

module.exports = router;
