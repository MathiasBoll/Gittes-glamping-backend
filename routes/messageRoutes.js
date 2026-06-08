const express = require('express');
const router  = express.Router();
const { createMessage, getAllMessages, updateMessageStatus, replyToMessage, deleteMessage } = require('../handlers/messageHandler');

router.post('/contact',                       createMessage);
router.get('/admin/messages',                 getAllMessages);
router.patch('/admin/messages/:id/status',    updateMessageStatus);
router.patch('/admin/messages/:id/reply',     replyToMessage);
router.delete('/admin/messages/:id',          deleteMessage);

module.exports = router;
