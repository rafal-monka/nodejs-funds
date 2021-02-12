
const mongoose = require('mongoose')

const investmentSchema = new mongoose.Schema({
    symbol: String, 
    platform: String, //platforma: mBank SFI, kupFundusz, PSAT, Pekao, ING, Santander, etc.
    register_no: String,
    dateOrder: Date, //data zlecenia
    dateTransfer: Date, //data przekazania do AT
    dateStart: Date, //data wyceny
    capital: Number, 
    units: Number, //liczba jednostek
    price: Number, //cena jednostki
    type: String,
    dateEnd: Date,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Investment', investmentSchema)
