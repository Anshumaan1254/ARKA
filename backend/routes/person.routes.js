const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');
const { uploadBlob } = require('../config/azure-blob.config');
const {
    detectFacesFromBase64,
    createPersonGroup,
    addPersonToGroup,
    addFaceToPerson,
    trainPersonGroup,
    identifyFaces,
    getPerson
} = require('../config/azure-face.config');

const upload = multer({ storage: multer.memoryStorage() });

// Apply auth to all routes
router.use(authMiddleware);

// Get all persons for user
router.get('/', async (req, res) => {
    try {
        const container = getContainer('persons');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resources: persons } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.name ASC',
                parameters: [{ name: '@userId', value: req.user.userId }]
            })
            .fetchAll();

        res.json(persons);
    } catch (error) {
        console.error('Get persons error:', error);
        res.status(500).json({ error: 'Failed to get persons' });
    }
});

// Get single person
router.get('/:id', async (req, res) => {
    try {
        const container = getContainer('persons');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: person } = await container.item(req.params.id, req.user.userId).read();

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        res.json(person);
    } catch (error) {
        console.error('Get person error:', error);
        res.status(500).json({ error: 'Failed to get person' });
    }
});

// Create new person with face registration
router.post('/', upload.array('images', 5), async (req, res) => {
    try {
        const { name, relation, voiceDescription } = req.body;

        if (!name || !relation) {
            return res.status(400).json({ error: 'Name and relation are required' });
        }

        const personId = uuidv4();
        const personGroupId = `user_${req.user.userId}`;

        // Create person group if not exists (first person for user)
        try {
            await createPersonGroup(personGroupId, `Persons for ${req.user.userId}`);
        } catch (e) {
            // Group may already exist
        }

        // Add person to Azure Face group
        let azurePersonId = null;
        try {
            const azurePerson = await addPersonToGroup(personGroupId, name, personId);
            azurePersonId = azurePerson.personId;

            // Add faces from uploaded images
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const blobName = `faces/${personId}/${uuidv4()}.jpg`;
                    const imageUrl = await uploadBlob(blobName, file.buffer, file.mimetype);
                    await addFaceToPerson(personGroupId, azurePersonId, imageUrl);
                }
                // Train the model after adding faces
                await trainPersonGroup(personGroupId);
            }
        } catch (e) {
            console.warn('Face registration skipped:', e.message);
        }

        const person = {
            id: personId,
            userId: req.user.userId,
            name,
            relation,
            azureFacePersonId: azurePersonId,
            voiceDescription: voiceDescription || '',
            memories: [],
            lastSeen: null,
            medicineSchedule: [],
            sosContacts: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const container = getContainer('persons');
        if (container) {
            await container.items.create(person);
        }

        res.status(201).json({
            message: 'Person created successfully',
            person
        });
    } catch (error) {
        console.error('Create person error:', error);
        res.status(500).json({ error: 'Failed to create person' });
    }
});

// Update person
router.put('/:id', async (req, res) => {
    try {
        const { name, relation, voiceDescription, medicineSchedule, sosContacts } = req.body;

        const container = getContainer('persons');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: person } = await container.item(req.params.id, req.user.userId).read();

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        person.name = name ?? person.name;
        person.relation = relation ?? person.relation;
        person.voiceDescription = voiceDescription ?? person.voiceDescription;
        person.medicineSchedule = medicineSchedule ?? person.medicineSchedule;
        person.sosContacts = sosContacts ?? person.sosContacts;
        person.updatedAt = new Date().toISOString();

        await container.item(person.id, req.user.userId).replace(person);

        res.json({
            message: 'Person updated',
            person
        });
    } catch (error) {
        console.error('Update person error:', error);
        res.status(500).json({ error: 'Failed to update person' });
    }
});

// Add face to existing person
router.post('/:id/faces', upload.array('images', 5), async (req, res) => {
    try {
        const container = getContainer('persons');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: person } = await container.item(req.params.id, req.user.userId).read();

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const personGroupId = `user_${req.user.userId}`;
        const addedFaces = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const blobName = `faces/${person.id}/${uuidv4()}.jpg`;
                const imageUrl = await uploadBlob(blobName, file.buffer, file.mimetype);

                if (person.azureFacePersonId) {
                    await addFaceToPerson(personGroupId, person.azureFacePersonId, imageUrl);
                }
                addedFaces.push(imageUrl);
            }

            if (person.azureFacePersonId) {
                await trainPersonGroup(personGroupId);
            }
        }

        res.json({
            message: 'Faces added successfully',
            addedFaces
        });
    } catch (error) {
        console.error('Add faces error:', error);
        res.status(500).json({ error: 'Failed to add faces' });
    }
});

// Recognize person from image
router.post('/recognize', upload.single('image'), async (req, res) => {
    try {
        const { imageBase64 } = req.body;

        let imageData = imageBase64;
        if (req.file) {
            imageData = req.file.buffer.toString('base64');
        }

        if (!imageData) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // Detect faces
        const faces = await detectFacesFromBase64(imageData);

        if (!faces || faces.length === 0 || faces.mock) {
            return res.json({
                recognized: false,
                message: 'No faces detected or Face API not configured'
            });
        }

        const faceIds = faces.map(f => f.faceId);
        const personGroupId = `user_${req.user.userId}`;

        // Identify faces
        const identifyResults = await identifyFaces(personGroupId, faceIds, 1, 0.8);

        if (!identifyResults || identifyResults.length === 0 || identifyResults.mock) {
            return res.json({
                recognized: false,
                message: 'No match found'
            });
        }

        const recognizedPersons = [];
        const container = getContainer('persons');

        for (const result of identifyResults) {
            if (result.candidates && result.candidates.length > 0) {
                const candidate = result.candidates[0];

                // Get person from Azure
                const azurePerson = await getPerson(personGroupId, candidate.personId);

                // Get person from database
                if (container) {
                    const { resources: persons } = await container.items
                        .query({
                            query: 'SELECT * FROM c WHERE c.azureFacePersonId = @azurePersonId AND c.userId = @userId',
                            parameters: [
                                { name: '@azurePersonId', value: candidate.personId },
                                { name: '@userId', value: req.user.userId }
                            ]
                        })
                        .fetchAll();

                    if (persons.length > 0) {
                        recognizedPersons.push({
                            ...persons[0],
                            confidence: candidate.confidence
                        });
                    }
                }
            }
        }

        res.json({
            recognized: recognizedPersons.length > 0,
            persons: recognizedPersons,
            faceCount: faces.length
        });
    } catch (error) {
        console.error('Recognize error:', error);
        res.status(500).json({ error: 'Recognition failed' });
    }
});

// Update last seen for person
router.post('/:id/last-seen', async (req, res) => {
    try {
        const { lat, long, confidence, imageBase64 } = req.body;

        const container = getContainer('persons');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { resource: person } = await container.item(req.params.id, req.user.userId).read();

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Upload last seen image if provided
        let imageUrl = null;
        if (imageBase64) {
            const blobName = `lastseen/${person.id}/${Date.now()}.jpg`;
            const imageBuffer = Buffer.from(imageBase64, 'base64');
            imageUrl = await uploadBlob(blobName, imageBuffer, 'image/jpeg');
        }

        person.lastSeen = {
            date: new Date().toISOString(),
            location: { lat, long },
            imageUrl,
            confidence: confidence || 0
        };
        person.updatedAt = new Date().toISOString();

        await container.item(person.id, req.user.userId).replace(person);

        res.json({
            message: 'Last seen updated',
            lastSeen: person.lastSeen
        });
    } catch (error) {
        console.error('Update last seen error:', error);
        res.status(500).json({ error: 'Failed to update last seen' });
    }
});

// Delete person
router.delete('/:id', async (req, res) => {
    try {
        const container = getContainer('persons');

        if (!container) {
            return res.status(503).json({ error: 'Database not available' });
        }

        await container.item(req.params.id, req.user.userId).delete();

        res.json({ message: 'Person deleted successfully' });
    } catch (error) {
        console.error('Delete person error:', error);
        res.status(500).json({ error: 'Failed to delete person' });
    }
});

module.exports = router;
