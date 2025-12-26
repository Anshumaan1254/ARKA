// Azure Computer Vision API Configuration
// Documentation: https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/

const axios = require('axios');

const endpoint = process.env.AZURE_VISION_ENDPOINT;
const apiKey = process.env.AZURE_VISION_KEY;

const visionApiClient = axios.create({
    baseURL: endpoint,
    headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
    }
});

// Analyze image for objects, tags, and description
const analyzeImage = async (imageUrl) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Vision API not configured');
            return { objects: [], tags: [], mock: true };
        }

        const response = await visionApiClient.post('/vision/v3.2/analyze', {
            url: imageUrl
        }, {
            params: {
                visualFeatures: 'Objects,Tags,Description,Faces',
                language: 'en'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Image analysis error:', error.message);
        throw error;
    }
};

// Analyze image from base64
const analyzeImageFromBase64 = async (base64Image) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Vision API not configured');
            return { objects: [], tags: [], mock: true };
        }

        const imageBuffer = Buffer.from(base64Image, 'base64');

        const response = await axios.post(
            `${endpoint}/vision/v3.2/analyze`,
            imageBuffer,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'Content-Type': 'application/octet-stream'
                },
                params: {
                    visualFeatures: 'Objects,Tags,Description,Faces',
                    language: 'en'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Image analysis from base64 error:', error.message);
        throw error;
    }
};

// Detect objects in image
const detectObjects = async (imageUrl) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Vision API not configured');
            return { objects: [], mock: true };
        }

        const response = await visionApiClient.post('/vision/v3.2/detect', {
            url: imageUrl
        });

        return response.data;
    } catch (error) {
        console.error('Object detection error:', error.message);
        throw error;
    }
};

// Read text from image (OCR)
const readText = async (imageUrl) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Vision API not configured');
            return { text: '', mock: true };
        }

        const response = await visionApiClient.post('/vision/v3.2/read/analyze', {
            url: imageUrl
        });

        const operationLocation = response.headers['operation-location'];

        // Poll for results
        let result;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await axios.get(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': apiKey }
            });
        } while (result.data.status === 'running');

        return result.data;
    } catch (error) {
        console.error('Read text error:', error.message);
        throw error;
    }
};

// Get image tags
const getImageTags = async (imageUrl) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Vision API not configured');
            return { tags: [], mock: true };
        }

        const response = await visionApiClient.post('/vision/v3.2/tag', {
            url: imageUrl
        });

        return response.data;
    } catch (error) {
        console.error('Get image tags error:', error.message);
        throw error;
    }
};

// Describe image
const describeImage = async (imageUrl) => {
    try {
        if (!endpoint || !apiKey) {
            console.warn('Azure Vision API not configured');
            return { description: '', mock: true };
        }

        const response = await visionApiClient.post('/vision/v3.2/describe', {
            url: imageUrl
        }, {
            params: { maxCandidates: 3 }
        });

        return response.data;
    } catch (error) {
        console.error('Describe image error:', error.message);
        throw error;
    }
};

module.exports = {
    analyzeImage,
    analyzeImageFromBase64,
    detectObjects,
    readText,
    getImageTags,
    describeImage
};
