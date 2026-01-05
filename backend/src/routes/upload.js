const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.post('/signed-url', async (req, res) => {
    try {
        const { supabaseAdmin, user } = req;
        const { bucket, filename, contentType } = req.body;

        if (!bucket || !filename) {
            return res.status(400).json({ error: 'Bucket and filename are required' });
        }

        const allowedBuckets = ['faces', 'voices'];
        if (!allowedBuckets.includes(bucket)) {
            return res.status(400).json({ error: 'Invalid bucket' });
        }

        const fileExt = filename.split('.').pop();
        const uniqueFilename = `${user.id}/${uuidv4()}.${fileExt}`;

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUploadUrl(uniqueFilename, {
                upsert: false
            });

        if (error) {
            console.error('Signed URL error:', error);
            return res.status(500).json({ error: 'Failed to create upload URL' });
        }

        res.json({
            signedUrl: data.signedUrl,
            path: uniqueFilename,
            token: data.token
        });
    } catch (err) {
        console.error('Upload URL error:', err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

router.post('/confirm', async (req, res) => {
    try {
        const { supabaseAdmin } = req;
        const { bucket, path } = req.body;

        if (!bucket || !path) {
            return res.status(400).json({ error: 'Bucket and path are required' });
        }

        const { data } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(path);

        res.json({
            publicUrl: data.publicUrl,
            path: path
        });
    } catch (err) {
        console.error('Confirm upload error:', err);
        res.status(500).json({ error: 'Failed to confirm upload' });
    }
});

router.get('/download-url', async (req, res) => {
    try {
        const { supabaseAdmin } = req;
        const { bucket, path } = req.query;

        if (!bucket || !path) {
            return res.status(400).json({ error: 'Bucket and path are required' });
        }

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 3600);

        if (error) {
            console.error('Download URL error:', error);
            return res.status(500).json({ error: 'Failed to create download URL' });
        }

        res.json({
            signedUrl: data.signedUrl
        });
    } catch (err) {
        console.error('Download URL error:', err);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});

module.exports = router;
