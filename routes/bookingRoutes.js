const express = require('express');
const router  = express.Router();
const { createBooking, getAllBookings, updateBookingStatus, deleteBooking } = require('../handlers/bookingHandler');

router.post('/bookings',                    createBooking);
router.get('/admin/bookings',               getAllBookings);
router.patch('/admin/bookings/:id/status',  updateBookingStatus);
router.delete('/admin/bookings/:id',        deleteBooking);

module.exports = router;
