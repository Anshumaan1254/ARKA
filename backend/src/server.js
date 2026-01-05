require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/authMiddleware');
const ipLogger = require('./middleware/ipLogger');

const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const recognizeRoutes = require('./routes/recognize');
const memoriesRoutes = require('./routes/memories');
const sosRoutes = require('./routes/sos');
const uploadRoutes = require('./routes/upload');
const mlRoutes = require('./routes/ml');
const geofenceRoutes = require('./routes/geofence');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(morgan('combined'));

app.use(ipLogger);

const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const mlLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'ML rate limit exceeded. Please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/recognize', mlLimiter);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/people', authMiddleware, peopleRoutes);
app.use('/api/recognize', authMiddleware, recognizeRoutes);
app.use('/api/memories', authMiddleware, memoriesRoutes);
app.use('/api/sos', authMiddleware, sosRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/ml', authMiddleware, mlRoutes);
app.use('/api/geofence', authMiddleware, geofenceRoutes);

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }

    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`ARKA Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
