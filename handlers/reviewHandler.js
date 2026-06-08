const Review = require('../models/Review');

async function getAllReviews(req, res) {
    try {
        const reviews = await Review.find({ isVisible: true }).sort({ created: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAllReviewsAdmin(req, res) {
    try {
        const reviews = await Review.find().sort({ created: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getReviewById(req, res) {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
        res.json(review);
    } catch {
        res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    }
}

async function createReview(req, res) {
    try {
        const { name, review } = req.body;
        if (!name || !review) {
            return res.status(400).json({ error: 'name og review er påkrævet' });
        }
        const newReview = await Review.create({
            name,
            age:       req.body.age  || '',
            stay:      req.body.stay || '',
            review,
            isVisible: true,
        });
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateReview(req, res) {
    try {
        const updated = await Review.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
        res.json(updated);
    } catch {
        res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    }
}

async function deleteReview(req, res) {
    try {
        const result = await Review.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
        res.json({ message: 'Anmeldelse slettet' });
    } catch {
        res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    }
}

module.exports = { getAllReviews, getAllReviewsAdmin, getReviewById, createReview, updateReview, deleteReview };
