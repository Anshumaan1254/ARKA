const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const axios = require('axios');

const authMiddleware = require('../middleware/auth.middleware');
const { getContainer } = require('../config/azure-cosmos.config');
const { uploadBlob } = require('../config/azure-blob.config');
const { detectFacesFromBase64, identifyFaces } = require('../config/azure-face.config');
const { analyzeImageFromBase64 } = require('../config/azure-vision.config');

const upload = multer({ storage: multer.memoryStorage() });
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.use(authMiddleware);

router.post('/detect-change', upload.single('frame'), async (req, res) => {
    try {
        const { frameBase64, previousFrameBase64 } = req.body;
        let currentFrame = frameBase64;
        if (req.file) currentFrame = req.file.buffer.toString('base64');
        if (!currentFrame) return res.status(400).json({ error: 'Frame is required' });

        // Call ML service for frame change detection
        try {
            const mlResponse = await axios.post(`${ML_SERVICE_URL}/frame/detect-change`, {
                current_frame: currentFrame, previous_frame: previousFrameBase64
            }, { timeout: 10000 });
            res.json(mlResponse.data);
        } catch (mlError) {
            res.json({ changeDetected: true, confidence: 0.5, message: 'ML service unavailable, assuming change' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Frame detection failed' });
    }
});

router.post('/process', upload.single('frame'), async (req, res) => {
    try {
        const { frameBase64, lat, long, confidenceThreshold = 0.8 } = req.body;
        let frameData = frameBase64;
        if (req.file) frameData = req.file.buffer.toString('base64');
        if (!frameData) return res.status(400).json({ error: 'Frame is required' });

        const result = { facesDetected: [], objectsDetected: [], recognizedPersons: [], updatedPersons: [] };

        // Detect faces
        const faces = await detectFacesFromBase64(frameData);
        if (faces && !faces.mock && faces.length > 0) {
            result.facesDetected = faces.map(f => ({ faceId: f.faceId, age: f.faceAttributes?.age, gender: f.faceAttributes?.gender }));

            // Identify faces
            const personGroupId = `user_${req.user.userId}`;
            const faceIds = faces.map(f => f.faceId);
            try {
                const identifyResults = await identifyFaces(personGroupId, faceIds, 1, parseFloat(confidenceThreshold));
                if (identifyResults && !identifyResults.mock) {
                    const container = getContainer('persons');
                    for (const ir of identifyResults) {
                        if (ir.candidates?.length > 0) {
                            const candidate = ir.candidates[0];
                            if (container) {
                                const { resources: persons } = await container.items.query({
                                    query: 'SELECT * FROM c WHERE c.azureFacePersonId = @azurePersonId AND c.userId = @userId',
                                    parameters: [
                                        { name: '@azurePersonId', value: candidate.personId },
                                        { name: '@userId', value: req.user.userId }
                                    ]
                                }).fetchAll();
                                if (persons.length > 0) {
                                    const person = persons[0];
                                    result.recognizedPersons.push({ ...person, confidence: candidate.confidence });

                                    // Update last seen
                                    let imageUrl = null;
                                    try {
                                        const blobName = `lastseen/${person.id}/${Date.now()}.jpg`;
                                        const buffer = Buffer.from(frameData, 'base64');
                                        imageUrl = await uploadBlob(blobName, buffer, 'image/jpeg');
                                    } catch (e) { }

                                    person.lastSeen = {
                                        date: new Date().toISOString(),
                                        location: lat && long ? { lat: parseFloat(lat), long: parseFloat(long) } : null,
                                        imageUrl, confidence: candidate.confidence
                                    };
                                    person.updatedAt = new Date().toISOString();
                                    await container.item(person.id, req.user.userId).replace(person);
                                    result.updatedPersons.push(person.id);
                                }
                            }
                        }
                    }
                }
            } catch (e) { }
        }

        // Analyze for objects
        try {
            const analysis = await analyzeImageFromBase64(frameData);
            if (analysis?.objects) result.objectsDetected = analysis.objects;
        } catch (e) { }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Frame processing failed' });
    }
});

router.post('/recognize-command', upload.array('frames', 5), async (req, res) => {
    try {
        const { framesBase64 } = req.body;
        let frames = framesBase64 ? JSON.parse(framesBase64) : [];
        if (req.files?.length) frames = req.files.map(f => f.buffer.toString('base64'));
        if (!frames.length) return res.status(400).json({ error: 'At least one frame is required' });

        const allFaces = [];
        for (const frame of frames.slice(0, 3)) {
            try {
                const faces = await detectFacesFromBase64(frame);
                if (faces && !faces.mock) allFaces.push(...faces);
            } catch (e) { }
        }
        if (!allFaces.length) return res.json({ recognized: false, message: 'No faces detected' });

        const personGroupId = `user_${req.user.userId}`;
        const faceIds = allFaces.slice(0, 10).map(f => f.faceId);
        const identifyResults = await identifyFaces(personGroupId, faceIds, 1, 0.6);

        if (!identifyResults || identifyResults.mock || !identifyResults.length) {
            return res.json({ recognized: false, isNewPerson: true, faceCount: allFaces.length });
        }

        const container = getContainer('persons');
        for (const ir of identifyResults) {
            if (ir.candidates?.length > 0 && container) {
                const { resources: persons } = await container.items.query({
                    query: 'SELECT * FROM c WHERE c.azureFacePersonId = @azurePersonId AND c.userId = @userId',
                    parameters: [
                        { name: '@azurePersonId', value: ir.candidates[0].personId },
                        { name: '@userId', value: req.user.userId }
                    ]
                }).fetchAll();
                if (persons.length > 0) {
                    return res.json({ recognized: true, person: persons[0], confidence: ir.candidates[0].confidence });
                }
            }
        }
        res.json({ recognized: false, isNewPerson: true, faceCount: allFaces.length });
    } catch (error) {
        res.status(500).json({ error: 'Recognition failed' });
    }
});

module.exports = router;
