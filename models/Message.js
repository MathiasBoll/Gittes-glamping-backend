const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
    {
        name:      { type: String, required: true },
        email:     { type: String, required: true },
        category:  { type: String, default: '' },
        message:   { type: String, required: true },
        status:    {
            type:    String,
            enum:    ['ny', 'læst', 'besvaret', 'arkiveret'],
            default: 'ny',
        },
        reply:     { type: String, default: '' },
        repliedAt: { type: Date },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Message', MessageSchema);
