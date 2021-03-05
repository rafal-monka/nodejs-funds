
const mongoose = require('mongoose')

const simBuySchema = new mongoose.Schema({
    symbol: String, 
    occasion_id: String,
    run_date: Date,
    initDate: Date,
    initValue: Number,
    potentialYield: Number, 
    occasionParams: String,
    occasionStat: String,
    occasionTrend: String,
    buyParams: String,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('SimBuy', simBuySchema)
