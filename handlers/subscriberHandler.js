const Subscriber = require('../models/Subscriber');

async function createSubscriber(req, res) {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Gyldig e-mail er påkrævet' });
        }
        const normalised = email.trim().toLowerCase();
        const already = await Subscriber.findOne({ email: normalised });
        if (already) return res.status(409).json({ error: 'E-mailen er allerede tilmeldt' });
        const sub = await Subscriber.create({ email: normalised });
        res.status(201).json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAllSubscribers(req, res) {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const total      = await Subscriber.countDocuments();
        const totalPages = Math.ceil(total / limit) || 1;
        const data       = await Subscriber.find()
            .sort({ subscribedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({ data, page, totalPages, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateSubscriber(req, res) {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Gyldig e-mail er påkrævet' });
        }
        const normalised = email.trim().toLowerCase();
        const dup = await Subscriber.findOne({ email: normalised, _id: { $ne: req.params.id } });
        if (dup) return res.status(409).json({ error: 'E-mailen er allerede i brug' });
        const sub = await Subscriber.findByIdAndUpdate(
            req.params.id,
            { email: normalised },
            { new: true }
        );
        if (!sub) return res.status(404).json({ error: 'Abonnent ikke fundet' });
        res.json(sub);
    } catch {
        res.status(404).json({ error: 'Abonnent ikke fundet' });
    }
}

async function deleteSubscriber(req, res) {
    try {
        const result = await Subscriber.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Abonnent ikke fundet' });
        res.json({ message: 'Abonnent fjernet' });
    } catch {
        res.status(404).json({ error: 'Abonnent ikke fundet' });
    }
}

module.exports = { createSubscriber, getAllSubscribers, updateSubscriber, deleteSubscriber };
