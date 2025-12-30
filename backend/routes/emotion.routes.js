/**
 * ARKA - Emotion Recognition Routes
 * Real-time emotion detection for patients and caregivers
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Store for emotion data
let emotionRecords = [];

/**
 * POST /api/emotion/analyze-face
 * Detect emotions from facial expression in real-time
 */
router.post('/analyze-face', async (req, res) => {
    try {
        const { userId, imageBase64, context } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'imageBase64 required' });
        }

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/emotion/analyze-face`, {
            image_base64: imageBase64,
            context: context || {}
        });

        const emotions = mlResponse.data;

        // Store emotion record
        const record = {
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
            dominantEmotion: emotions.dominant_emotion,
            emotions: emotions.all_emotions,
            confusionLevel: emotions.confusion_level,
            stressLevel: emotions.stress_level
        };

        emotionRecords.push(record);

        // Determine if intervention is needed
        const needsIntervention = emotions.confusion_level > 0.7 ||
            emotions.stress_level > 0.8 ||
            emotions.dominant_emotion === 'fear';

        res.json({
            success: true,
            dominantEmotion: emotions.dominant_emotion,
            confidence: emotions.confidence,
            allEmotions: emotions.all_emotions,
            confusionLevel: emotions.confusion_level,
            stressLevel: emotions.stress_level,
            needsIntervention: needsIntervention,
            suggestedResponse: emotions.suggested_response,
            uiAdaptation: emotions.ui_adaptation
        });
    } catch (error) {
        console.error('Face emotion analysis error:', error.message);
        res.status(500).json({ error: 'Emotion analysis failed' });
    }
});

/**
 * POST /api/emotion/caregiver-status
 * Track caregiver wellbeing and detect burnout signs
 */
router.post('/caregiver-status', async (req, res) => {
    try {
        const { caregiverId, imageBase64, interactionData } = req.body;

        if (!caregiverId) {
            return res.status(400).json({ error: 'caregiverId required' });
        }

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/emotion/caregiver-analysis`, {
            image_base64: imageBase64,
            interaction_data: interactionData || {}
        });

        const analysis = mlResponse.data;

        const record = {
            caregiverId,
            timestamp: new Date().toISOString(),
            stressLevel: analysis.stress_level,
            burnoutRisk: analysis.burnout_risk,
            emotionalState: analysis.emotional_state
        };

        emotionRecords.push(record);

        res.json({
            success: true,
            caregiverId,
            stressLevel: analysis.stress_level,
            burnoutRisk: analysis.burnout_risk,
            emotionalState: analysis.emotional_state,
            recommendations: analysis.recommendations,
            suggestBreak: analysis.suggest_break,
            resources: analysis.support_resources
        });
    } catch (error) {
        console.error('Caregiver status analysis error:', error.message);
        res.status(500).json({ error: 'Caregiver analysis failed' });
    }
});

/**
 * GET /api/emotion/history/:userId
 * Get emotional state history for trend analysis
 */
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { hours = 24 } = req.query;

        const cutoff = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

        const userRecords = emotionRecords.filter(r =>
            r.userId === userId &&
            new Date(r.timestamp) > cutoff
        );

        // Calculate emotional trends
        const emotionCounts = {};
        let avgConfusion = 0;
        let avgStress = 0;

        userRecords.forEach(r => {
            emotionCounts[r.dominantEmotion] = (emotionCounts[r.dominantEmotion] || 0) + 1;
            avgConfusion += r.confusionLevel || 0;
            avgStress += r.stressLevel || 0;
        });

        if (userRecords.length > 0) {
            avgConfusion /= userRecords.length;
            avgStress /= userRecords.length;
        }

        res.json({
            success: true,
            userId,
            period: `${hours} hours`,
            recordCount: userRecords.length,
            emotionDistribution: emotionCounts,
            averageConfusionLevel: Math.round(avgConfusion * 100) / 100,
            averageStressLevel: Math.round(avgStress * 100) / 100,
            recentEmotions: userRecords.slice(-10)
        });
    } catch (error) {
        console.error('Emotion history error:', error.message);
        res.status(500).json({ error: 'History retrieval failed' });
    }
});

/**
 * POST /api/emotion/adaptive-response
 * Get adaptive UI/response based on current emotional state
 */
router.post('/adaptive-response', async (req, res) => {
    try {
        const { userId, currentEmotion, context } = req.body;

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/emotion/adaptive-response`, {
            user_id: userId,
            current_emotion: currentEmotion,
            context: context || {}
        });

        res.json({
            success: true,
            uiTheme: mlResponse.data.ui_theme,
            colorScheme: mlResponse.data.color_scheme,
            fontSize: mlResponse.data.font_size,
            animationSpeed: mlResponse.data.animation_speed,
            voiceTone: mlResponse.data.voice_tone,
            suggestedActions: mlResponse.data.suggested_actions,
            calmingContent: mlResponse.data.calming_content
        });
    } catch (error) {
        console.error('Adaptive response error:', error.message);
        res.status(500).json({ error: 'Adaptive response failed' });
    }
});

module.exports = router;
