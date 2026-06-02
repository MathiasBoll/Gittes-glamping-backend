const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
    {
        name:      { type: String, required: true },
        age:       { type: String, default: '' },
        stay:      { type: String, default: '' },
        review:    { type: String, required: true },
        isVisible: { type: Boolean, default: true },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Review', ReviewSchema);
