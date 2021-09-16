const axios = require('axios')
const qs = require('querystring')

const utils = require("./libs/utils.js")
const Launcher = require("./libs/launcher.js")
const TFI = require('../config/TFI')
const TFIMetaDataCtrl = require('./controllers/tfi-controller')
const TFIvalues = require('./models/tfi-values-model')

const BASE_URL = 'https://ts-api.cnbc.com/harmony/app/charts/1Y.json?symbol='

const deleteRecords = (symbol) => {
    console.log('delete', symbol)
    TFIvalues.deleteMany({symbol: symbol}, function(err, result) {} )  
}

exports.callFunction = async (tfi) => {
    console.log(new Date(), 'cnbc-loader.callFunction[1]', tfi.symbol)

    let res = await TFIMetaDataCtrl.read(tfi.symbol)
    // let dateFrom = new Date()
    // let dateTo = new Date()
    if (res === null) {
        TFIMetaDataCtrl.create(tfi.source, tfi.symbol, tfi.name, null, null, null, null)
    } else {
        //console.log(new Date(), 'cnbc-loader.callFunction[2]', tfi.symbol)
        await TFIMetaDataCtrl.update(tfi.symbol, {
            status: 'RUNNING',
            errorMsg: ''
        })
    }
    
    try {
        //console.log(new Date(), 'HTTP...', tfi.symbol)
        return axios.get(BASE_URL+tfi.symbol, {} )
    } catch (error) {
        console.error(error);
    }
}

exports.callbackFunction = (item, value)=> {
    console.log(new Date(), 'cnbc-loader.callbackFunction', item.symbol)
    
    TFIMetaDataCtrl.read(item.symbol).then( res => {
        console.log('value.barData.priceBars', value.data.barData.priceBars[0])
        
        let arr = value.data.barData.priceBars
            .filter(row=>( res.lastDate === null || new Date(row.tradeTimeinMills) > new Date(res.lastDate)) )    
            .map(row => {
            return { 
                symbol: item.symbol, 
                date: new Date(row.tradeTimeinMills),
                value: row.close
        }})
        
        console.log('cnbc-values-loader. callbackFunction arr.length', arr[arr.length-1])
        if (arr.length>0) {
            // deleteRecords(item.symbol)
            TFIvalues.insertMany(arr, function (err, docs) {
                if (err){ 
                    console.error(err);
                    TFIMetaDataCtrl.update(item.symbol, {
                        status: 'ERROR',
                        errorMsg: err.toString().substring(0,100)
                    })
                } else {
                    //console.log("cnbc-values-loader. Multiple documents inserted to Collection", docs.length);
                    TFIMetaDataCtrl.update(item.symbol, {
                        initDate: (res.initDate === null) ? arr[0].date : res.initDate,
                        lastDate: arr[arr.length-1].date,
                        status: 'OK',
                        errorMsg: 'count: '+arr.length
                    })
                }
            })
        } else {
            TFIMetaDataCtrl.update(item.symbol, {
                status: 'OK',
                errorMsg: 'No new data (CNBC)'
            })
        }

    })
}