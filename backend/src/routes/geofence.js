const express = require('express');
const router = express.Router();

// Create safe zone
router.post('/zones', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { patient_id, name, center_lat, center_lng, radius_meters = 100 } = req.body;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can create safe zones' });
        }

        if (!patient_id || !name || !center_lat || !center_lng) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify patient assignment
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
            .from('safe_zones')
            .insert({
                patient_id,
                name,
                center_lat,
                center_lng,
                radius_meters,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ zone: data });
    } catch (err) {
        console.error('Create zone error:', err);
        res.status(500).json({ error: 'Failed to create safe zone' });
    }
});

// List safe zones for patient
router.get('/zones/:patientId', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { patientId } = req.params;

        // Verify access
        if (user.role === 'patient' && user.id !== patientId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (user.role === 'caretaker') {
            const { data: patient } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', patientId)
                .eq('caretaker_id', user.id)
                .single();

            if (!patient) {
                return res.status(403).json({ error: 'Patient not assigned to you' });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('safe_zones')
            .select('*')
            .eq('patient_id', patientId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ zones: data });
    } catch (err) {
        console.error('List zones error:', err);
        res.status(500).json({ error: 'Failed to fetch safe zones' });
    }
});

// Delete safe zone
router.delete('/zones/:zoneId', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { zoneId } = req.params;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can delete zones' });
        }

        const { error } = await supabaseAdmin
            .from('safe_zones')
            .delete()
            .eq('id', zoneId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: 'Zone deleted' });
    } catch (err) {
        console.error('Delete zone error:', err);
        res.status(500).json({ error: 'Failed to delete zone' });
    }
});

// Check location against safe zones
router.post('/check-location', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { lat, lng, accuracy } = req.body;

        if (user.role !== 'patient') {
            return res.status(403).json({ error: 'Only patients can check location' });
        }

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }

        // Save location to history
        await supabaseAdmin
            .from('location_history')
            .insert({
                patient_id: user.id,
                lat,
                lng,
                accuracy
            });

        // Get active safe zones
        const { data: zones } = await supabaseAdmin
            .from('safe_zones')
            .select('*')
            .eq('patient_id', user.id)
            .eq('is_active', true);

        if (!zones || zones.length === 0) {
            return res.json({
                in_safe_zone: true,
                message: 'No safe zones configured'
            });
        }

        // Check if in any safe zone using Haversine
        let inSafeZone = false;
        let currentZone = null;

        for (const zone of zones) {
            const distance = haversineDistance(
                lat, lng,
                zone.center_lat, zone.center_lng
            );

            if (distance <= zone.radius_meters) {
                inSafeZone = true;
                currentZone = zone;
                break;
            }
        }

        // If outside all safe zones, create breach alert
        if (!inSafeZone) {
            await supabaseAdmin
                .from('geofence_breaches')
                .insert({
                    patient_id: user.id,
                    breach_type: 'exit',
                    location: { lat, lng, accuracy }
                });

            // Also create SOS alert
            await supabaseAdmin
                .from('sos_alerts')
                .insert({
                    patient_id: user.id,
                    location: { lat, lng },
                    message: 'Patient left safe zone'
                });
        }

        res.json({
            in_safe_zone: inSafeZone,
            current_zone: currentZone?.name || null,
            location: { lat, lng }
        });
    } catch (err) {
        console.error('Check location error:', err);
        res.status(500).json({ error: 'Failed to check location' });
    }
});

// Get breach alerts
router.get('/breaches', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { acknowledged, patient_id } = req.query;

        let query = supabaseAdmin
            .from('geofence_breaches')
            .select('*, zone:zone_id(name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (acknowledged !== undefined) {
            query = query.eq('acknowledged', acknowledged === 'true');
        }

        if (user.role === 'patient') {
            query = query.eq('patient_id', user.id);
        } else if (patient_id) {
            query = query.eq('patient_id', patient_id);
        } else {
            const { data: patients } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('caretaker_id', user.id);

            const patientIds = patients?.map(p => p.id) || [];
            if (patientIds.length > 0) {
                query = query.in('patient_id', patientIds);
            }
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ breaches: data });
    } catch (err) {
        console.error('Get breaches error:', err);
        res.status(500).json({ error: 'Failed to fetch breaches' });
    }
});

// Acknowledge breach
router.patch('/breaches/:id/acknowledge', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { id } = req.params;

        if (user.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can acknowledge breaches' });
        }

        const { data, error } = await supabaseAdmin
            .from('geofence_breaches')
            .update({
                acknowledged: true,
                acknowledged_by: user.id,
                acknowledged_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ breach: data });
    } catch (err) {
        console.error('Acknowledge breach error:', err);
        res.status(500).json({ error: 'Failed to acknowledge breach' });
    }
});

// Get location history
router.get('/history/:patientId', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { patientId } = req.params;
        const { limit = 100 } = req.query;

        if (user.role === 'patient' && user.id !== patientId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (user.role === 'caretaker') {
            const { data: patient } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', patientId)
                .eq('caretaker_id', user.id)
                .single();

            if (!patient) {
                return res.status(403).json({ error: 'Patient not assigned to you' });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('location_history')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ history: data });
    } catch (err) {
        console.error('Get history error:', err);
        res.status(500).json({ error: 'Failed to fetch location history' });
    }
});

// Haversine formula for distance calculation
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = router;
