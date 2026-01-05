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

// Object detection endpoint
router.post('/detect-objects', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image provided' })
        }

        // Forward to ML service
        const formData = new FormData()
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'image.jpg',
            contentType: req.file.mimetype
        })

        // Include patient_id if available for custom descriptions
        if (req.user?.id) {
            formData.append('patient_id', req.user.id)
        }

        const mlResponse = await axios.post(
            `${ML_SERVICE_URL}/detect-objects`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 30000
            }
        )

        res.json({
            success: true,
            objects: mlResponse.data.objects || []
        })

    } catch (error) {
        console.error('Object detection error:', error.message)
        res.status(500).json({
            success: false,
            error: 'Object detection failed'
        })
    }
})

// Face registration (already exists in ml.js but adding here for completeness)
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

        const mlResponse = await axios.post(
            `${ML_SERVICE_URL}/register`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 60000
            }
        )

        res.json(mlResponse.data)

    } catch (error) {
        console.error('Registration error:', error.message)
        res.status(500).json({
            success: false,
            error: 'Face registration failed'
        })
    }
})

// Voice upload
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

        const mlResponse = await axios.post(
            `${ML_SERVICE_URL}/upload-voice`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 30000
            }
        )

        res.json(mlResponse.data)

    } catch (error) {
        console.error('Voice upload error:', error.message)
        res.status(500).json({
            success: false,
            error: 'Voice upload failed'
        })
    }
})

module.exports = router
