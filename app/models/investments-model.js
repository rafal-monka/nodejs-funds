
const mongoose = require('mongoose')

const investmentSchema = new mongoose.Schema({
    symbol: String, 
    dateStart: Date,
    capital: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Investment', investmentSchema)
