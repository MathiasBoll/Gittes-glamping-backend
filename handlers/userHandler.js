const bcrypt = require('bcryptjs');
const path   = require('path');
const User   = require('../models/User');

async function getAllUsers(req, res) {
    try {
        const users = await User.find().select('-hashedPassword').sort({ created: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id).select('-hashedPassword');
        if (!user) return res.status(404).json({ error: 'Bruger ikke fundet' });
        res.json(user);
    } catch {
        res.status(404).json({ error: 'Bruger ikke fundet' });
    }
}

async function createUser(req, res) {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email og password er påkrævet' });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(409).json({ error: 'Email er allerede i brug' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, hashedPassword, role: role || 'user' });
        const { hashedPassword: _, ...safe } = user.toObject();
        res.status(201).json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateUser(req, res) {
    try {
        const updates = { ...req.body };

        // If a new password is provided, hash it
        if (updates.password) {
            updates.hashedPassword = await bcrypt.hash(updates.password, 10);
            delete updates.password;
        }

        // If a new picture was uploaded
        if (req.file) {
            updates.picture = `/uploads/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-hashedPassword');
        if (!user) return res.status(404).json({ error: 'Bruger ikke fundet' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteUser(req, res) {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'Bruger ikke fundet' });
        res.json({ message: 'Bruger slettet' });
    } catch {
        res.status(404).json({ error: 'Bruger ikke fundet' });
    }
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
