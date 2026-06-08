const express = require('express');
const router  = express.Router();
const { getAllActivities, getActivityById, createActivity, updateActivity, deleteActivity } = require('../handlers/activityHandler');

router.get('/activities',     getAllActivities);
router.get('/activities/:id', getActivityById);
router.post('/activities',    createActivity);
router.put('/activities/:id', updateActivity);
router.delete('/activities/:id', deleteActivity);

module.exports = router;
