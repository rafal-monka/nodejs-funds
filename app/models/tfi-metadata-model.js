
const mongoose = require('mongoose')

const TFIMetaDataSchema = new mongoose.Schema({
    source: String,
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
    lastDiff: Number,
    lastDiffPercent: Number,
    diff_lra: Number,
    diff_lrb: Number,
    errorMsg: String,
    CONST_LAST_PERIOD_VALUE: Number,
    CONST_LAST_PERIOD: Number,
    look: Number,
    dataStat: String,
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('TFIMetaData', TFIMetaDataSchema)
