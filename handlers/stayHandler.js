const Stay = require('../models/Stay');

async function getAllStays(req, res) {
    try {
        const filter = req.query.persons ? { numberOfPersons: req.query.persons } : {};
        const stays = await Stay.find(filter).sort({ created: -1 });
        res.json(stays);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getStayById(req, res) {
    try {
        const stay = await Stay.findById(req.params.id);
        if (!stay) return res.status(404).json({ error: 'Ophold ikke fundet' });
        res.json(stay);
    } catch {
        res.status(404).json({ error: 'Ophold ikke fundet' });
    }
}

async function createStay(req, res) {
    try {
        const { title, numberOfPersons, price, image } = req.body;
        if (!title || !numberOfPersons || !price || !image) {
            return res.status(400).json({ error: 'title, numberOfPersons, price og image er påkrævet' });
        }
        const stay = await Stay.create({
            title,
            teaser:            req.body.teaser            || '',
            description:       req.body.description       || '',
            numberOfPersons:   String(numberOfPersons),
            discountInPercent: req.body.discountInPercent || 0,
            price,
            includes:          req.body.includes          || [],
            image,
            isActive:          req.body.isActive !== undefined ? req.body.isActive : true,
        });
        res.status(201).json(stay);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateStay(req, res) {
    try {
        const stay = await Stay.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!stay) return res.status(404).json({ error: 'Ophold ikke fundet' });
        res.json(stay);
    } catch {
        res.status(404).json({ error: 'Ophold ikke fundet' });
    }
}

async function deleteStay(req, res) {
    try {
        const result = await Stay.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Ophold ikke fundet' });
        res.json({ message: 'Ophold slettet' });
    } catch {
        res.status(404).json({ error: 'Ophold ikke fundet' });
    }
}

module.exports = { getAllStays, getStayById, createStay, updateStay, deleteStay };
