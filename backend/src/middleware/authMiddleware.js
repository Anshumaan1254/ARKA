const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function verifyToken(token) {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);

        if (error || !user) {
            return null;
        }

        return user;
    } catch (err) {
        console.error('Token verification error:', err);
        return null;
    }
}

async function getUserProfile(userId) {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const user = await verifyToken(token);

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const profile = await getUserProfile(user.id);

        req.user = {
            id: user.id,
            email: user.email,
            role: profile?.role || 'patient',
            profile: profile
        };

        req.supabase = supabaseClient;
        req.supabaseAdmin = supabaseAdmin;

        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

module.exports = authMiddleware;
