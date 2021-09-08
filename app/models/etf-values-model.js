
const mongoose = require('mongoose')

const ETFValuesSchema = new mongoose.Schema({ 
    symbol: String, 
    date: Date,
    close: Number,
    open: Number,
    high: Number,
    low: Number,
    adjusted_close: Number,
    volume: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('etfvalues', ETFValuesSchema)
