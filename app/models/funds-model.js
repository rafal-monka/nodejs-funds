
const mongoose = require('mongoose')

const fundSchema = new mongoose.Schema({
    symbol: String, 
    code: String,
    date: Date,
    value: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Fund', fundSchema)
