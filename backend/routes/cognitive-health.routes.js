/**
 * ARKA - Cognitive Health Monitoring Routes
 * Detects cognitive decline through speech patterns, behavior analysis, and daily scoring
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Store for cognitive data (will use Cosmos DB in production)
let cognitiveRecords = [];

/**
 * POST /api/cognitive/analyze-speech
 * Analyze speech audio for cognitive health indicators
 */
router.post('/analyze-speech', async (req, res) => {
    try {
        const { userId, audioBase64, transcript } = req.body;
        
        if (!userId || (!audioBase64 && !transcript)) {
            return res.status(400).json({ error: 'userId and either audioBase64 or transcript required' });
        }

        // Call ML service for speech analysis
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/cognitive/analyze-speech`, {
            audio_base64: audioBase64,
            transcript: transcript
        });

        const analysis = mlResponse.data;
        
        // Store the analysis
        const record = {
            userId,
            timestamp: new Date().toISOString(),
            type: 'speech_analysis',
            analysis: analysis,
            indicators: {
                hesitationScore: analysis.hesitation_score,
                repetitionScore: analysis.repetition_score,
                wordFindingDifficulty: analysis.word_finding_difficulty,
                overallCognitiveScore: analysis.cognitive_score
            }
        };
        
        cognitiveRecords.push(record);

        res.json({
            success: true,
            cognitiveScore: analysis.cognitive_score,
            indicators: record.indicators,
            recommendations: analysis.recommendations,
            alertLevel: analysis.alert_level
        });
    } catch (error) {
        console.error('Speech analysis error:', error.message);
        res.status(500).json({ error: 'Speech analysis failed', details: error.message });
    }
});

/**
 * POST /api/cognitive/daily-score
 * Calculate and store daily cognitive performance score
 */
router.post('/daily-score', async (req, res) => {
    try {
        const { userId, activities } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        // Calculate daily score from various activities
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/cognitive/daily-score`, {
            user_id: userId,
            activities: activities || [],
            date: new Date().toISOString().split('T')[0]
        });

        const dailyScore = mlResponse.data;
        
        const record = {
            userId,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            type: 'daily_score',
            score: dailyScore.overall_score,
            breakdown: dailyScore.breakdown,
            trend: dailyScore.trend,
            comparison: dailyScore.comparison_to_baseline
        };
        
        cognitiveRecords.push(record);

        res.json({
            success: true,
            date: record.date,
            score: dailyScore.overall_score,
            breakdown: dailyScore.breakdown,
            trend: dailyScore.trend,
            insights: dailyScore.insights,
            caregiverAlerts: dailyScore.caregiver_alerts
        });
    } catch (error) {
        console.error('Daily score calculation error:', error.message);
        res.status(500).json({ error: 'Daily score calculation failed' });
    }
});

/**
 * GET /api/cognitive/trends/:userId
 * Get cognitive health trends over time
 */
router.get('/trends/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { days = 30 } = req.query;
        
        // Get records for this user
        const userRecords = cognitiveRecords.filter(r => 
            r.userId === userId && 
            r.type === 'daily_score'
        );
        
        // Calculate trends
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/cognitive/calculate-trends`, {
            records: userRecords,
            days: parseInt(days)
        });

        res.json({
            success: true,
            userId,
            period: `${days} days`,
            trends: mlResponse.data.trends,
            averageScore: mlResponse.data.average_score,
            trajectory: mlResponse.data.trajectory,
            significantChanges: mlResponse.data.significant_changes,
            recommendations: mlResponse.data.recommendations
        });
    } catch (error) {
        console.error('Trends calculation error:', error.message);
        res.status(500).json({ error: 'Trends calculation failed' });
    }
});

/**
 * GET /api/cognitive/alerts/:userId
 * Get anomaly alerts for potential cognitive decline
 */
router.get('/alerts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get recent records
        const userRecords = cognitiveRecords.filter(r => r.userId === userId);
        
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/cognitive/detect-anomalies`, {
            records: userRecords
        });

        res.json({
            success: true,
            userId,
            activeAlerts: mlResponse.data.alerts,
            riskLevel: mlResponse.data.risk_level,
            actionRequired: mlResponse.data.action_required,
            suggestedActions: mlResponse.data.suggested_actions
        });
    } catch (error) {
        console.error('Anomaly detection error:', error.message);
        res.status(500).json({ error: 'Anomaly detection failed' });
    }
});

/**
 * POST /api/cognitive/interaction-log
 * Log user interactions for cognitive pattern analysis
 */
router.post('/interaction-log', async (req, res) => {
    try {
        const { userId, interactionType, details, success, duration } = req.body;
        
        const record = {
            userId,
            timestamp: new Date().toISOString(),
            type: 'interaction',
            interactionType,
            details,
            success,
            duration
        };
        
        cognitiveRecords.push(record);
        
        res.json({ success: true, recorded: true });
    } catch (error) {
        console.error('Interaction logging error:', error.message);
        res.status(500).json({ error: 'Logging failed' });
    }
});

/**
 * GET /api/cognitive/weekly-report/:userId
 * Generate comprehensive weekly cognitive health report
 */
router.get('/weekly-report/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const userRecords = cognitiveRecords.filter(r => r.userId === userId);
        
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/cognitive/weekly-report`, {
            user_id: userId,
            records: userRecords
        });

        res.json({
            success: true,
            userId,
            reportDate: new Date().toISOString(),
            summary: mlResponse.data.summary,
            cognitiveScore: mlResponse.data.average_cognitive_score,
            speechAnalysis: mlResponse.data.speech_analysis_summary,
            behavioralPatterns: mlResponse.data.behavioral_patterns,
            alertsSummary: mlResponse.data.alerts_summary,
            caregiverRecommendations: mlResponse.data.caregiver_recommendations,
            medicalNotes: mlResponse.data.medical_notes
        });
    } catch (error) {
        console.error('Weekly report error:', error.message);
        res.status(500).json({ error: 'Report generation failed' });
    }
});

module.exports = router;
