const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
const key = process.env.AZURE_COSMOS_KEY;
const databaseId = process.env.AZURE_COSMOS_DATABASE || 'alzheimer_care_db';

let client = null;
let database = null;
let containers = {};

const containerDefinitions = [
    { id: 'users', partitionKey: '/id' },
    { id: 'persons', partitionKey: '/userId' },
    { id: 'memories', partitionKey: '/personId' },
    { id: 'reminders', partitionKey: '/userId' },
    { id: 'items', partitionKey: '/userId' },
    { id: 'locations', partitionKey: '/userId' },
    { id: 'sosAlerts', partitionKey: '/userId' },
    { id: 'activityLogs', partitionKey: '/userId' }
];

const connectToDatabase = async () => {
    try {
        if (!endpoint || !key) {
            console.warn('Azure Cosmos DB credentials not configured. Using mock mode.');
            return null;
        }

        client = new CosmosClient({ endpoint, key });

        const { database: db } = await client.databases.createIfNotExists({ id: databaseId });
        database = db;

        for (const containerDef of containerDefinitions) {
            const { container } = await database.containers.createIfNotExists({
                id: containerDef.id,
                partitionKey: { paths: [containerDef.partitionKey] }
            });
            containers[containerDef.id] = container;
        }

        console.log('All containers initialized successfully');
        return database;
    } catch (error) {
        console.error('Error connecting to Cosmos DB:', error.message);
        throw error;
    }
};

const getContainer = (containerName) => {
    return containers[containerName];
};

const getDatabase = () => database;

module.exports = {
    connectToDatabase,
    getContainer,
    getDatabase
};
