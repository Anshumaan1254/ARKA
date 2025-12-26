const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');
const { uploadBlob } = require('../config/azure-blob.config');
const { detectObjects } = require('../config/azure-vision.config');

const upload = multer({ storage: multer.memoryStorage() });
router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const container = getContainer('items');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resources: items } = await container.items.query({
            query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.lastSeen.date DESC',
            parameters: [{ name: '@userId', value: req.user.userId }]
        }).fetchAll();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get items' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const container = getContainer('items');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: item } = await container.item(req.params.id, req.user.userId).read();
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get item' });
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, category, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        let imageUrl = null;
        if (req.file) {
            const blobName = `items/${req.user.userId}/${uuidv4()}.jpg`;
            imageUrl = await uploadBlob(blobName, req.file.buffer, req.file.mimetype);
        }
        const item = {
            id: uuidv4(), userId: req.user.userId, name,
            category: category || 'other', description: description || '',
            imageUrl, lastSeen: null,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        const container = getContainer('items');
        if (container) await container.items.create(item);
        res.status(201).json({ message: 'Item created', item });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create item' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const container = getContainer('items');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: item } = await container.item(req.params.id, req.user.userId).read();
        if (!item) return res.status(404).json({ error: 'Item not found' });
        item.name = name ?? item.name;
        item.category = category ?? item.category;
        item.description = description ?? item.description;
        item.updatedAt = new Date().toISOString();
        await container.item(item.id, req.user.userId).replace(item);
        res.json({ message: 'Item updated', item });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update item' });
    }
});

router.post('/:id/last-seen', upload.single('image'), async (req, res) => {
    try {
        const { lat, long, description } = req.body;
        const container = getContainer('items');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        const { resource: item } = await container.item(req.params.id, req.user.userId).read();
        if (!item) return res.status(404).json({ error: 'Item not found' });
        let imageUrl = null;
        if (req.file) {
            const blobName = `items/lastseen/${item.id}/${Date.now()}.jpg`;
            imageUrl = await uploadBlob(blobName, req.file.buffer, req.file.mimetype);
        }
        item.lastSeen = {
            date: new Date().toISOString(),
            location: lat && long ? { lat: parseFloat(lat), long: parseFloat(long) } : null,
            imageUrl, description: description || ''
        };
        item.updatedAt = new Date().toISOString();
        await container.item(item.id, req.user.userId).replace(item);
        res.json({ message: 'Last seen updated', lastSeen: item.lastSeen });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update last seen' });
    }
});

router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        const { imageBase64, imageUrl } = req.body;
        let url = imageUrl;
        if (req.file) {
            const blobName = `temp/${uuidv4()}.jpg`;
            url = await uploadBlob(blobName, req.file.buffer, req.file.mimetype);
        } else if (imageBase64) {
            const blobName = `temp/${uuidv4()}.jpg`;
            const buffer = Buffer.from(imageBase64, 'base64');
            url = await uploadBlob(blobName, buffer, 'image/jpeg');
        }
        if (!url) return res.status(400).json({ error: 'Image is required' });
        const objects = await detectObjects(url);
        const container = getContainer('items');
        let matchedItems = [];
        if (container && objects.objects) {
            const { resources: userItems } = await container.items.query({
                query: 'SELECT * FROM c WHERE c.userId = @userId',
                parameters: [{ name: '@userId', value: req.user.userId }]
            }).fetchAll();
            const detectedNames = objects.objects.map(o => o.object.toLowerCase());
            matchedItems = userItems.filter(item =>
                detectedNames.some(n => item.name.toLowerCase().includes(n) || n.includes(item.name.toLowerCase()))
            );
        }
        res.json({ detectedObjects: objects.objects || [], matchedItems });
    } catch (error) {
        res.status(500).json({ error: 'Detection failed' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const container = getContainer('items');
        if (!container) return res.status(503).json({ error: 'Database not available' });
        await container.item(req.params.id, req.user.userId).delete();
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

module.exports = router;
