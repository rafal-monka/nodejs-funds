const email = require("../libs/email")
const Launcher = require("../libs/launcher.js")
const TFI = require('./../../config/TFI.js')
const TFIValues = require('./../models/tfi-values-model')
const Funds = require('./../models/funds-model')
const TFIMetaData = require('./../models/tfi-metadata-model')
const TFILook = require('./../models/tfi-look-model')
const bankierLoader = require("../bankier-values-loader.js")
const analizyLoader = require("../analizy-values-loader.js")
const ETFEODLoader = require("../etf-eodhistoricaldata-values-loader.js")
const CNBCLoader = require("../cnbc-values-loader.js")
const wss = require('./../../wss')
const { json } = require("express")
const e = require("express")

const CONST_COPY_MIN_DATE = new Date("2020-01-01")

exports.getExport = (req, res, next) => { 
    let query = {}
    if (req.params.symbols !== '*') {
        //query = {symbol: req.params.symbol}  
        let symbols = req.params.symbols.split(',').map(item => {return {symbol: item}})
        //console.log(symbols)    
            //let query = multi ? { $or: [ {symbol: 'TFI4409'}, {symbol: 'TFI8172'} ] } : { symbol: req.params.symbol } 
        
        query = { $or: symbols }
    }

    TFIMetaData.find(query).then(function (result) {
        let output = result.map(tfi => {
            let dataStat = JSON.parse(tfi.dataStat)
            return {
                symbol: tfi.symbol,
                min1: dataStat.minMaxWithout202003[0],
                max1: dataStat.minMaxWithout202003[1],
                min: dataStat.minMax[0],
                max: dataStat.minMax[1],
                dataROI_value: dataStat.dataROI.value,
                dataROI_from: dataStat.dataROI.dateFrom,
                dataROI_dateTo: dataStat.dataROI.dateTo,
                dataROI_days: dataStat.dataROI.days,
                dataYearAvgYield: dataStat.dataYearAvgYield
            }
        })
        res.status(200).json(output)            
    })
    .catch (next)            
}

exports.read = (symbol) => {
    return TFIMetaData.findOne({symbol: symbol})    
}

exports.copyValues = (req, res, next) => {
    console.log('from '+req.params.symbolfrom+' to '+req.params.symbolto)
    Funds
        .find({symbol: req.params.symbolto})
        .sort({date: 1})
        .then(result=>{
            let minDate
            if (result.length>0) {
                minDate = result.reduce((min, p) => p.date < min ? p.date : min, result[0].date)    
            } else {
                minDate = new Date()
            }
            console.log('minDate',minDate)

            TFIValues
                .find({
                    symbol: req.params.symbolfrom, 
                    date: {
                        $lt: new Date(minDate), 
                        $gte: CONST_COPY_MIN_DATE
                    }
                })
                .sort({date: -1})
                .then(result=>{
                    let arr = result.map(item=>{
                        return {
                            symbol: req.params.symbolto,
                            date: item.date,
                            value: item.value
                        }
                    })
                    Funds.insertMany(arr, function (err, docs) {
                        if (err){ 
                            console.error("tfi-controller.copyValues", err)
                        } else {
                            console.log("tfi-controller.copyValues. Multiple documents inserted to Funds", docs.length);                            
                        }
                    })

                    res.status(200).json({
                        period: 'Copying... from '+req.params.symbolfrom+' to '+req.params.symbolto,
                        minDate: minDate,
                        dateLast: result[0],
                        dateFirst: result[result.length-1]
                    }) 
                })
        })         
}

exports.create = async (source, symbol, name, initDate, lastDate, frameDateFrom, frameDateTo) => {
    let md = new TFIMetaData({
        source: source,
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
    //console.log(symbol, 'tfi-controller.update', obj.status)
    obj.updated_at = new Date()
    let result = await TFIMetaData.findOneAndUpdate({symbol: symbol}, obj, {new: true} /*Note: {new: true} must be to return updated value!!!*/, () => {})
    //console.log(symbol, 'tfi-controller.update.call notify', result.status)
    this.notifyClient(999999, 'METADATA-UPDATE', symbol, result)
}

exports.getMetadata = (req, res, next) => {
    let query = {}
    if (req.params.symbol !== '*') {
        //query = {symbol: req.params.symbol}  
        let symbols = req.params.symbol.split(',').map(item => {return {symbol: item}})
        //console.log(symbols)    
            //let query = multi ? { $or: [ {symbol: 'TFI4409'}, {symbol: 'TFI8172'} ] } : { symbol: req.params.symbol } 
        
        query = { $or: symbols }
    }
    TFIMetaData.find(query).then(function (result) {
        res.status(200).json(result)            
    })
    .catch (next) 
}

exports.getLook = (req, res, next) => {
    TFILook.find({symbol: req.params.symbol}).then(function (result) {
        res.status(200).json(result)            
    })
    .catch (next) 
}

exports.daleteValues = (req, res, next) => {
    TFIValues.deleteMany({symbol: req.params.symbol}, function(err, result) {} )
    res.status(200).json('Deleting...'+req.params.symbol)    
}

exports._launchLoadValues = (wssClientID, currentDate, symbols) => {
    let count = [0, 0]
    console.log(new Date(), 'tfi-controller._launchLoadValues', symbols)    
    let timestampStart
    this.currentDate = currentDate
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        (item)=>{ 
            //console.log(new Date(), 'call item:', item)
            switch (item.source.toUpperCase()) {
                //OLD:case 'MONEY': return moneyValueLoader.callFunction(item); break;
                case 'BANKIER': return bankierLoader.callFunction(item); break;
                case 'ANALIZY': return analizyLoader.callFunction(item); break;
                case 'ETFEOD': return ETFEODLoader.callFunction(item); break;  
                case 'CNBC': return CNBCLoader.callFunction(item); break;              
                default: console.log('Error callFunction. Item source '+item.source+' not supported') 
            }
        },
        //callbackFunction,
        (item, value)=>{ 
            console.log(new Date(), 'callback item:', item.symbol)
            switch (item.source.toUpperCase()) {
                //OLD:case 'MONEY': count[0] += moneyValueLoader.callbackFunction(item, value); break;
                case 'BANKIER': bankierLoader.callbackFunction(item, value); break;
                case 'ANALIZY': analizyLoader.callbackFunction(item, value); break;
                case 'ETFEOD': ETFEODLoader.callbackFunction(item, value); break;
                case 'CNBC': CNBCLoader.callbackFunction(item, value); break;
                default: console.log('Error callbackFunction. Item source '+item.source+' not supported') 
            }
        },        
        //catchFunction
        (error, item)=> {
            console.log('Launcher catchFunction', error.toString().substring(0,100), item.symbol)
            this.update(item.symbol, {                        
                status: 'ERROR',
                errorMsg: error.toString().substring(0,100)+(error.response?'\n'+error.response.data:'')
            })
        },
        //finalCallBack
        (param) => {         
            let timestampEnd = new Date()
            console.log('tfi-controller _launchLoadValues final', timestampStart, timestampEnd, param.length) 
            if (false) email.sendEmail(' TFI/ETF values loaded '+new Date(), 
                        '<div><pre>timeStart: '+timestampStart+', timeEnd:'+timestampEnd+', duration:'+(timestampEnd-timestampStart)/1000+'<br>'+JSON.stringify(count)+'</pre></div>'
                           
            )                                                     
        } 
    );
    timestampStart = new Date()
    pad.run();    
}

exports.loadTFIValues = (req, res, next) => {
    // console.log('loadTFIValues', req.params.symbols)
    let symbols = []
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',') 
        this._launchLoadValues(0, new Date(), symbols)
        res.json('Loading started for '+symbols)
    } else {
        let query = {}
        let self = this
        TFIMetaData.find(query).then(function (result) {
            let symbols = result.map(res => res.symbol)
            self._launchLoadValues(99999, new Date(), symbols) 
            res.status(200).json('Loading started for '+symbols)           
        })
    }          
}

exports.getValuesDate = (req, res, next) => {  
    //console.log('getValues req.params.symbol', req.params.symbol)
        //let multi = req.params.symbol.indexOf(',') > -1
        let symbols = req.params.symbol.split(',').map(item => {return {symbol: item}})
    //console.log(symbols)    
        //let query = multi ? { $or: [ {symbol: 'TFI4409'}, {symbol: 'TFI8172'} ] } : { symbol: req.params.symbol } 
        let minDate = new Date(req.params.date)
// console.log('minDate', minDate) 
        let query = { $or: symbols, date: {$gte: minDate} }
    //    console.log('query', query)
    
        TFIValues.find( query ) 
            .then(function (result) {
                //console.log(result.length) 
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
                                                    .map(val => [
                                                        val[0],
                                                        val[1],
                                                        Math.round(100*(val[1]-arr[item].data[0][1])/arr[item].data[0][1] * 100)/100,
                                                        new Date(val[0])
                                                    ])
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

exports.getValues = (req, res, next) => {  
//console.log('getValues req.params.symbol', req.params.symbol)
    //let multi = req.params.symbol.indexOf(',') > -1
    let symbols = req.params.symbol.split(',').map(item => {return {symbol: item}})
//console.log(symbols)    
    //let query = multi ? { $or: [ {symbol: 'TFI4409'}, {symbol: 'TFI8172'} ] } : { symbol: req.params.symbol } 

    let query = { $or: symbols }
//    console.log('query', query)

    TFIValues.find( query ) 
        .then(function (result) {
            //console.log(result.length) 
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

exports.notifyClient = (wssClientID, event, symbol, data) => {
    //console.log(new Date(), 'notifyClient', event, symbol, data.status)
    let response = { 
        event: event,
        symbol: symbol,
        payload: data
    } 
    wss.notifyClient(wssClientID, response) 
}


exports._launchTag = (wssClientID, symbols, tag) => {
    console.log(new Date(), 'tfi-controller._launchTag', symbols)
    let pad = new Launcher(
        5, 
        symbols,
        //callFunction,
        (item)=>{ 
            //console.log(new Date(), 'call item:', item.symbol)
            return new Promise(function(resolve, reject) {
                resolve(item)
            })
        },
        //callbackFunction,
        (item, value)=>{ 

            this.update(item, {                        
                tags: tag.toUpperCase(),
                errorMsg: 'tagged '+tag,
                class: 'A',
                aolurl: '...'
            })
        },        
        //catchFunction
        (error, item)=> {
            console.log('Launcher catchFunction _launchTag', error.toString().substring(0,100), item)
            this.update(item, {                        
                status: 'ERROR',
                errorMsg: error.toString().substring(0,100)
            })
        },
        //finalCallBack
        (param) => {         
            console.log('tfi-controller _launchTag final') 
        } 
    );
    timestampStart = new Date()
    pad.run();    
}



//--------------------------------temp
// exports.tempAddFieldSourceOLD = () => {
//     console.log('tempAddFieldSource')
//     TFIMetaData.updateMany( {} ,
//         { $set: { source: 'MONEY'} },
//         function(err, result) {}
//     )
//     TFIMetaData.find( { symbol: 'TFI8172'} ).then(function (result) {
//         console.log('count', result.length)            
//     }) 
// }


//--------------------------------old
//const moneyValueLoader = require("./../money-values-loader.js")

// exports.loadMyBondTFIValues = (req, res, next) => {
//     console.log('TFI.myBondTFISymbols', TFI.myBondTFISymbols)  
//     req.params.symbols = TFI.myBondTFISymbols.split(",")
//     this.loadTFIValues(req, res, next)     
//     res.json('Loading started for '+TFI.myBondTFISymbols)
// }

// exports.loadValues = (wssClientID, symbols) => { 
//     launchLoadValues(wssClientID, new Date(), symbols)
// }

// exports.calcLRURLOLD = async (req, res, next) => {  
//     TFIValues
//         .find({ symbol: req.params.symbol }) 
//         .then(function (result) {
//             let ordered = result
//                             .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
//                             .map(val => [val.date.getTime(), val.value])

//             //
//             let avg = {
//                 x: Math.round(ordered.reduce((total, item) => total+item[0], 0) / ordered.length * 100) / 100,
//                 y: Math.round(ordered.reduce((total, item) => total+item[1], 0) / ordered.length * 100) / 100
//             }
//             let sumCounter = ordered.reduce((total, item) => total + (item[0] - avg.x)*(item[1] - avg.y), 0)
//             let sumDenominator = ordered.reduce((total, item) => total + Math.pow( (item[0] - avg.x), 2), 0)
//             let a = sumCounter / sumDenominator
//             let lr = {
//                 a: a,
//                 b: avg.y - a * avg.x
//             }
//             TFIMetaDataCtrl.update( req.params.symbol, {
//                 lra: lr.a,
//                 lrb: lr.b,
//                 updated_at: new Date()
//             }) 
//             res.json(lr)
//         })

//     //res.json('calcLR')
// }

// exports.notifyClientOLD = (wssClientID, response) => {
//     wss.notifyClient(wssClientID, response) 
// }

// exports.notifyErrorOLD = (wssClientID, event, error) => {
//     //wss
//     let response = { 
//         event: event,
//         payload: error
//     } 
//     wss.notifyClient(wssClientID, response)  
// }