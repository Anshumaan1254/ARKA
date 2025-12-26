const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');
const { isWithinGeofence, reverseGeocode, getDirections } = require('../config/google-maps.config');

router.use(authMiddleware);

router.get('/contacts', async (req, res) => {
    try {
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.sosContacts || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get contacts' });
    }
});

router.put('/contacts', async (req, res) => {
    try {
        const { contacts } = req.body;
        if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Contacts must be an array' });
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.sosContacts = contacts;
        user.updatedAt = new Date().toISOString();
        await container.item(user.id, user.id).replace(user);
        res.json({ message: 'SOS contacts updated', contacts: user.sosContacts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update contacts' });
    }
});

router.post('/alert', async (req, res) => {
    try {
        const { lat, long, message } = req.body;
        if (!lat || !long) return res.status(400).json({ error: 'Location is required' });
        let address = 'Unknown location';
        try {
            const geoResult = await reverseGeocode(lat, long);
            if (geoResult?.address) address = geoResult.address;
        } catch (e) { }
        const alert = {
            id: uuidv4(), userId: req.user.userId, type: 'sos',
            location: { lat, long }, address,
            message: message || 'Emergency SOS Alert', status: 'active',
            createdAt: new Date().toISOString(), resolvedAt: null
        };
        const container = getContainer('sosAlerts');
        if (container) await container.items.create(alert);
        res.status(201).json({ message: 'SOS alert triggered', alert });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger alert' });
    }
});

router.get('/alerts', async (req, res) => {
    try {
        const container = getContainer('sosAlerts');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resources: alerts } = await container.items.query({
            query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@userId', value: req.user.userId }]
        }).fetchAll();
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

router.post('/alerts/:id/resolve', async (req, res) => {
    try {
        const container = getContainer('sosAlerts');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: alert } = await container.item(req.params.id, req.user.userId).read();
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        await container.item(alert.id, req.user.userId).replace(alert);
        res.json({ message: 'Alert resolved', alert });
    } catch (error) {
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

router.post('/home-location', async (req, res) => {
    try {
        const { lat, long, radius } = req.body;
        if (!lat || !long) return res.status(400).json({ error: 'Location is required' });
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.settings = user.settings || {};
        user.settings.homeLocation = { lat, long };
        user.settings.geofenceRadius = radius || 500;
        user.updatedAt = new Date().toISOString();
        await container.item(user.id, user.id).replace(user);
        res.json({ message: 'Home location set', homeLocation: user.settings.homeLocation });
    } catch (error) {
        res.status(500).json({ error: 'Failed to set home location' });
    }
});

router.post('/check-geofence', async (req, res) => {
    try {
        const { lat, long } = req.body;
        if (!lat || !long) return res.status(400).json({ error: 'Location is required' });
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();
        if (!user?.settings?.homeLocation) return res.json({ withinGeofence: true, message: 'Home location not set' });
        const withinGeofence = isWithinGeofence(
            { lat, lng: long },
            { lat: user.settings.homeLocation.lat, lng: user.settings.homeLocation.long },
            user.settings.geofenceRadius || 500
        );
        res.json({ withinGeofence, homeLocation: user.settings.homeLocation });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check geofence' });
    }
});

router.post('/navigate-home', async (req, res) => {
    try {
        const { lat, long } = req.body;
        if (!lat || !long) return res.status(400).json({ error: 'Current location is required' });
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();
        if (!user?.settings?.homeLocation) return res.status(400).json({ error: 'Home location not set' });
        const directions = await getDirections(
            { lat, lng: long },
            { lat: user.settings.homeLocation.lat, lng: user.settings.homeLocation.long },
            'walking'
        );
        res.json(directions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get directions' });
    }
});

module.exports = router;
