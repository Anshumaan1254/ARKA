const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { getAzureAdConfig, generateDevToken } = require('../config/azure-auth.config');
const { getContainer } = require('../config/azure-cosmos.config');

// Get Azure AD B2C configuration for client
router.get('/config', (req, res) => {
    const config = getAzureAdConfig();
    res.json(config);
});

// Development-only: Register/Login for testing without Azure AD B2C
// Remove these endpoints in production
router.post('/dev/register', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    try {
        const { email, password, name, phone } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const container = getContainer('users');

        if (container) {
            const { resources: existingUsers } = await container.items
                .query({
                    query: 'SELECT * FROM c WHERE c.email = @email',
                    parameters: [{ name: '@email', value: email }]
                })
                .fetchAll();

            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'User already exists' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: uuidv4(),
            email,
            password: hashedPassword,
            name,
            phone: phone || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: { confidenceThreshold: 0.8, geofenceRadius: 500, homeLocation: null }
        };

        if (container) await container.items.create(user);

        const token = generateDevToken(user.id, user.email);

        res.status(201).json({
            message: 'User registered (dev mode)',
            user: { id: user.id, email: user.email, name: user.name },
            token
        });
    } catch (error) {
        console.error('Dev registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/dev/login', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });

        const { resources: users } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.email = @email',
                parameters: [{ name: '@email', value: email }]
            })
            .fetchAll();

        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateDevToken(user.id, user.email);

        res.json({
            message: 'Login successful (dev mode)',
            user: { id: user.id, email: user.email, name: user.name },
            token
        });
    } catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile (works with Azure AD B2C token)
router.get('/profile', require('../middleware/auth.middleware'), async (req, res) => {
    try {
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });

        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();

        if (!user) {
            // Create user profile from Azure AD B2C claims if not exists
            const newUser = {
                id: req.user.userId,
                email: req.user.email,
                name: req.user.name || req.user.email?.split('@')[0] || 'User',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                settings: { confidenceThreshold: 0.8, geofenceRadius: 500, homeLocation: null }
            };
            await container.items.create(newUser);
            return res.json(newUser);
        }

        res.json({
            id: user.id, email: user.email, name: user.name,
            phone: user.phone, settings: user.settings, createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user settings
router.put('/settings', require('../middleware/auth.middleware'), async (req, res) => {
    try {
        const { confidenceThreshold, geofenceRadius, homeLocation } = req.body;
        const container = getContainer('users');
        if (!container) return res.status(503).json({ error: 'Database not available' });

        const { resource: user } = await container.item(req.user.userId, req.user.userId).read();
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.settings = {
            ...user.settings,
            confidenceThreshold: confidenceThreshold ?? user.settings?.confidenceThreshold ?? 0.8,
            geofenceRadius: geofenceRadius ?? user.settings?.geofenceRadius ?? 500,
            homeLocation: homeLocation ?? user.settings?.homeLocation
        };
        user.updatedAt = new Date().toISOString();

        await container.item(user.id, user.id).replace(user);
        res.json({ message: 'Settings updated', settings: user.settings });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
