
const mongoose = require('mongoose')

const TFIMetaDataSchema = new mongoose.Schema({
    symbol: String,
    name: String,
    initDate: Date,
    lastDate: Date,
    frameDateFrom: Date,
    frameDateTo: Date,
    direction: Number,
    status: String,
    lra: Number,
    lrb: Number,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('TFIMetaData', TFIMetaDataSchema)
