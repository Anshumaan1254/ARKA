/**
 * ARKA - Memory Training Routes
 * Spaced repetition system for face-name memory reinforcement
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Store for training data
let trainingRecords = [];
let memoryStrength = {}; // userId -> personId -> strength score

/**
 * GET /api/training/next-session/:userId
 * Get personalized training session with spaced repetition
 */
router.get('/next-session/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { sessionType = 'full' } = req.query;

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/training/generate-session`, {
            user_id: userId,
            session_type: sessionType,
            previous_results: trainingRecords.filter(r => r.userId === userId).slice(-50)
        });

        const session = mlResponse.data;

        res.json({
            success: true,
            sessionId: session.session_id,
            sessionType: session.session_type,
            estimatedDuration: session.estimated_duration,
            exercises: session.exercises,
            difficulty: session.difficulty,
            focusPeople: session.focus_people,
            encouragement: session.encouragement_message
        });
    } catch (error) {
        console.error('Session generation error:', error.message);
        res.status(500).json({ error: 'Session generation failed' });
    }
});

/**
 * POST /api/training/submit-result
 * Record training exercise result and update memory strength
 */
router.post('/submit-result', async (req, res) => {
    try {
        const { userId, sessionId, exerciseId, personId, correct, responseTime, attempts } = req.body;

        if (!userId || !exerciseId || correct === undefined) {
            return res.status(400).json({ error: 'userId, exerciseId, and correct required' });
        }

        const record = {
            userId,
            sessionId,
            exerciseId,
            personId,
            correct,
            responseTime,
            attempts,
            timestamp: new Date().toISOString()
        };

        trainingRecords.push(record);

        // Update memory strength using SM-2 algorithm variant
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/training/update-strength`, {
            user_id: userId,
            person_id: personId,
            correct: correct,
            response_time: responseTime,
            attempts: attempts,
            previous_strength: memoryStrength[userId]?.[personId] || 0
        });

        // Store updated strength
        if (!memoryStrength[userId]) memoryStrength[userId] = {};
        memoryStrength[userId][personId] = mlResponse.data.new_strength;

        res.json({
            success: true,
            previousStrength: mlResponse.data.previous_strength,
            newStrength: mlResponse.data.new_strength,
            strengthChange: mlResponse.data.strength_change,
            nextReviewDate: mlResponse.data.next_review_date,
            streak: mlResponse.data.streak,
            encouragement: mlResponse.data.encouragement
        });
    } catch (error) {
        console.error('Result submission error:', error.message);
        res.status(500).json({ error: 'Result submission failed' });
    }
});

/**
 * GET /api/training/progress/:userId
 * Get comprehensive memory training progress
 */
router.get('/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const userRecords = trainingRecords.filter(r => r.userId === userId);
        const userStrengths = memoryStrength[userId] || {};

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/training/analyze-progress`, {
            user_id: userId,
            records: userRecords,
            strengths: userStrengths
        });

        res.json({
            success: true,
            userId,
            totalSessions: mlResponse.data.total_sessions,
            totalExercises: mlResponse.data.total_exercises,
            overallAccuracy: mlResponse.data.overall_accuracy,
            currentStreak: mlResponse.data.current_streak,
            longestStreak: mlResponse.data.longest_streak,
            memoryStrengths: mlResponse.data.memory_strengths,
            strongestMemories: mlResponse.data.strongest_memories,
            needsReinforcement: mlResponse.data.needs_reinforcement,
            weeklyProgress: mlResponse.data.weekly_progress,
            achievements: mlResponse.data.achievements,
            nextMilestone: mlResponse.data.next_milestone
        });
    } catch (error) {
        console.error('Progress analysis error:', error.message);
        res.status(500).json({ error: 'Progress analysis failed' });
    }
});

/**
 * POST /api/training/family-engagement
 * Track family member engagement in training process
 */
router.post('/family-engagement', async (req, res) => {
    try {
        const { userId, familyMemberId, engagementType, details } = req.body;

        const record = {
            userId,
            familyMemberId,
            engagementType,
            details,
            timestamp: new Date().toISOString()
        };

        trainingRecords.push(record);

        res.json({
            success: true,
            message: 'Engagement recorded',
            pointsEarned: engagementType === 'visit' ? 10 : 5,
            familyLeaderboard: [] // Would fetch from DB
        });
    } catch (error) {
        console.error('Engagement recording error:', error.message);
        res.status(500).json({ error: 'Engagement recording failed' });
    }
});

/**
 * GET /api/training/relationship-map/:userId
 * Get visual relationship map with memory strengths
 */
router.get('/relationship-map/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const userStrengths = memoryStrength[userId] || {};

        res.json({
            success: true,
            userId,
            relationships: Object.entries(userStrengths).map(([personId, strength]) => ({
                personId,
                strength,
                strengthLevel: strength > 0.8 ? 'strong' : strength > 0.5 ? 'moderate' : 'weak',
                lastReviewed: new Date().toISOString(),
                nextReview: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            }))
        });
    } catch (error) {
        console.error('Relationship map error:', error.message);
        res.status(500).json({ error: 'Relationship map failed' });
    }
});

module.exports = router;
