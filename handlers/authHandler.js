const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');

async function signIn(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email og password er påkrævet' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Forkert email eller password' });
        }

        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) {
            return res.status(401).json({ error: 'Forkert email eller password' });
        }

        const token = jwt.sign(
            { _id: user._id, email: user.email, name: user.name, picture: user.picture, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({ status: 'ok', message: 'Logget ind', data: { token } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function signInWithToken(req, res) {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token mangler' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user    = await User.findOne({ email: decoded.email }).select('-hashedPassword');
        if (!user) {
            return res.status(401).json({ error: 'Bruger ikke fundet' });
        }

        res.json({ status: 'ok', message: 'Token OK', data: user });
    } catch {
        res.status(401).json({ error: 'Token udløbet eller ugyldig' });
    }
}

module.exports = { signIn, signInWithToken };
