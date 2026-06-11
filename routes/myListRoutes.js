const express = require('express');
const router  = express.Router();
const { getMyLists, getMyListById, createOrUpdateMyList, deleteMyList } = require('../handlers/myListHandler');
const { requireAuth } = require('../middleware/authMiddleware');

// All My List routes require a logged-in user
router.get('/mylists',        requireAuth, getMyLists);
router.get('/mylists/:id',    requireAuth, getMyListById);
router.post('/mylists',       requireAuth, createOrUpdateMyList);
router.delete('/mylists/:id', requireAuth, deleteMyList);

module.exports = router;
