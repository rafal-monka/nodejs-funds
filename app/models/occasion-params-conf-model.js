const mongoose = require('mongoose')

const occasionParamsConfSchema = new mongoose.Schema({
    name: String,
    paramsPick: Object,
    paramsBuy: Object,
    paramsSell: Object, 
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date, default: null }
})

module.exports = mongoose.model('OccasionParamsConf', occasionParamsConfSchema)
