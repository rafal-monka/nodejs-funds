
const mongoose = require('mongoose')

const lookSchema = new mongoose.Schema({
    symbol: String, 
    lookDate: Date,
    value: Number,
    lra: Number,
    lrb: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('tfilook', lookSchema)
