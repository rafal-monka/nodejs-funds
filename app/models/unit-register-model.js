const mongoose = require('mongoose')

const unitRegisterSchema = new mongoose.Schema({
    symbol: String,
    distributor: String,
    name: String, //register number 
    date: Date,
    units: Number,
    price: Number,
    fromDate: Date,
    toDate: Date,
    status: String,
    gain: Number,
    redeemed_units: Number,
    redemption_id: String,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('UnitRegister', unitRegisterSchema)
