const express = require('express');
const router  = express.Router();
const { getAllStays, getStayById, createStay, updateStay, deleteStay } = require('../handlers/stayHandler');

router.get('/stays',     getAllStays);
router.get('/stays/:id', getStayById);
router.post('/stays',    createStay);
router.put('/stays/:id', updateStay);
router.delete('/stays/:id', deleteStay);

module.exports = router;
