const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
    {
        title:       { type: String, required: true },
        date:        { type: String, required: true },
        time:        { type: String, required: true },
        description: { type: String, required: true },
        image:       { type: String, required: true },
        isActive:    { type: Boolean, default: true },
        sortOrder:   { type: Number,  default: 0 },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Activity', ActivitySchema);
