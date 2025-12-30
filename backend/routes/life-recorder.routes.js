/**
 * ARKA - Life Recorder Routes
 * AI-curated digital life documentation for Alzheimer's patients
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Store for life records
let lifeRecords = [];

/**
 * POST /api/recorder/capture-moment
 * AI-detected important moment capture
 */
router.post('/capture-moment', async (req, res) => {
    try {
        const { userId, imageBase64, audioBase64, transcript, location, detectedPeople } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        // Ask ML service to analyze and score the moment
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/recorder/analyze-moment`, {
            image_base64: imageBase64,
            audio_base64: audioBase64,
            transcript: transcript,
            location: location,
            detected_people: detectedPeople
        });

        const analysis = mlResponse.data;

        // Only store significant moments
        if (analysis.significance_score > 0.3) {
            const record = {
                id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                timestamp: new Date().toISOString(),
                type: analysis.moment_type,
                significance: analysis.significance_score,
                people: detectedPeople || [],
                location: location,
                description: analysis.auto_description,
                emotions: analysis.detected_emotions,
                tags: analysis.auto_tags,
                mediaUrls: {
                    image: '', // Would upload to blob storage
                    audio: ''
                }
            };

            lifeRecords.push(record);

            return res.json({
                success: true,
                captured: true,
                momentId: record.id,
                significance: analysis.significance_score,
                momentType: analysis.moment_type,
                description: analysis.auto_description,
                suggestion: analysis.capture_suggestion
            });
        }

        res.json({
            success: true,
            captured: false,
            significance: analysis.significance_score,
            reason: 'Moment not significant enough to capture'
        });
    } catch (error) {
        console.error('Moment capture error:', error.message);
        res.status(500).json({ error: 'Moment capture failed' });
    }
});

/**
 * GET /api/recorder/memories/:userId
 * Get curated memories for the user
 */
router.get('/memories/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { days = 30, category, person } = req.query;

        const cutoff = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        let memories = lifeRecords.filter(r =>
            r.userId === userId &&
            new Date(r.timestamp) > cutoff
        );

        // Filter by category if specified
        if (category) {
            memories = memories.filter(r => r.type === category);
        }

        // Filter by person if specified
        if (person) {
            memories = memories.filter(r =>
                r.people && r.people.some(p =>
                    p.toLowerCase().includes(person.toLowerCase())
                )
            );
        }

        // Sort by significance and recency
        memories.sort((a, b) => {
            const sigDiff = b.significance - a.significance;
            if (Math.abs(sigDiff) > 0.2) return sigDiff;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        res.json({
            success: true,
            userId,
            count: memories.length,
            memories: memories.slice(0, 50),
            categories: [...new Set(memories.map(m => m.type))],
            people: [...new Set(memories.flatMap(m => m.people || []))]
        });
    } catch (error) {
        console.error('Memories retrieval error:', error.message);
        res.status(500).json({ error: 'Memories retrieval failed' });
    }
});

/**
 * POST /api/recorder/narrate
 * Generate AI narration for memory playback
 */
router.post('/narrate', async (req, res) => {
    try {
        const { userId, memoryIds, style = 'warm' } = req.body;

        if (!userId || !memoryIds || memoryIds.length === 0) {
            return res.status(400).json({ error: 'userId and memoryIds required' });
        }

        const memories = lifeRecords.filter(r =>
            r.userId === userId && memoryIds.includes(r.id)
        );

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/recorder/generate-narration`, {
            memories: memories,
            style: style,
            user_preferences: {}
        });

        res.json({
            success: true,
            narration: mlResponse.data.narration_text,
            audioUrl: mlResponse.data.audio_url,
            duration: mlResponse.data.estimated_duration,
            slides: mlResponse.data.slide_transitions,
            emotionalTone: mlResponse.data.emotional_tone
        });
    } catch (error) {
        console.error('Narration generation error:', error.message);
        res.status(500).json({ error: 'Narration generation failed' });
    }
});

/**
 * POST /api/recorder/voice-tag
 * Add voice tag to a memory with transcription
 */
router.post('/voice-tag', async (req, res) => {
    try {
        const { userId, memoryId, audioBase64 } = req.body;

        if (!memoryId || !audioBase64) {
            return res.status(400).json({ error: 'memoryId and audioBase64 required' });
        }

        // Transcribe the voice tag
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/recorder/transcribe-voice-tag`, {
            audio_base64: audioBase64
        });

        // Find and update the memory
        const memory = lifeRecords.find(r => r.id === memoryId && r.userId === userId);
        if (memory) {
            memory.voiceTag = {
                transcript: mlResponse.data.transcript,
                keywords: mlResponse.data.keywords,
                timestamp: new Date().toISOString()
            };
        }

        res.json({
            success: true,
            memoryId,
            transcript: mlResponse.data.transcript,
            keywords: mlResponse.data.keywords,
            sentiment: mlResponse.data.sentiment
        });
    } catch (error) {
        console.error('Voice tag error:', error.message);
        res.status(500).json({ error: 'Voice tag failed' });
    }
});

/**
 * GET /api/recorder/remember-when/:userId
 * Get "Remember When" session with curated memories and narration
 */
router.get('/remember-when/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { theme, duration = 5 } = req.query;

        const userMemories = lifeRecords.filter(r => r.userId === userId);

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/recorder/remember-when-session`, {
            memories: userMemories,
            theme: theme,
            duration_minutes: parseInt(duration)
        });

        res.json({
            success: true,
            sessionTitle: mlResponse.data.session_title,
            theme: mlResponse.data.theme,
            duration: mlResponse.data.duration,
            memories: mlResponse.data.selected_memories,
            narration: mlResponse.data.narration,
            backgroundMusic: mlResponse.data.background_music,
            transitionStyle: mlResponse.data.transition_style
        });
    } catch (error) {
        console.error('Remember When session error:', error.message);
        res.status(500).json({ error: 'Session generation failed' });
    }
});

/**
 * POST /api/recorder/legacy-book
 * Generate shareable memory book for family
 */
router.post('/legacy-book', async (req, res) => {
    try {
        const { userId, title, dateRange, includeCategories } = req.body;

        const memories = lifeRecords.filter(r => r.userId === userId);

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/recorder/generate-legacy-book`, {
            memories: memories,
            title: title,
            date_range: dateRange,
            categories: includeCategories
        });

        res.json({
            success: true,
            bookId: mlResponse.data.book_id,
            title: mlResponse.data.title,
            pageCount: mlResponse.data.page_count,
            previewUrl: mlResponse.data.preview_url,
            downloadUrl: mlResponse.data.download_url,
            shareableLink: mlResponse.data.shareable_link
        });
    } catch (error) {
        console.error('Legacy book generation error:', error.message);
        res.status(500).json({ error: 'Legacy book generation failed' });
    }
});

module.exports = router;
