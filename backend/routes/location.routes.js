const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');
const { reverseGeocode, getDistance } = require('../config/google-maps.config');

router.use(authMiddleware);

router.post('/update', async (req, res) => {
    try {
        const { lat, long, accuracy, speed, heading } = req.body;
        if (!lat || !long) return res.status(400).json({ error: 'Location is required' });

        let address = null;
        try {
            const geoResult = await reverseGeocode(lat, long);
            if (geoResult?.address) address = geoResult.address;
        } catch (e) { }

        const locationEntry = {
            id: uuidv4(), userId: req.user.userId,
            location: { lat, long }, address,
            accuracy: accuracy || null, speed: speed || null, heading: heading || null,
            timestamp: new Date().toISOString()
        };

        const container = getContainer('locations');
        if (container) await container.items.create(locationEntry);
        res.json({ message: 'Location updated', location: locationEntry });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update location' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const { hours = 24, limit = 100 } = req.query;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const container = getContainer('locations');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resources: locations } = await container.items.query({
            query: 'SELECT TOP @limit * FROM c WHERE c.userId = @userId AND c.timestamp >= @since ORDER BY c.timestamp DESC',
            parameters: [
                { name: '@userId', value: req.user.userId },
                { name: '@since', value: since },
                { name: '@limit', value: parseInt(limit) }
            ]
        }).fetchAll();
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get location history' });
    }
});

router.get('/current', async (req, res) => {
    try {
        const container = getContainer('locations');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resources: locations } = await container.items.query({
            query: 'SELECT TOP 1 * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC',
            parameters: [{ name: '@userId', value: req.user.userId }]
        }).fetchAll();
        if (!locations.length) return res.status(404).json({ error: 'No location data' });
        res.json(locations[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get current location' });
    }
});

router.post('/distance-from-home', async (req, res) => {
    try {
        const { lat, long } = req.body;
        if (!lat || !long) return res.status(400).json({ error: 'Location is required' });
        const usersContainer = getContainer('users');
        if (!usersContainer) return res.status(503).json({ error: 'Database not available' });
        const { resource: user } = await usersContainer.item(req.user.userId, req.user.userId).read();
        if (!user?.settings?.homeLocation) return res.status(400).json({ error: 'Home location not set' });

        const distance = await getDistance(
            { lat, lng: long },
            { lat: user.settings.homeLocation.lat, lng: user.settings.homeLocation.long }
        );
        res.json({ distance: distance?.distance, duration: distance?.duration, homeLocation: user.settings.homeLocation });
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate distance' });
    }
});

router.get('/nearby-persons', async (req, res) => {
    try {
        const { lat, long, radiusMeters = 1000 } = req.query;
        if (!lat || !long) return res.status(400).json({ error: 'Location is required' });
        const container = getContainer('persons');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resources: persons } = await container.items.query({
            query: 'SELECT * FROM c WHERE c.userId = @userId AND c.lastSeen != null',
            parameters: [{ name: '@userId', value: req.user.userId }]
        }).fetchAll();

        const nearby = persons.filter(p => {
            if (!p.lastSeen?.location) return false;
            const R = 6371000;
            const dLat = (p.lastSeen.location.lat - parseFloat(lat)) * Math.PI / 180;
            const dLng = (p.lastSeen.location.long - parseFloat(long)) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(parseFloat(lat) * Math.PI / 180) * Math.cos(p.lastSeen.location.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return dist <= parseFloat(radiusMeters);
        });
        res.json(nearby);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get nearby persons' });
    }
});

module.exports = router;
