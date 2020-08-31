const TFIMetaData = require('./../models/tfi-metadata-model')

exports.read = (symbol) => {
    return TFIMetaData.findOne({symbol: symbol})    
}

exports.create = async (symbol, name, initDate, lastDate, frameDateFrom, frameDateTo) => {
    let md = new TFIMetaData({
        symbol: symbol,
        name: name,
        initDate: initDate, 
        lastDate: lastDate, 
        frameDateFrom: frameDateFrom, 
        frameDateTo: frameDateTo,
        direction: -1,
        status: 'NEW'
    })
    await md.save()
}

exports.update = async (symbol, obj) => {
    await TFIMetaData.findOneAndUpdate({symbol: symbol}, obj, ()=> {})
}