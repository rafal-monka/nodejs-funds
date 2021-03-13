const fs = require('fs')
const jsonexport = require('jsonexport')

const Launcher = require("./../launcher.js")
const TFI = require('./../../config/TFI')
const robot = require("./../robot.js")

const dicts = require('../models/dicts-model')

const Occasion = require('../models/occasion-model')
const SimBuy = require('./../models/sim-buy-model')
const SimSell = require('./../models/sim-sell-model')
const SimParamsConf = require('./../models/sim-params-conf-model')
const TFIMetaDataCtrl = require('./tfi-controller')
const { json } = require('express')


const EXCLUDE_SYMBOLS = ['SUP14', 'SUP08', 'KAH32', 'SUP05', 'QRS32', 'CAB64', 'ALL91', 
                         'MWIG40TR','PCS55','SWIG80','SWIG80TR','WIG','GAMES','WIG-INFO']

exports._launchPickOccasion = (wssClientID, symbols, mode) => {
    console.log('robot-controller._launchPickOccasion', mode, symbols)

    symbols = TFI.getList(symbols)
    symbols = symbols.filter(item => EXCLUDE_SYMBOLS.indexOf(item.symbol) === -1)    
//console.log(symbols)
//    return
    let pad = new Launcher(
        5, 
        symbols,//.slice(0,1), 
        //callFunction,
        async (tfi) => {
            console.log(tfi.symbol, 'robot-controller.runOccasionPicks callFunction', mode)
            await TFIMetaDataCtrl.update(tfi.symbol, {
                status: 'CALC-STARTED',
                errorMsg: 'Mode:'+mode
            }) 
                
            return new Promise(function(resolve, reject) {
                try {  
                    robot.pickOccasions(tfi.symbol, mode)
                        .then(occasions => {
                            resolve( occasions )
                        })
                        .catch(e => {
                            reject(e.toString())
                        }) 
                } catch (e) {
                    console.log(tfi.symbol, 'PROMISE EXCEPTION', e)
                    reject('Promise is rejested'+e.toString())
                }
            })
        },
        //callbackFunction,
        (item, occasions)=> {
            console.log(item.symbol, 'robot-controller.runOccasionPicks callbackFunction', mode, occasions.length)
            //store in database
            let occasionsSerialized = occasions.map(occasion => ({
                mode: occasion.mode,
                symbol: occasion.symbol,
                run_date: occasion.run_date,
                run_startOfPeriod: occasion.run_startOfPeriod,
                minTFIValuesDate: occasion.minTFIValuesDate,
                run_params: JSON.stringify(occasion.run_params),
                finding: JSON.stringify(occasion.finding)
            }))
            //insert
            if (true) Occasion.insertMany(occasionsSerialized, function (err, docs) {
                if (err){ 
                    console.error(err);
                    TFIMetaDataCtrl.update(item.symbol, {
                        status: 'ERROR',
                        errorMsg: err.toString().substring(0,100)
                    })
                } else {
                    //console.log("Robot-controller. Multiple documents inserted to Occasion Collection", docs.length);
                    TFIMetaDataCtrl.update( item.symbol, {
                        status: 'DONE',
                        errorMsg: 'Occasions: ['+mode+']'+JSON.stringify(occasions.length)
                    }) 
                }
            })

            return true
        },
        //catchFunction
        (error, item)=> {
            console.log('Launcher catchFunction', error, item)
            TFIMetaDataCtrl.update(item.symbol, {                        
                status: 'ERROR',                        
                errorMsg: error
            })
        },
        //finalCallBack
        (param) => {         
            console.log('runStats final')                                                         
        } 
    );
    pad.run();   
}

//end point to return occasion picks (only for one symbol)
exports.pickOccasion = (req, res, next) => { 
    console.log('pickOccasion', req.params.symbol)
    robot.pickOccasions(req.params.symbol, req.params.mode)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

//entry point to delete picks
exports.deletePicks = (req, res, next) => { 
    console.log('deletePicks', req.params.symbols)
    let symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
    let query = { $or: symbols, mode: req.params.mode }
    Occasion.deleteMany(query, function(err, result) {} )
    res.status(200).json('Deleting pick...mode='+req.params.mode+': '+JSON.stringify(symbols))
}

//entry point to launch occasion picks
exports.launchPickOccasion = async (req, res, next) => {
    console.log('launchPickOccasion', req.params.symbols)
    let symbols = []
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',') 
    }
    this._launchPickOccasion(null, symbols, req.params.mode)
    res.status(200).json('launchPickOccasion started for mode='+req.params.mode+': '+symbols)
}

//entry point to launch simulation buy based on simulated occasions
exports.launchSimulateBuy = async (req, res, next) => {
    let symbols
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }    
    }
    let occasions = await Occasion.find(query).sort({symbol: 1})    
    symbols = [...new Set( occasions.map(x => x.symbol))]  

    // res.status(200).json(symbols)
    // return

    let pad = new Launcher(
        5, 
        symbols,
        //callFunction,
        async (symbol) => {
            await SimBuy.deleteMany({symbol: symbol}, function(err, result) {} )
            return new Promise(function(resolve, reject) {
                robot.simulateBuys(symbol)
                    .then(occasions => {
                        resolve( occasions )
                    })
                    .catch(e => {
                        reject(e.toString())
                    })
            })
        },
        //callbackFunction,
        (item, buys)=> {
            console.log(item, 'simulateBuy Launcher callbackFunction', buys.length)
            //insert
            if (true) SimBuy.insertMany(buys, function (err, docs) {
                if (err){ 
                    console.error(err);                    
                } else {
                    console.log(item, "Robot-controller. SimBuy.insertMany", docs.length);
                }
            })
        },
        //catchFunction
        (error, item)=> {
            console.log(item, 'simulateBuy Launcher catchFunction', error)
        },
        //finalCallBack
        (param) => {         
            console.log('simulateBuy Launcher final')                                                         
        } 
    );
    pad.run(); 
    res.status(200).json('simulateBuy started for '+symbols)    
}

//return simulation sell (only for one symbol)
exports.simulateSell = (req, res, next) => { 
    console.log('simulateSell', req.params.symbol)
    robot.simulateSells(req.params.symbol)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

//entry point to launch simulation sell based on simulated buys
exports.launchSimulateSell = async (req, res, next) => { 
    let symbols
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }    
    }
    let buys = await SimBuy.find(query)//.sort({symbol: 1})    
    symbols = [...new Set( buys.map(x => x.symbol))] 

    let pad = new Launcher(
        5, 
        symbols,
        //callFunction,
        async (symbol) => {
            await SimSell.deleteMany({symbol: symbol}, function(err, result) {} )
            return new Promise(function(resolve, reject) {
                robot.simulateSells(symbol)
                    .then(occasions => {
                        resolve( occasions )
                    })
                    .catch(e => {
                        reject(e.toString())
                    })
            })
        },
        //callbackFunction,
        (item, sells)=> {
            console.log(item, 'simulateSell Launcher callbackFunction', sells.length)
            //insert
            if (true) SimSell.insertMany(sells, function (err, docs) {
                if (err){ 
                    console.error(err);                    
                } else {
                    console.log(item, "Robot-controller. SimSell.insertMany", docs.length);
                }
            })
        },
        //catchFunction
        (error, item)=> {
            console.log(item, 'simulateSell Launcher catchFunction', error)
        },
        //finalCallBack
        (param) => {         
            console.log('simulateSell Launcher final')                                                         
        } 
    );
    pad.run(); 
    res.status(200).json('simulateSell started for '+symbols)    
}


//---------------------------------------------------------
exports.getOccasions = (req, res, next) => {
    let query = { mode: req.params.mode }
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols, mode: req.params.mode }
    }
    Occasion.find(query).sort({symbol: 1, run_date: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}

exports.exportSimSells = (req, res, next) => {
    let query = { }
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }
    }
    SimSell.find(query).sort({symbol: 1, run_date: 1}) 
        .then(function (result) {
            let output = result.map(res => {
                let occasionParams = JSON.parse(JSON.parse(res.occasionParams))
                let occasionStat = JSON.parse(res.occasionStat)
                let occasionTrend = JSON.parse(res.occasionTrend)
                let buyParams = JSON.parse(res.buyParams)
                let sellParams = JSON.parse(res.sellParams)
                return {
                    symbol: res.symbol,
                    buy_id: res.buy_id,
                    status: res.status,
                    run_date: res.run_date,
                    initDate: res.initDate,
                    initValue: res.initValue,
                    potentialYield: res.potentialYield, 
                    sellDate: res.sellDate,
                    sellValue: res.sellValue,
                    resultYield: res.resultYield,
                    resultDays: res.resultDays,
                    occasionParams_long_term_trend: occasionParams.long_term_trend,
                    occasionParams_period_length: occasionParams.period_length,
                    occasionParams_potential_full: occasionParams.potential_full,
                    occasionParams_potential_level: occasionParams.potential_level,
                    occasionParams_date_min_before: occasionParams.date_min_before,
                    occasionStat_max_min_diff: occasionStat.max_min_diff,
                    occasionStat_max_cur_diff: occasionStat.max_cur_diff,
                    occasionStat_max_cur_level: occasionStat.max_cur_level,
                    occasionStat_alpha: occasionStat.alpha,
                    occasionStat_beta: occasionStat.beta,
                    occasionStat_days_max_to_min: occasionStat.days_max_to_min,
                    occasionStat_days_min_to_cur: occasionStat.days_min_to_cur,
                    occasionStat_days_max_to_cur: occasionStat.days_max_to_cur, 
                    occasionTrend_yield_yearly: occasionTrend.yield_yearly,  
                    occasionTrend_cur_diff: occasionTrend.cur_diff, 
                    buyParams_buy_days_delay: buyParams.buy_days_delay,  
                    sellParams_sell_days_delay: sellParams.sell_days_delay,
                    sellParams_sell_threshold: sellParams.sell_threshold                  
                }
            })

            //https://github.com/kaue/jsonexport
            jsonexport(output, {rowDelimiter: ';'}, function(err, csv){
                if (err) res.status(200).json(err)
                // console.log(csv);
                fs.writeFileSync('download/data.csv', csv);
                res.status(200).json(output)
            });
            
        })
        .catch (next)
}


//temp
exports.saveSimParamsConf = (req, res, next) => {
    //let paramsConf = await 
    let s = new SimParamsConf({
        name: "Params",
        paramsPick: {
            long_term_trend: [5.0, 10.0, 15.0],
            period_length: [10, 20, 30, 40, 50, 60], //how deep look into the past before current (run) date
            potential_full: [5.0, 6.0, 7.0, 10.0, 15.0], //minimum difference between max value and min value
            potential_level: [0.5, 0.6, 0.7, 0.8, 0.9], //current value potentially can grow % of full potential
            date_min_before: [2, 3, 5, 7, 10] //minimum value date must occur N calendar days before current (run) date  
        },
        paramsBuy: {
            buy_days_delay: [2, 3, 4, 5, 6, 7]
        },
        paramsSell: {
            sell_days_delay: [3, 4, 5, 6, 7, 8],
            sell_threshold: [-1, 4.0, 6.0, 10.0, 15.0, 20.0] 
        }
    })
    s.save()
}