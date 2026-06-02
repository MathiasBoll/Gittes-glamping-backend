const mongoose = require('mongoose');

const StaySchema = new mongoose.Schema(
    {
        title:             { type: String, required: true },
        teaser:            { type: String, default: '' },
        description:       { type: String, default: '' },
        numberOfPersons:   { type: String, required: true },
        discountInPercent: { type: Number, default: 0 },
        price:             { type: Number, required: true },
        includes:          { type: [String], default: [] },
        image:             { type: String, required: true },
        isActive:          { type: Boolean, default: true },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Stay', StaySchema);
