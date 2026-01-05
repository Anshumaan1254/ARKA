const express = require('express');
const axios = require('axios');
const multer = require('multer');
const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;

        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        let patientId = user.id;

        if (user.role === 'caretaker' && req.body.patient_id) {
            const { data: patient } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', req.body.patient_id)
                .eq('caretaker_id', user.id)
                .single();

            if (!patient) {
                return res.status(403).json({ error: 'Patient not assigned to you' });
            }
            patientId = req.body.patient_id;
        }

        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        formData.append('patient_id', patientId);

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/recognize`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        const result = mlResponse.data;

        await supabaseAdmin
            .from('recognition_logs')
            .insert({
                patient_id: patientId,
                person_id: result.person_id || null,
                confidence: result.confidence || null,
                matched: result.status === 'success'
            });

        if (result.status === 'success' && result.person_id) {
            await supabaseAdmin
                .from('people')
                .update({
                    last_seen_at: new Date().toISOString()
                })
                .eq('id', result.person_id);
        }

        res.json(result);
    } catch (err) {
        console.error('Recognition error:', err.message);

        if (err.code === 'ECONNREFUSED') {
            return res.status(503).json({ error: 'ML service unavailable' });
        }

        res.status(500).json({ error: 'Face recognition failed' });
    }
});

router.get('/logs', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { limit = 50, patient_id } = req.query;

        let query = supabaseAdmin
            .from('recognition_logs')
            .select('*, person:person_id(name)')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (user.role === 'patient') {
            query = query.eq('patient_id', user.id);
        } else if (patient_id) {
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
            query = query.in('patient_id', patientIds);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ logs: data });
    } catch (err) {
        console.error('Get logs error:', err);
        res.status(500).json({ error: 'Failed to fetch recognition logs' });
    }
});

module.exports = router;
