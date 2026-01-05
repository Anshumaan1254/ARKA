function ipLogger(req, res, next) {
    const ip = req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection?.remoteAddress ||
        'unknown';

    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: ip,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'] || 'unknown'
    };

    req.clientIP = ip;

    if (process.env.NODE_ENV !== 'production') {
        console.log(`[IP LOG] ${logEntry.ip} ${logEntry.method} ${logEntry.path}`);
    }

    next();
}

module.exports = ipLogger;
