const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Ingen adgang uden token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Ugyldigt token – er du logget ind?' });
    }
}

function requireAdmin(req, res, next) {
    // Accept static ADMIN_TOKEN as fallback (for frontends not yet using JWT)
    const staticToken = process.env.ADMIN_TOKEN || 'glamping-admin-2026';
    const authHeader  = req.headers['authorization'] || '';
    if (authHeader === `Bearer ${staticToken}`) {
        req.user = { role: 'admin' };
        return next();
    }

    // Otherwise require a valid JWT with role admin
    requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Kun admins har adgang.' });
        }
        next();
    });
}

module.exports = { requireAuth, requireAdmin };
