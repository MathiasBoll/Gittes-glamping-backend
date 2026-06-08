const Message = require('../models/Message');

async function createMessage(req, res) {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'name, email og message er påkrævet' });
        }
        const msg = await Message.create({
            name, email,
            category: req.body.category || '',
            message,
            status: 'ny',
        });
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAllMessages(req, res) {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const total      = await Message.countDocuments();
        const totalPages = Math.ceil(total / limit) || 1;
        const data       = await Message.find()
            .sort({ created: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({ data, page, totalPages, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateMessageStatus(req, res) {
    try {
        const msg = await Message.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!msg) return res.status(404).json({ error: 'Besked ikke fundet' });
        res.json(msg);
    } catch {
        res.status(404).json({ error: 'Besked ikke fundet' });
    }
}

async function replyToMessage(req, res) {
    try {
        const { reply } = req.body;
        if (!reply || !reply.trim()) {
            return res.status(400).json({ error: 'Svar-tekst er påkrævet' });
        }
        const msg = await Message.findByIdAndUpdate(
            req.params.id,
            { reply: reply.trim(), repliedAt: new Date(), status: 'besvaret' },
            { new: true }
        );
        if (!msg) return res.status(404).json({ error: 'Besked ikke fundet' });
        res.json(msg);
    } catch {
        res.status(404).json({ error: 'Besked ikke fundet' });
    }
}

async function deleteMessage(req, res) {
    try {
        const result = await Message.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Besked ikke fundet' });
        res.json({ message: 'Besked slettet' });
    } catch {
        res.status(404).json({ error: 'Besked ikke fundet' });
    }
}

module.exports = { createMessage, getAllMessages, updateMessageStatus, replyToMessage, deleteMessage };
