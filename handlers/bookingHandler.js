const Booking = require('../models/Booking');
const Stay    = require('../models/Stay');

async function createBooking(req, res) {
    try {
        const { name, email, stayId, checkIn, checkOut } = req.body;
        if (!name || !email || !stayId || !checkIn || !checkOut) {
            return res.status(400).json({ error: 'name, email, stayId, checkIn og checkOut er påkrævet' });
        }
        const stay = await Stay.findById(stayId).catch(() => null);
        const booking = await Booking.create({
            name, email, stayId,
            stayTitle: stay ? stay.title : '',
            checkIn, checkOut,
            guests:  req.body.guests  || 1,
            message: req.body.message || '',
            status:  'ny',
        });
        res.status(201).json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAllBookings(req, res) {
    try {
        const bookings = await Booking.find().sort({ created: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateBookingStatus(req, res) {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!booking) return res.status(404).json({ error: 'Booking ikke fundet' });
        res.json(booking);
    } catch {
        res.status(404).json({ error: 'Booking ikke fundet' });
    }
}

async function deleteBooking(req, res) {
    try {
        const result = await Booking.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Booking ikke fundet' });
        res.json({ message: 'Booking slettet' });
    } catch {
        res.status(404).json({ error: 'Booking ikke fundet' });
    }
}

module.exports = { createBooking, getAllBookings, updateBookingStatus, deleteBooking };
