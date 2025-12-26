// Azure AD B2C Authentication Configuration
// Uses JWKS (JSON Web Key Set) for secure token verification
// Documentation: https://docs.microsoft.com/en-us/azure/active-directory-b2c/

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Azure AD B2C Configuration
const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME; // e.g., 'yourapp'
const tenantId = process.env.AZURE_AD_B2C_TENANT_ID;
const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;
const policyName = process.env.AZURE_AD_B2C_POLICY_NAME || 'B2C_1_signupsignin';

// Construct Azure AD B2C endpoints
const issuer = tenantName
    ? `https://${tenantName}.b2clogin.com/${tenantId}/v2.0/`
    : null;

const jwksUri = tenantName
    ? `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${policyName}/discovery/v2.0/keys`
    : null;

// JWKS client for fetching public keys
let jwksClientInstance = null;

if (jwksUri) {
    jwksClientInstance = jwksClient({
        jwksUri: jwksUri,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
        jwksRequestsPerMinute: 10
    });
}

// Function to get signing key from JWKS
const getSigningKey = (header, callback) => {
    if (!jwksClientInstance) {
        return callback(new Error('JWKS client not configured'));
    }

    jwksClientInstance.getSigningKey(header.kid, (err, key) => {
        if (err) {
            return callback(err);
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
};

// Verify Azure AD B2C token using JWKS
const verifyAzureToken = (token) => {
    return new Promise((resolve, reject) => {
        if (!jwksClientInstance) {
            return reject(new Error('Azure AD B2C not configured'));
        }

        const options = {
            audience: clientId,
            issuer: issuer,
            algorithms: ['RS256']
        };

        jwt.verify(token, getSigningKey, options, (err, decoded) => {
            if (err) {
                return reject(err);
            }
            resolve(decoded);
        });
    });
};

// Middleware to verify Azure AD B2C token
const azureAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Token format invalid' });
    }

    const token = parts[1];

    try {
        // If Azure AD B2C is configured, use JWKS verification
        if (jwksClientInstance) {
            const decoded = await verifyAzureToken(token);
            req.user = {
                userId: decoded.sub || decoded.oid,
                email: decoded.emails?.[0] || decoded.email,
                name: decoded.name,
                claims: decoded
            };
        } else {
            // Fallback for development without Azure AD B2C
            console.warn('Azure AD B2C not configured - using development mode');
            // In development, you might want to accept a simple token
            // Remove this in production
            const decoded = jwt.decode(token);
            if (!decoded) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            req.user = {
                userId: decoded.userId || decoded.sub,
                email: decoded.email
            };
        }
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
};

// Optional middleware (continues if no token)
const optionalAzureAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            try {
                if (jwksClientInstance) {
                    const decoded = await verifyAzureToken(parts[1]);
                    req.user = {
                        userId: decoded.sub || decoded.oid,
                        email: decoded.emails?.[0] || decoded.email,
                        name: decoded.name,
                        claims: decoded
                    };
                }
            } catch (error) {
                // Ignore verification errors for optional auth
            }
        }
    }
    next();
};

// Get Azure AD B2C configuration for client
const getAzureAdConfig = () => {
    if (!tenantName || !clientId) {
        return { configured: false };
    }

    return {
        configured: true,
        tenantName,
        clientId,
        policyName,
        authority: `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${policyName}`,
        redirectUri: process.env.AZURE_AD_B2C_REDIRECT_URI || 'http://localhost:3000/auth/callback',
        scopes: ['openid', 'profile', 'email', clientId]
    };
};

// Development helper: Generate a test token (only for development)
const generateDevToken = (userId, email) => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Dev tokens not allowed in production');
    }
    // Simple token for development only
    const devSecret = process.env.DEV_JWT_SECRET || 'dev-only-secret';
    return jwt.sign({ userId, email }, devSecret, { expiresIn: '7d' });
};

module.exports = {
    azureAuthMiddleware,
    optionalAzureAuth,
    verifyAzureToken,
    getAzureAdConfig,
    generateDevToken
};
