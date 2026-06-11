const mongoose = require('mongoose');

const MyListSchema = new mongoose.Schema(
    {
        userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name:        { type: String, required: true },
        stayIds:     { type: [String], default: [] },
        activityIds: { type: [String], default: [] },
    },
    { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

module.exports = mongoose.model('MyList', MyListSchema);
