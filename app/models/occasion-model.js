
const mongoose = require('mongoose')

const occasionSchema = new mongoose.Schema({
    mode: String,
    symbol: String, 
    run_date: Date,
    run_startOfPeriod: Date,
    run_params: String,
    minTFIValuesDate: Date,
    finding: String,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Occasion', occasionSchema)
