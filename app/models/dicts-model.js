const mongoose = require('mongoose')

const dictSchema = new mongoose.Schema({
    symbol: String, 
    moneyplsymbol: String,
    code: String,
    aolurl: String,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Dict', dictSchema)
