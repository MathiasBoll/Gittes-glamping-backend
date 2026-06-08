const express = require('express');
const router  = express.Router();
const { createSubscriber, getAllSubscribers, updateSubscriber, deleteSubscriber } = require('../handlers/subscriberHandler');

router.post('/subscribers',              createSubscriber);
router.get('/admin/subscribers',         getAllSubscribers);
router.patch('/admin/subscribers/:id',   updateSubscriber);
router.delete('/admin/subscribers/:id',  deleteSubscriber);

module.exports = router;
