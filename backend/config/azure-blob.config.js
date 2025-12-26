const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'memories';

let blobServiceClient = null;
let containerClient = null;

const initializeBlobStorage = async () => {
    try {
        if (!connectionString) {
            console.warn('Azure Blob Storage not configured. Using mock mode.');
            return null;
        }

        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerClient = blobServiceClient.getContainerClient(containerName);

        await containerClient.createIfNotExists({ access: 'blob' });

        console.log('Blob storage initialized successfully');
        return containerClient;
    } catch (error) {
        console.error('Error initializing blob storage:', error.message);
        throw error;
    }
};

const uploadBlob = async (blobName, data, contentType) => {
    try {
        if (!containerClient) {
            await initializeBlobStorage();
        }

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.upload(data, data.length, {
            blobHTTPHeaders: { blobContentType: contentType }
        });

        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading blob:', error.message);
        throw error;
    }
};

const uploadStream = async (blobName, stream, contentType, contentLength) => {
    try {
        if (!containerClient) {
            await initializeBlobStorage();
        }

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadStream(stream, contentLength, 5, {
            blobHTTPHeaders: { blobContentType: contentType }
        });

        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading stream:', error.message);
        throw error;
    }
};

const deleteBlob = async (blobName) => {
    try {
        if (!containerClient) {
            await initializeBlobStorage();
        }

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();

        return true;
    } catch (error) {
        console.error('Error deleting blob:', error.message);
        throw error;
    }
};

const getBlobUrl = (blobName) => {
    if (!containerClient) return null;
    return containerClient.getBlockBlobClient(blobName).url;
};

module.exports = {
    initializeBlobStorage,
    uploadBlob,
    uploadStream,
    deleteBlob,
    getBlobUrl
};
