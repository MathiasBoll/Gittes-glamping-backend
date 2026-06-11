const express = require('express');
const router  = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('../handlers/userHandler');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public – create account / register
router.post('/users',            createUser);

// Protected – must be logged in
router.get('/users/me',          requireAuth, (req, res) => res.json(req.user));
router.put('/users/:id',         requireAuth, updateUser);

// Admin only
router.get('/users',             requireAdmin, getAllUsers);
router.get('/users/:id',         requireAdmin, getUserById);
router.delete('/users/:id',      requireAdmin, deleteUser);

module.exports = router;
