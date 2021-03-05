
const mongoose = require('mongoose')

const simSellSchema = new mongoose.Schema({
    symbol: String, 
    occasion_id: String,
    buy_id: String,
    run_date: Date,
    initDate: Date,
    initValue: Number,
    potentialYield: Number,
    sellDate: Date,
    sellValue: Number,
    resultYield: Number,
    resultDays: Number,
    occasionParams: String,
    occasionStat: String,
    occasionTrend: String,
    buyParams: String,
    sellParams: String,
    status: String, //HOLD, SOLD
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('SimSell', simSellSchema)
