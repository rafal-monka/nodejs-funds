const Launcher = require("./../launcher.js")
const TFI = require('./../../config/TFI.js')
const TFIValues = require('./../models/tfi-values-model')
const TFIMetaData = require('./../models/tfi-metadata-model')
const TFILook = require('./../models/tfi-look-model')
const moneyValueLoader = require("./../money-values-loader.js")
const bankierLoader = require("../bankier-values-loader.js")
const analizyLoader = require("../analizy-values-loader.js")
const wss = require('./../../wss')

exports.read = (symbol) => {
    return TFIMetaData.findOne({symbol: symbol})    
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
// console.log('tfi-controller.update')
    obj.updated_at = new Date()
    let result = await TFIMetaData.findOneAndUpdate({symbol: symbol}, obj, ()=> {})
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
            console.log(result.length) 
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

exports.loadValues = (wssClientID, symbols) => { 
    // symbolsMoney = symbols.filter(item=>item.indexOf('TFI')>-1)
    // symbolsBankier = symbols.filter(item=>item.indexOf('BANKIER')>-1)
    // console.log('symbolsMoney', symbolsMoney)
    // console.log('symbolsBankier', symbolsBankier)

    run(wssClientID, new Date(), symbols)

    //moneyValueLoader.run(wssClientID, new Date(), symbolsMoney)
    //bankierLoader.run(wssClientID, new Date(), symbolsBankier)
}

exports.notifyClient = (wssClientID, event, symbol, data) => {
    //console.log('notifyClient', event, symbol)
    let response = { 
        event: event,
        symbol: symbol,
        payload: data
    } 
    wss.notifyClient(wssClientID, response) 
}


run = (wssClientID, currentDate, symbols) => {
    this.currentDate = currentDate
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        (item)=>{ 
            console.log('item:',item)
            switch (item.source.toUpperCase()) {
                case 'MONEY': return moneyValueLoader.callFunction(item); break;
                case 'BANKIER': return bankierLoader.callFunction(item); break;
                case 'ANALIZY': return analizyLoader.callFunction(item); break;
                default: console.log('Error callFunction. Item source '+item.source+' not supported') 
            }
        },
        //callbackFunction,
        (item, value)=>{ 
            console.log('item:',item)
            switch (item.source.toUpperCase()) {
                case 'MONEY': return moneyValueLoader.callbackFunction(item, value); break;
                case 'BANKIER': return bankierLoader.callbackFunction(item, value); break;
                case 'ANALIZY': return analizyLoader.callbackFunction(item, value); break;
                default: console.log('Error callbackFunction. Item source '+item.source+' not supported') 
            }
        },        
        //catchFunction
        (error, item)=> {
            console.log('Launcher catchFunction', error.toString().substring(0,100), item)
            this.update(item.symbol, {                        
                status: 'ERROR',
                errorMsg: error.toString().substring(0,100)
            })
        },
        //finalCallBack
        (param) => {         
            console.log('final', param)                                                         
        } 
    );
    pad.run();    
}

//--------------------------------temp
exports.tempAddFieldSource = () => {
    console.log('tempAddFieldSource')
    TFIMetaData.updateMany( {} ,
        { $set: { source: 'MONEY'} },
        function(err, result) {}
    )
    TFIMetaData.find( { symbol: 'TFI8172'} ).then(function (result) {
        console.log('count', result.length)            
    }) 
}

//--------------------------------old
exports.calcLRURL = async (req, res, next) => {  
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

exports.notifyClientOLD = (wssClientID, response) => {
    wss.notifyClient(wssClientID, response) 
}

exports.notifyErrorOLD = (wssClientID, event, error) => {
    //wss
    let response = { 
        event: event,
        payload: error
    } 
    wss.notifyClient(wssClientID, response)  
}