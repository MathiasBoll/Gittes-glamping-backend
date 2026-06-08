const Activity = require('../models/Activity');

async function getAllActivities(req, res) {
    try {
        const filter = req.query.date ? { date: req.query.date } : {};
        const activities = await Activity.find(filter).sort({ sortOrder: 1, created: -1 });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getActivityById(req, res) {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json(activity);
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
}

async function createActivity(req, res) {
    try {
        const { title, date, time, description, image } = req.body;
        if (!title || !date || !time || !description || !image) {
            return res.status(400).json({ error: 'title, date, time, description og image er påkrævet' });
        }
        const activity = await Activity.create({
            title, date, time, description, image,
            isActive:  req.body.isActive  !== undefined ? req.body.isActive  : true,
            sortOrder: req.body.sortOrder || 0,
        });
        res.status(201).json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateActivity(req, res) {
    try {
        const activity = await Activity.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!activity) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json(activity);
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
}

async function deleteActivity(req, res) {
    try {
        const result = await Activity.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json({ message: 'Aktivitet slettet' });
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
}

module.exports = { getAllActivities, getActivityById, createActivity, updateActivity, deleteActivity };
