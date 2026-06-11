const MyList = require('../models/MyList');

async function getMyLists(req, res) {
    try {
        const lists = await MyList.find({ userId: req.user._id }).sort({ created: -1 });
        res.json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getMyListById(req, res) {
    try {
        const list = await MyList.findOne({ _id: req.params.id, userId: req.user._id });
        if (!list) return res.status(404).json({ error: 'Liste ikke fundet' });
        res.json(list);
    } catch {
        res.status(404).json({ error: 'Liste ikke fundet' });
    }
}

async function createOrUpdateMyList(req, res) {
    try {
        const { name, stayIds, activityIds } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'name er påkrævet' });
        }

        const existing = await MyList.findOne({ userId: req.user._id, name });

        if (existing) {
            const updated = await MyList.findByIdAndUpdate(
                existing._id,
                { stayIds: stayIds || existing.stayIds, activityIds: activityIds || existing.activityIds },
                { new: true, runValidators: true }
            );
            return res.json(updated);
        }

        const list = await MyList.create({ userId: req.user._id, name, stayIds: stayIds || [], activityIds: activityIds || [] });
        res.status(201).json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteMyList(req, res) {
    try {
        const list = await MyList.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!list) return res.status(404).json({ error: 'Liste ikke fundet' });
        res.json({ message: 'Liste slettet' });
    } catch {
        res.status(404).json({ error: 'Liste ikke fundet' });
    }
}

module.exports = { getMyLists, getMyListById, createOrUpdateMyList, deleteMyList };
