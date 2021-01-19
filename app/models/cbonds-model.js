
const mongoose = require('mongoose')

const cbondsSchema = new mongoose.Schema({
    document: String,
    trading_ground_name: String,
    emission_id: String,
    emission_id_numeric: Number,
    trading_ground_id: String,
    trading_ground_id_numeric: Number,
    date: Date,
    date_numeric: Number,
    buying_quote: String,
    buying_quote_numeric: Number,
    selling_quote: String,
    selling_quote_numeric: Number,
    indicative_price: String,
    indicative_price_numeric: Number,
    ytm_bid: String,
    ytm_bid_numeric: Number,
    ytm_offer: String,
    ytm_offer_numeric: Number,
    indicative_yield: String,
    indicative_yield_numeric: Number,
    overturn: String,
    overturn_numeric: Number,
    avar_price: String,
    avar_price_numeric: Number,
    indicative_price_type: String,
    clearance_profit_effect: String,
    clearance_profit_effect_numeric: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Cbonds', cbondsSchema)
