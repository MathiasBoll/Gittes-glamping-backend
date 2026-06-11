const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        name:           { type: String, required: true },
        email:          { type: String, required: true, unique: true },
        picture:        { type: String, default: '/uploads/no-user.png' },
        hashedPassword: { type: String, required: true },
        role:           { type: String, default: 'user' },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('User', UserSchema);
