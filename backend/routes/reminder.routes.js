const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');

router.use(authMiddleware);

// Get all reminders for user
router.get('/', async (req, res) => {
    try {
        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: reminders } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.time ASC',
                parameters: [{ name: '@userId', value: req.user.userId }]
            })
            .fetchAll();

        res.json(reminders);
    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).json({ error: 'Failed to get reminders' });
    }
});

// Get reminders for a specific time window
router.get('/upcoming', async (req, res) => {
    try {
        const { minutes = 60 } = req.query;

        const now = new Date();
        const upcoming = new Date(now.getTime() + minutes * 60000);

        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: reminders } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.userId = @userId AND c.isActive = true ORDER BY c.time ASC',
                parameters: [{ name: '@userId', value: req.user.userId }]
            })
            .fetchAll();

        // Filter by time window (considering daily schedule)
        const currentTime = now.toTimeString().slice(0, 5);
        const upcomingTime = upcoming.toTimeString().slice(0, 5);

        const upcomingReminders = reminders.filter(r => {
            return r.time >= currentTime && r.time <= upcomingTime;
        });

        res.json(upcomingReminders);
    } catch (error) {
        console.error('Get upcoming reminders error:', error);
        res.status(500).json({ error: 'Failed to get reminders' });
    }
});

// Get single reminder
router.get('/:id', async (req, res) => {
    try {
        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: reminder } = await container.item(req.params.id, req.user.userId).read();

        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        res.json(reminder);
    } catch (error) {
        console.error('Get reminder error:', error);
        res.status(500).json({ error: 'Failed to get reminder' });
    }
});

// Create new reminder
router.post('/', async (req, res) => {
    try {
        const {
            type,
            time,
            medicineName,
            dose,
            description,
            repeatDays,
            personId
        } = req.body;

        if (!type || !time) {
            return res.status(400).json({ error: 'Type and time are required' });
        }

        const reminder = {
            id: uuidv4(),
            userId: req.user.userId,
            type, // 'medicine', 'activity', 'memory_trigger'
            time, // Format: "HH:mm"
            medicineName: medicineName || null,
            dose: dose || null,
            description: description || '',
            repeatDays: repeatDays || [0, 1, 2, 3, 4, 5, 6], // All days by default
            personId: personId || null, // For memory triggers
            isActive: true,
            lastTriggered: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const container = getContainer('reminders');
        if (container) {
            await container.items.create(reminder);
        }

        res.status(201).json({
            message: 'Reminder created successfully',
            reminder
        });
    } catch (error) {
        console.error('Create reminder error:', error);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
});

// Create medicine reminder
router.post('/medicine', async (req, res) => {
    try {
        const { medicineName, dose, time, repeatDays } = req.body;

        if (!medicineName || !dose || !time) {
            return res.status(400).json({ error: 'Medicine name, dose, and time are required' });
        }

        const reminder = {
            id: uuidv4(),
            userId: req.user.userId,
            type: 'medicine',
            time,
            medicineName,
            dose,
            description: `Take ${medicineName} (${dose})`,
            repeatDays: repeatDays || [0, 1, 2, 3, 4, 5, 6],
            isActive: true,
            lastTriggered: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const container = getContainer('reminders');
        if (container) {
            await container.items.create(reminder);
        }

        res.status(201).json({
            message: 'Medicine reminder created successfully',
            reminder
        });
    } catch (error) {
        console.error('Create medicine reminder error:', error);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
});

// Update reminder
router.put('/:id', async (req, res) => {
    try {
        const { time, medicineName, dose, description, repeatDays, isActive } = req.body;

        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: reminder } = await container.item(req.params.id, req.user.userId).read();

        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        reminder.time = time ?? reminder.time;
        reminder.medicineName = medicineName ?? reminder.medicineName;
        reminder.dose = dose ?? reminder.dose;
        reminder.description = description ?? reminder.description;
        reminder.repeatDays = repeatDays ?? reminder.repeatDays;
        reminder.isActive = isActive ?? reminder.isActive;
        reminder.updatedAt = new Date().toISOString();

        await container.item(reminder.id, req.user.userId).replace(reminder);

        res.json({
            message: 'Reminder updated',
            reminder
        });
    } catch (error) {
        console.error('Update reminder error:', error);
        res.status(500).json({ error: 'Failed to update reminder' });
    }
});

// Mark reminder as triggered
router.post('/:id/triggered', async (req, res) => {
    try {
        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: reminder } = await container.item(req.params.id, req.user.userId).read();

        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        reminder.lastTriggered = new Date().toISOString();
        await container.item(reminder.id, req.user.userId).replace(reminder);

        // Log the trigger
        const logsContainer = getContainer('activityLogs');
        if (logsContainer) {
            await logsContainer.items.create({
                id: uuidv4(),
                userId: req.user.userId,
                type: 'reminder_triggered',
                reminderId: reminder.id,
                reminderType: reminder.type,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            message: 'Reminder marked as triggered',
            lastTriggered: reminder.lastTriggered
        });
    } catch (error) {
        console.error('Mark triggered error:', error);
        res.status(500).json({ error: 'Failed to mark as triggered' });
    }
});

// Toggle reminder active status
router.post('/:id/toggle', async (req, res) => {
    try {
        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: reminder } = await container.item(req.params.id, req.user.userId).read();

        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        reminder.isActive = !reminder.isActive;
        reminder.updatedAt = new Date().toISOString();

        await container.item(reminder.id, req.user.userId).replace(reminder);

        res.json({
            message: `Reminder ${reminder.isActive ? 'activated' : 'deactivated'}`,
            isActive: reminder.isActive
        });
    } catch (error) {
        console.error('Toggle reminder error:', error);
        res.status(500).json({ error: 'Failed to toggle reminder' });
    }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
    try {
        const container = getContainer('reminders');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        await container.item(req.params.id, req.user.userId).delete();

        res.json({ message: 'Reminder deleted successfully' });
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});

module.exports = router;
