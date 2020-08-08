
const mongoose = require('mongoose')

const resultSchema = new mongoose.Schema({
    symbol: String, 
    date: Date,
    cumPercent :Number,
    percent: Number,
    cumInterests: Number,
    interests: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Result', resultSchema)
