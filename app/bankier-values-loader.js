const axios = require('axios')
const qs = require('querystring')


const utils = require("./utils.js")
const Launcher = require("./launcher.js")
const TFI = require('../config/TFI')
const TFIMetaDataCtrl = require('./controllers/tfi-controller')
const TFIvalues = require('./models/tfi-values-model')

// 'https://www.bankier.pl/new-charts/get-data?date_from=946684800000&date_to=1612368578438&symbol=MWIG40&intraday=false&type=area'
const BASE_URL = 'https://www.bankier.pl/new-charts/get-data'//?date_from=1612003453272&date_to=1612262653272&symbol=MWIG40&intraday=false&type=area'
const CONST_PREFIX = 'BANKIER-'

const CONST_MIN_INIT_DATE = new Date("2020-01-01")

let currentDate



const deleteRecords = (symbol) => {
    console.log('delete', symbol)
    TFIvalues.deleteMany({symbol: symbol}, function(err, result) {} )  
}

// exports.run = (wssClientID, currentDate, symbols) => {
//     console.log(symbols, 'bankier-loader.run')

//     //TFIMetaDataCtrl.tempAddFieldSource()
//     //return 

//     this.currentDate = currentDate
//     let pad = new Launcher(
//         5, 
//         TFI.getList(symbols),//.slice(0,1), 
//         //callFunction,
//         callBankierFunction,
//         //callbackFunction,
//         callbackBankierFunction,
//         //catchFunction
//         (error, item)=> {
//             console.log('bankier-loader - Launcher catchFunction', error.toString().substring(0,100), item)
//             TFIMetaDataCtrl.update(item.symbol, {                        
//                 status: 'ERROR',
//                 errorMsg: error.toString().substring(0,100)
//             })
//         },
//         //finalCallBack
//         (param) => {         
//             console.log('final', param)                                                         
//         } 
//     );
//     pad.run();    
// }

exports.callFunction = async (tfi) => {
    console.log(tfi.symbol, 'bankier-loader.callFunction', tfi)

    let res = await TFIMetaDataCtrl.read(tfi.symbol)
    let dateFrom = new Date()
    let dateTo = new Date()
    
    if (res === null) {
        //('CREATE')
        dateFrom = CONST_MIN_INIT_DATE
        TFIMetaDataCtrl.create(tfi.source, tfi.symbol, tfi.name, dateFrom, dateTo, null, null)
    } else {
        //console.log('UPDATE', res.lastDate, res.lastDate.getTime())
        //@@@###
        dateFrom = new Date(res.lastDate.getTime()+1000) //add one second
        await TFIMetaDataCtrl.update(tfi.symbol, {
            lastDate: dateTo,
            status: 'RUNNING',
            errorMsg: ''
        })
    }
    //console.log('DATES', dateFrom, dateTo)
    // return
    let params = { 
            date_from: ''+dateFrom.getTime(),
            date_to: ''+dateTo.getTime(),
            symbol: tfi.symbol,
            intraday: false,
            type: 'area'
    }
    // params = {}
    //console.log('params', params)
    try {
        return axios.get(BASE_URL, {
            params: params
        })
    } catch (error) {
       console.error(error);
    }
}

exports.callbackFunction = (item, value)=> {
    //console.log(item.symbol, 'bankier-loader.callbackFunction', item, value.data.main.length)
    if (value.data.navigator === undefined) return
    let arr = value.data.main.map(row => {
        return { 
            symbol: item.symbol, 
            date: new Date(row[0]),
            value: row[1]
    }})

    //@@@
    //deleteRecords(item.symbol)
    TFIvalues.insertMany(arr, function (err, docs) {
        if (err){ 
            console.error(err);
            TFIMetaDataCtrl.update(item.symbol, {
                status: 'ERROR',
                errorMsg: err.toString().substring(0,100)
            })
        } else {
            console.log("Multiple documents inserted to Collection", docs.length);
            TFIMetaDataCtrl.update(item.symbol, {
                status: 'OK',
                errorMsg: ''
            })
        }
    });

    return arr
}