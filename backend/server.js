require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const personRoutes = require('./routes/person.routes');
const memoryRoutes = require('./routes/memory.routes');
const reminderRoutes = require('./routes/reminder.routes');
const sosRoutes = require('./routes/sos.routes');
const itemRoutes = require('./routes/item.routes');
const frameRoutes = require('./routes/frame.routes');
const locationRoutes = require('./routes/location.routes');

const { connectToDatabase } = require('./config/azure-cosmos.config');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/frame', frameRoutes);
app.use('/api/location', locationRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectToDatabase();
        console.log('Connected to Azure Cosmos DB');
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
