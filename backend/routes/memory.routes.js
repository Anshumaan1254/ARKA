const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');
const { uploadBlob, uploadStream } = require('../config/azure-blob.config');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// Get all memories for a person
router.get('/person/:personId', async (req, res) => {
    try {
        const container = getContainer('memories');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: memories } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.personId = @personId ORDER BY c.createdAt DESC',
                parameters: [{ name: '@personId', value: req.params.personId }]
            })
            .fetchAll();

        res.json(memories);
    } catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({ error: 'Failed to get memories' });
    }
});

// Get single memory
router.get('/:id', async (req, res) => {
    try {
        const container = getContainer('memories');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: memories } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: req.params.id }]
            })
            .fetchAll();

        if (memories.length === 0) {
            return res.status(404).json({ error: 'Memory not found' });
        }

        res.json(memories[0]);
    } catch (error) {
        console.error('Get memory error:', error);
        res.status(500).json({ error: 'Failed to get memory' });
    }
});

// Create new memory (audio, video, image)
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { personId, type, description, textContent } = req.body;

        if (!personId) {
            return res.status(400).json({ error: 'personId is required' });
        }

        // Verify person exists and belongs to user
        const personsContainer = getContainer('persons');
        if (personsContainer) {
            const { resource: person } = await personsContainer.item(personId, req.user.userId).read();
            if (!person) {
                return res.status(404).json({ error: 'Person not found' });
            }
        }

        const memoryId = uuidv4();
        let mediaUrl = null;
        let memoryType = type || 'text';

        // Handle file upload
        if (req.file) {
            const extension = req.file.originalname.split('.').pop();
            const blobName = `memories/${personId}/${memoryId}.${extension}`;
            mediaUrl = await uploadBlob(blobName, req.file.buffer, req.file.mimetype);

            // Determine type from mimetype if not specified
            if (!type) {
                if (req.file.mimetype.startsWith('audio/')) {
                    memoryType = 'audio';
                } else if (req.file.mimetype.startsWith('video/')) {
                    memoryType = 'video';
                } else if (req.file.mimetype.startsWith('image/')) {
                    memoryType = 'image';
                }
            }
        }

        const memory = {
            id: memoryId,
            personId,
            userId: req.user.userId,
            type: memoryType,
            url: mediaUrl,
            description: description || '',
            textContent: textContent || '',
            playCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const container = getContainer('memories');
        if (container) {
            await container.items.create(memory);
        }

        // Also add memory reference to person
        if (personsContainer) {
            const { resource: person } = await personsContainer.item(personId, req.user.userId).read();
            if (person) {
                person.memories = person.memories || [];
                person.memories.push({
                    id: memoryId,
                    type: memoryType,
                    url: mediaUrl,
                    description: description || ''
                });
                await personsContainer.item(personId, req.user.userId).replace(person);
            }
        }

        res.status(201).json({
            message: 'Memory created successfully',
            memory
        });
    } catch (error) {
        console.error('Create memory error:', error);
        res.status(500).json({ error: 'Failed to create memory' });
    }
});

// Update memory
router.put('/:id', async (req, res) => {
    try {
        const { description, textContent } = req.body;

        const container = getContainer('memories');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: memories } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
                parameters: [
                    { name: '@id', value: req.params.id },
                    { name: '@userId', value: req.user.userId }
                ]
            })
            .fetchAll();

        if (memories.length === 0) {
            return res.status(404).json({ error: 'Memory not found' });
        }

        const memory = memories[0];
        memory.description = description ?? memory.description;
        memory.textContent = textContent ?? memory.textContent;
        memory.updatedAt = new Date().toISOString();

        await container.item(memory.id, memory.personId).replace(memory);

        res.json({
            message: 'Memory updated',
            memory
        });
    } catch (error) {
        console.error('Update memory error:', error);
        res.status(500).json({ error: 'Failed to update memory' });
    }
});

// Increment play count
router.post('/:id/played', async (req, res) => {
    try {
        const container = getContainer('memories');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: memories } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: req.params.id }]
            })
            .fetchAll();

        if (memories.length === 0) {
            return res.status(404).json({ error: 'Memory not found' });
        }

        const memory = memories[0];
        memory.playCount = (memory.playCount || 0) + 1;
        memory.lastPlayedAt = new Date().toISOString();

        await container.item(memory.id, memory.personId).replace(memory);

        res.json({
            message: 'Play count updated',
            playCount: memory.playCount
        });
    } catch (error) {
        console.error('Update play count error:', error);
        res.status(500).json({ error: 'Failed to update play count' });
    }
});

// Delete memory
router.delete('/:id', async (req, res) => {
    try {
        const container = getContainer('memories');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: memories } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
                parameters: [
                    { name: '@id', value: req.params.id },
                    { name: '@userId', value: req.user.userId }
                ]
            })
            .fetchAll();

        if (memories.length === 0) {
            return res.status(404).json({ error: 'Memory not found' });
        }

        const memory = memories[0];
        await container.item(memory.id, memory.personId).delete();

        // Remove from person's memories array
        const personsContainer = getContainer('persons');
        if (personsContainer) {
            const { resource: person } = await personsContainer.item(memory.personId, req.user.userId).read();
            if (person && person.memories) {
                person.memories = person.memories.filter(m => m.id !== memory.id);
                await personsContainer.item(person.id, req.user.userId).replace(person);
            }
        }

        res.json({ message: 'Memory deleted successfully' });
    } catch (error) {
        console.error('Delete memory error:', error);
        res.status(500).json({ error: 'Failed to delete memory' });
    }
});

// Get random memory for person (for memory flash)
router.get('/person/:personId/random', async (req, res) => {
    try {
        const container = getContainer('memories');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: memories } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.personId = @personId',
                parameters: [{ name: '@personId', value: req.params.personId }]
            })
            .fetchAll();

        if (memories.length === 0) {
            return res.status(404).json({ error: 'No memories found' });
        }

        const randomIndex = Math.floor(Math.random() * memories.length);
        res.json(memories[randomIndex]);
    } catch (error) {
        console.error('Get random memory error:', error);
        res.status(500).json({ error: 'Failed to get memory' });
    }
});

module.exports = router;
