const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { location, message } = req.body;

        if (user.role !== 'patient') {
            return res.status(403).json({ error: 'Only patients can create SOS alerts' });
        }

        const { data, error } = await supabaseAdmin
            .from('sos_alerts')
            .insert({
                patient_id: user.id,
                location: location || null,
                message: message || null
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            message: 'SOS alert sent successfully',
            alert: data
        });
    } catch (err) {
        console.error('Create SOS error:', err);
        res.status(500).json({ error: 'Failed to send SOS alert' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { resolved, patient_id } = req.query;

        let query = supabaseAdmin
            .from('sos_alerts')
            .select('*, patient:patient_id(full_name, phone)')
            .order('created_at', { ascending: false });

        if (resolved !== undefined) {
            query = query.eq('resolved', resolved === 'true');
        }

        if (user.role === 'patient') {
            query = query.eq('patient_id', user.id);
        } else {
            if (patient_id) {
                const { data: patient } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('id', patient_id)
                    .eq('caretaker_id', user.id)
                    .single();

                if (!patient) {
                    return res.status(403).json({ error: 'Patient not assigned to you' });
                }
                query = query.eq('patient_id', patient_id);
            } else {
                const { data: patients } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('caretaker_id', user.id);

                const patientIds = patients?.map(p => p.id) || [];
                if (patientIds.length > 0) {
                    query = query.in('patient_id', patientIds);
                } else {
                    return res.json({ alerts: [] });
                }
            }
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ alerts: data });
    } catch (err) {
        console.error('Get SOS alerts error:', err);
        res.status(500).json({ error: 'Failed to fetch SOS alerts' });
    }
});

router.patch('/:id/resolve', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { id } = req.params;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can resolve SOS alerts' });
        }

        const { data: alert } = await supabaseAdmin
            .from('sos_alerts')
            .select('patient_id')
            .eq('id', id)
            .single();

        if (!alert) {
            return res.status(404).json({ error: 'SOS alert not found' });
        }

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', alert.patient_id)
            .eq('caretaker_id', user.id)
            .single();

        if (!patient) {
            return res.status(403).json({ error: 'Not authorized to resolve this alert' });
        }

        const { data, error } = await supabaseAdmin
            .from('sos_alerts')
            .update({
                resolved: true,
                resolved_by: user.id,
                resolved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({
            message: 'SOS alert resolved',
            alert: data
        });
    } catch (err) {
        console.error('Resolve SOS error:', err);
        res.status(500).json({ error: 'Failed to resolve SOS alert' });
    }
});

module.exports = router;
