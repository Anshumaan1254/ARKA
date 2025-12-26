// Azure Face API Configuration
// Documentation: https://docs.microsoft.com/en-us/azure/cognitive-services/face/

const axios = require('axios');

const endpoint = process.env.AZURE_FACE_ENDPOINT;
const apiKey = process.env.AZURE_FACE_KEY;

const faceApiClient = axios.create({
    baseURL: endpoint,
    headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
    }
});

// Detect faces in an image
const detectFaces = async (imageUrl) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Face API not configured');
            return { faces: [], mock: true };
        }

        const response = await faceApiClient.post('/face/v1.0/detect', {
            url: imageUrl
        }, {
            params: {
                returnFaceId: true,
                returnFaceLandmarks: false,
                returnFaceAttributes: 'age,gender,emotion',
                recognitionModel: 'recognition_04',
                detectionModel: 'detection_03'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Face detection error:', error.message);
        throw error;
    }
};

// Detect faces from base64 image
const detectFacesFromBase64 = async (base64Image) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Face API not configured');
            return { faces: [], mock: true };
        }

        const imageBuffer = Buffer.from(base64Image, 'base64');

        const response = await axios.post(
            `${endpoint}/face/v1.0/detect`,
            imageBuffer,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'Content-Type': 'application/octet-stream'
                },
                params: {
                    returnFaceId: true,
                    returnFaceLandmarks: false,
                    returnFaceAttributes: 'age,gender,emotion',
                    recognitionModel: 'recognition_04',
                    detectionModel: 'detection_03'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Face detection from base64 error:', error.message);
        throw error;
    }
};

// Create a person group for face identification
const createPersonGroup = async (personGroupId, name) => {
    try {
        await faceApiClient.put(`/face/v1.0/persongroups/${personGroupId}`, {
            name: name,
            recognitionModel: 'recognition_04'
        });
        return { success: true, personGroupId };
    } catch (error) {
        console.error('Create person group error:', error.message);
        throw error;
    }
};

// Add a person to a person group
const addPersonToGroup = async (personGroupId, name, userData = '') => {
    try {
        const response = await faceApiClient.post(
            `/face/v1.0/persongroups/${personGroupId}/persons`,
            { name, userData }
        );
        return response.data;
    } catch (error) {
        console.error('Add person to group error:', error.message);
        throw error;
    }
};

// Add face to a person
const addFaceToPerson = async (personGroupId, personId, imageUrl) => {
    try {
        const response = await faceApiClient.post(
            `/face/v1.0/persongroups/${personGroupId}/persons/${personId}/persistedFaces`,
            { url: imageUrl }
        );
        return response.data;
    } catch (error) {
        console.error('Add face to person error:', error.message);
        throw error;
    }
};

// Train person group
const trainPersonGroup = async (personGroupId) => {
    try {
        await faceApiClient.post(`/face/v1.0/persongroups/${personGroupId}/train`);
        return { success: true, message: 'Training started' };
    } catch (error) {
        console.error('Train person group error:', error.message);
        throw error;
    }
};

// Check training status
const getTrainingStatus = async (personGroupId) => {
    try {
        const response = await faceApiClient.get(
            `/face/v1.0/persongroups/${personGroupId}/training`
        );
        return response.data;
    } catch (error) {
        console.error('Get training status error:', error.message);
        throw error;
    }
};

// Identify faces
const identifyFaces = async (personGroupId, faceIds, maxCandidates = 1, confidenceThreshold = 0.8) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Face API not configured');
            return { candidates: [], mock: true };
        }

        const response = await faceApiClient.post('/face/v1.0/identify', {
            personGroupId,
            faceIds,
            maxNumOfCandidatesReturned: maxCandidates,
            confidenceThreshold
        });

        return response.data;
    } catch (error) {
        console.error('Identify faces error:', error.message);
        throw error;
    }
};

// Get person info
const getPerson = async (personGroupId, personId) => {
    try {
        const response = await faceApiClient.get(
            `/face/v1.0/persongroups/${personGroupId}/persons/${personId}`
        );
        return response.data;
    } catch (error) {
        console.error('Get person error:', error.message);
        throw error;
    }
};

module.exports = {
    detectFaces,
    detectFacesFromBase64,
    createPersonGroup,
    addPersonToGroup,
    addFaceToPerson,
    trainPersonGroup,
    getTrainingStatus,
    identifyFaces,
    getPerson
};
