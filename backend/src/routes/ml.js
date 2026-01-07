const express = require('express')
const router = express.Router()
const axios = require('axios')
const FormData = require('form-data')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
})

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

// Helper to forward form data to ML service
async function forwardToML(endpoint, formData, timeout = 30000) {
    return axios.post(
        `${ML_SERVICE_URL}${endpoint}`,
        formData,
        {
            headers: formData.getHeaders(),
            timeout
        }
    )
}

// ============================================
// OBJECT DETECTION
// ============================================

router.post('/detect-objects', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image provided' })
        }

        const formData = new FormData()
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'image.jpg',
            contentType: req.file.mimetype
        })

        if (req.user?.id) {
            formData.append('patient_id', req.user.id)
        }

        const mlResponse = await forwardToML('/detect-objects', formData)

        res.json({
            success: true,
            objects: mlResponse.data.objects || []
        })

    } catch (error) {
        console.error('Object detection error:', error.message)
        res.status(500).json({ success: false, error: 'Object detection failed' })
    }
})

// ============================================
// FACE REGISTRATION
// ============================================

router.post('/register', upload.single('file'), async (req, res) => {
    try {
        const { person_id, patient_id } = req.body

        if (!req.file || !person_id) {
            return res.status(400).json({ success: false, error: 'Missing file or person_id' })
        }

        const formData = new FormData()
        formData.append('person_id', person_id)
        formData.append('patient_id', patient_id || req.user?.id)
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'face.jpg',
            contentType: req.file.mimetype
        })

        const mlResponse = await forwardToML('/register', formData, 60000)
        res.json(mlResponse.data)

    } catch (error) {
        console.error('Registration error:', error.message)
        res.status(500).json({ success: false, error: 'Face registration failed' })
    }
})

// ============================================
// VOICE UPLOAD
// ============================================

router.post('/upload-voice', upload.single('file'), async (req, res) => {
    try {
        const { person_id, description, is_primary } = req.body

        if (!req.file || !person_id) {
            return res.status(400).json({ success: false, error: 'Missing file or person_id' })
        }

        const formData = new FormData()
        formData.append('person_id', person_id)
        formData.append('description', description || 'Voice memory')
        formData.append('is_primary', is_primary || 'true')
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'voice.webm',
            contentType: req.file.mimetype
        })

        const mlResponse = await forwardToML('/upload-voice', formData)
        res.json(mlResponse.data)

    } catch (error) {
        console.error('Voice upload error:', error.message)
        res.status(500).json({ success: false, error: 'Voice upload failed' })
    }
})

// ============================================
// ADVANCED AI FEATURES
// ============================================

// Get available features
router.get('/features', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/features`, { timeout: 5000 })
        res.json(response.data)
    } catch (error) {
        res.json({
            gemini_context: false,
            voice_cloning: false,
            anomaly_detection: false,
            face_recognition: false,
            object_detection: false
        })
    }
})

// ============ LIVING MEMORY GRAPH ============

// Generate context-aware greeting
router.post('/generate-context', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            formData.append(key, value)
        })

        const mlResponse = await forwardToML('/generate-context', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Context generation error:', error.message)
        res.json({ success: true, context: 'This is someone you know.' })
    }
})

// Add memory event
router.post('/add-memory-event', async (req, res) => {
    try {
        console.log('Add memory event request:', req.body)

        const formData = new FormData()
        const { patient_id, event_type, event_date, title, description, emotional_tone, created_by, person_id } = req.body

        if (!patient_id || !event_type || !event_date || !title) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: patient_id, event_type, event_date, title'
            })
        }

        formData.append('patient_id', patient_id)
        formData.append('event_type', event_type)
        formData.append('event_date', event_date)
        formData.append('title', title)
        if (description) formData.append('description', description)
        if (emotional_tone) formData.append('emotional_tone', emotional_tone)
        if (created_by) formData.append('created_by', created_by)
        if (person_id) formData.append('person_id', person_id)

        const mlResponse = await forwardToML('/add-memory-event', formData)
        console.log('ML response:', mlResponse.data)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Add memory event error:', error.message)
        res.status(500).json({ success: false, error: 'Failed to add memory event: ' + error.message })
    }
})

// List memory events
router.get('/memory-events/:patient_id', async (req, res) => {
    try {
        const { patient_id } = req.params
        const { person_id, limit } = req.query

        let url = `${ML_SERVICE_URL}/memory-events/${patient_id}`
        const params = new URLSearchParams()
        if (person_id) params.append('person_id', person_id)
        if (limit) params.append('limit', limit)
        if (params.toString()) url += `?${params.toString()}`

        const response = await axios.get(url, { timeout: 10000 })
        res.json(response.data)
    } catch (error) {
        console.error('List memory events error:', error.message)
        res.json({ success: true, events: [], count: 0 })
    }
})

// ============ VOICE CLONING ============

// Upload voice sample for cloning
router.post('/upload-voice-sample', upload.single('file'), async (req, res) => {
    try {
        const { person_id, patient_id, created_by } = req.body

        if (!req.file || !person_id) {
            return res.status(400).json({ success: false, error: 'Missing file or person_id' })
        }

        const formData = new FormData()
        formData.append('person_id', person_id)
        formData.append('patient_id', patient_id || req.user?.id)
        if (created_by) formData.append('created_by', created_by)
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'voice.wav',
            contentType: req.file.mimetype
        })

        const mlResponse = await forwardToML('/upload-voice-sample', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Voice sample upload error:', error.message)
        res.status(500).json({ success: false, error: 'Voice sample upload failed' })
    }
})

// Generate speech with cloned voice
router.post('/speak', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            formData.append(key, String(value))
        })

        const mlResponse = await forwardToML('/speak', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Speak error:', error.message)
        res.json({ success: true, text: req.body.text, voice_used: 'browser_tts' })
    }
})

// ============ ANOMALY DETECTION ============

// Ingest telemetry data
router.post('/ingest-telemetry', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value))
            }
        })

        const mlResponse = await forwardToML('/ingest-telemetry', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Telemetry ingestion error:', error.message)
        res.status(500).json({ success: false, error: 'Telemetry ingestion failed' })
    }
})

// Check for anomaly
router.post('/check-anomaly', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            formData.append(key, String(value))
        })

        const mlResponse = await forwardToML('/check-anomaly', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Anomaly check error:', error.message)
        res.json({ success: true, is_anomaly: false })
    }
})

// Train anomaly model
router.post('/train-anomaly-model', async (req, res) => {
    try {
        const formData = new FormData()
        formData.append('patient_id', req.body.patient_id)

        const mlResponse = await forwardToML('/train-anomaly-model', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Model training error:', error.message)
        res.status(500).json({ success: false, error: 'Model training failed' })
    }
})

// List anomaly alerts
router.get('/anomaly-alerts/:patient_id', async (req, res) => {
    try {
        const { patient_id } = req.params
        const { unacknowledged_only, limit } = req.query

        let url = `${ML_SERVICE_URL}/anomaly-alerts/${patient_id}`
        const params = new URLSearchParams()
        if (unacknowledged_only) params.append('unacknowledged_only', unacknowledged_only)
        if (limit) params.append('limit', limit)
        if (params.toString()) url += `?${params.toString()}`

        const response = await axios.get(url, { timeout: 10000 })
        res.json(response.data)
    } catch (error) {
        console.error('List alerts error:', error.message)
        res.json({ success: true, alerts: [], count: 0 })
    }
})

// Acknowledge alert
router.post('/acknowledge-alert', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value))
            }
        })

        const mlResponse = await forwardToML('/acknowledge-alert', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Acknowledge alert error:', error.message)
        res.status(500).json({ success: false, error: 'Failed to acknowledge alert' })
    }
})

// Generate soothing message
router.post('/generate-soothing-message', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            if (value) formData.append(key, value)
        })

        const mlResponse = await forwardToML('/generate-soothing-message', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Soothing message error:', error.message)
        res.json({ success: true, message: 'Everything is okay. You are safe.' })
    }
})

// ============================================
// VOICE CLONING (Bark TTS)
// ============================================

// Speak text with voice synthesis
router.post('/speak', async (req, res) => {
    try {
        const formData = new FormData()
        Object.entries(req.body).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value))
            }
        })

        const mlResponse = await forwardToML('/speak', formData, 60000) // Longer timeout for TTS
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Speak error:', error.message)
        res.json({ success: false, error: 'Speech generation failed', fallback: true })
    }
})

// Upload voice sample
router.post('/upload-voice-sample', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No audio file provided' })
        }

        const formData = new FormData()
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'voice_sample.wav',
            contentType: req.file.mimetype || 'audio/wav'
        })

        Object.entries(req.body).forEach(([key, value]) => {
            if (value) formData.append(key, value)
        })

        const mlResponse = await forwardToML('/upload-voice-sample', formData)
        res.json(mlResponse.data)
    } catch (error) {
        console.error('Upload voice sample error:', error.message)
        res.status(500).json({ success: false, error: 'Failed to upload voice sample' })
    }
})

// Get available voices
router.get('/available-voices', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/available-voices`, { timeout: 5000 })
        res.json(response.data)
    } catch (error) {
        console.error('Available voices error:', error.message)
        res.json({ success: false, voices: [] })
    }
})

module.exports = router

