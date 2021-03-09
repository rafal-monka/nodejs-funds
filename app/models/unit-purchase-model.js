const mongoose = require('mongoose')

const unitPurchaseSchema = new mongoose.Schema({
    symbol: String, 
    distributor: String,
    name: String, //register number
    date: Date,
    units: Number,
    price: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('UnitPurchase', unitPurchaseSchema)
