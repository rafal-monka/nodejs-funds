const TFIValues = require('../models/tfi-values-model')
const TFIMetaData = require('./../models/tfi-metadata-model')
const TFIMetaDataCtrl = require('./../money2/metadata')
const { json } = require('express')

exports.getAllMetadata = (req, res, next) => {  
    TFIMetaData.find().then(function (result) {
        res.status(200).json(result)            
    })
    .catch (next) 
}

exports.getValues = (req, res, next) => {  
    TFIValues.find({ symbol: req.params.symbol }) 
        .then(function (result) {
            let arr = []
            result.forEach(item => {
                //console.log('arr[item.symbol]', item.symbol, arr[item.symbol])
                if (arr[item.symbol] === undefined) arr[item.symbol] = {symbol: item.symbol, data: []}
                arr[item.symbol].data.push([
                    new Date(item.date).getTime(),
                    item.value                 
                ])
            }) 
            //console.log(arr)   

            let out = []
            Object.getOwnPropertyNames(arr).map((item, index) => {
                if (index>0) {
                    let ordered = arr[item].data.sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                    out.push({
                        name: arr[item].symbol, 
                        data: ordered
                    })
                }   
            })
            //console.log(JSON.stringify(out))
            //console.log(out)
            // arr.forEach(item )
            res.status(200).json(out)            
        })
        .catch (next) 
}

exports.calcLR = async (req, res, next) => {  
    TFIValues
        .find({ symbol: req.params.symbol }) 
        .then(function (result) {
            let ordered = result
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map(val => [val.date.getTime(), val.value])

            //
            let avg = {
                x: Math.round(ordered.reduce((total, item) => total+item[0], 0) / ordered.length * 100) / 100,
                y: Math.round(ordered.reduce((total, item) => total+item[1], 0) / ordered.length * 100) / 100
            }
            let sumCounter = ordered.reduce((total, item) => total + (item[0] - avg.x)*(item[1] - avg.y), 0)
            let sumDenominator = ordered.reduce((total, item) => total + Math.pow( (item[0] - avg.x), 2), 0)
            let a = sumCounter / sumDenominator
            let lr = {
                a: a,
                b: avg.y - a * avg.x
            }
            TFIMetaDataCtrl.update( req.params.symbol, {
                lra: lr.a,
                lrb: lr.b,
                updated_at: new Date()
            }) 
            res.json(lr)
        })

    //res.json('calcLR')
}