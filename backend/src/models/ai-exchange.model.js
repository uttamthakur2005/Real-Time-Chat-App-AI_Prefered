const mongoose = require('mongoose')

const aiExchangeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    prompt: {
        type: String,
        required: true,
        maxlength: 4000
    },
    answer: {
        type: String,
        required: true,
        maxlength: 20000
    }
}, { timestamps: true })

aiExchangeSchema.index({ user: 1, _id: -1 })

module.exports = mongoose.model('AIExchange', aiExchangeSchema)
