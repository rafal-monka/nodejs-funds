
const mongoose = require('mongoose')

const valuesSchema = new mongoose.Schema({
    symbol: String, 
    date: Date,
    value: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('tfivalues', valuesSchema)
