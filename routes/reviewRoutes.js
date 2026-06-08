const express = require('express');
const router  = express.Router();
const { getAllReviews, getAllReviewsAdmin, getReviewById, createReview, updateReview, deleteReview } = require('../handlers/reviewHandler');

router.get('/reviews',          getAllReviews);
router.get('/admin/reviews',    getAllReviewsAdmin);
router.get('/reviews/:id',      getReviewById);
router.post('/reviews',         createReview);
router.put('/reviews/:id',      updateReview);
router.delete('/reviews/:id',   deleteReview);

// Singular aliases (bruges af frontend)
router.get('/review/:id',    getReviewById);
router.post('/review',       createReview);
router.put('/review/:id',    updateReview);
router.delete('/review/:id', deleteReview);

module.exports = router;
