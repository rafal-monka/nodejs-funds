const Launcher = require("./../launcher.js")
const TFI = require('./../../config/TFI')
const robot = require("./../robot.js")
const SimOccasion = require('../models/sim-occasion-model')
const SimBuy = require('./../models/sim-buy-model')
const SimSell = require('./../models/sim-sell-model')
const TFIMetaDataCtrl = require('./tfi-controller')

// const CONST_SIMULATE = '#SIMULATE'

exports.launchOccasionPicks = (wssClientID, symbols, mode) => {
    console.log('robot-controller.launchOccasionPicks', mode, symbols)
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        //---###OLD: callFunctionSimPick,
        async (tfi) => {
            console.log(tfi.symbol, 'robot-controller.runOccasionPicks callFunction', mode)
            await TFIMetaDataCtrl.update(tfi.symbol, {
                status: 'CALC-STARTED',
                errorMsg: 'Mode:'+mode
            }) 
        
            //delete when in simulation mode
            if (mode === 'SIMULATION') await SimOccasion.deleteMany({symbol: tfi.symbol}, function(err, result) {} ) 
        
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
            console.log(item.symbol, 'robot-controller.runOccasionPicks callbackFunction', mode)
            //store in database
            let occasionsSerialized = occasions.map(occasion => ({
                symbol: occasion.symbol,
                run_date: occasion.run_date,
                run_startOfPeriod: occasion.run_startOfPeriod,
                minTFIValuesDate: occasion.minTFIValuesDate,
                run_params: JSON.stringify(occasion.run_params),
                finding: JSON.stringify(occasion.finding)
            }))
            //insert
            //@@@...sim/real
            if (true) SimOccasion.insertMany(occasionsSerialized, function (err, docs) {
                if (err){ 
                    console.error(err);
                    TFIMetaDataCtrl.update(item.symbol, {
                        status: 'ERROR',
                        errorMsg: err.toString().substring(0,100)
                    })
                } else {
                    //console.log("Robot-controller. Multiple documents inserted to SimOccasion Collection", docs.length);
                    TFIMetaDataCtrl.update( item.symbol, {
                        status: 'DONE',
                        errorMsg: 'Occasions: '+JSON.stringify(occasions.length)
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

//return simulation occasion picks (only for one symbol)
exports.simulatePick = (req, res, next) => { 
    console.log('simulatePick', req.params.symbol)
    robot.pickOccasions(req.params.symbol, 'SIMULATION')
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

//entry point to launch simulation occasion picks
exports.launchSimulatePick = async (req, res, next) => {
    let symbols = []
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',') 
    }
    this.launchOccasionPicks(null, symbols, 'SIMULATION')
    res.status(200).json('simulatePick started for '+symbols)
}

//entry point to launch simulation buy based on simulated occasions
exports.launchSimulateBuy = async (req, res, next) => {
    let symbols
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }    
    }
    let occasions = await SimOccasion.find(query).sort({symbol: 1})    
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
            console.log('simulateBuy Launcher callbackFunction', item, buys.length)
            //insert
            if (true) SimBuy.insertMany(buys, function (err, docs) {
                if (err){ 
                    console.error(err);                    
                } else {
                    console.log("Robot-controller. SimBuy.insertMany", docs.length);
                }
            })
        },
        //catchFunction
        (error, item)=> {
            console.log('simulateBuy Launcher catchFunction', error, item)
        },
        //finalCallBack
        (param) => {         
            console.log('simulateBuy Launcher final')                                                         
        } 
    );
    pad.run(); 
    res.status(200).json('simulateBuy started for '+symbols)    
}

//entry point to launch simulation sell based on simulated buys
exports.launchSimulateSell = async (req, res, next) => { 
    let symbols
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }    
    }
    let buys = await SimBuy.find(query).sort({symbol: 1})    
    symbols = [...new Set( buys.map(x => x.symbol))] 

    let pad = new Launcher(
        5, 
        symbols,
        //callFunction,
        async (symbol) => {
            //###@@@await SimSell.deleteMany({symbol: symbol}, function(err, result) {} )
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
            console.log('simulateSell Launcher callbackFunction', item, sells.length)
            //insert
            if (false) SimSell.insertMany(sells, function (err, docs) {
                if (err){ 
                    console.error(err);                    
                } else {
                    console.log("Robot-controller. SimSell.insertMany", docs.length);
                }
            })
        },
        //catchFunction
        (error, item)=> {
            console.log('simulateSell Launcher catchFunction', error, item)
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
exports.getSimOccasions = (req, res, next) => {
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }
    }
    SimOccasion.find(query).sort({symbol: 1, run_date: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}