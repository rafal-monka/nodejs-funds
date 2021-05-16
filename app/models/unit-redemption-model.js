const mongoose = require('mongoose')

const unitRedemptionSchema = new mongoose.Schema({
    symbol: String, 
    distributor: String,
    date: Date,
    units: Number,
    price: Number,
    title: String,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('UnitRedemption', unitRedemptionSchema)