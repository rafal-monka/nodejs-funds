
const mongoose = require('mongoose')

const roiSchema = new mongoose.Schema({
    symbol: String, 
    date: Date,
    value: Number,
    roi24: Number,
    roi18: Number,
    roi12: Number,
    roi9: Number,
    roi6: Number,
    roi3: Number,
    roi2: Number,
    roi1: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('Roi', roiSchema)
