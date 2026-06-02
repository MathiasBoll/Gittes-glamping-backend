const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
    {
        name:      { type: String, required: true },
        email:     { type: String, required: true },
        stayId:    { type: String, required: true },
        stayTitle: { type: String, default: '' },
        checkIn:   { type: String, required: true },
        checkOut:  { type: String, required: true },
        guests:    { type: Number, default: 1 },
        message:   { type: String, default: '' },
        status:    {
            type:    String,
            enum:    ['ny', 'bekræftet', 'aflyst'],
            default: 'ny',
        },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Booking', BookingSchema);
