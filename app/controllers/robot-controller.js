const Launcher = require("./../launcher.js")
const TFI = require('./../../config/TFI')
const robot = require("./../robot.js")
const SimOccasion = require('./../models/sim-occasions-model')
const SimBuy = require('./../models/sim-buy-model')
const TFIMetaDataCtrl = require('./tfi-controller')

exports.runSimPicks = (wssClientID, symbols) => {
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        callFunctionSimPick,
        //callbackFunction,
        (item, occasions)=> {
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

callFunctionSimPick = async (tfi) => {
// console.log('callFunctionSimPick callFunction', tfi)
    await TFIMetaDataCtrl.update(tfi.symbol, {
        status: 'CALC-STARTED',
        errorMsg: ''
    }) 

    //???###DELETE
    await SimOccasion.deleteMany({symbol: tfi.symbol}, function(err, result) {} ) 

    return new Promise(function(resolve, reject) {
        try {  
            setTimeout(          
                () => robot.pickOccasions(tfi.symbol)
                    .then(occasions => {
                        resolve( occasions )
                    })
                    .catch(e => {
                        reject(e.toString())
                    }) 
                , 100
            )
        } catch (e) {
            console.log(tfi.symbol, 'PROMISE EXCEPTION', e)
            reject('Promise is rejested'+e.toString())
        }
    })
}

exports.httpSimPick = (req, res, next) => { 
    console.log('httpSimPick', req.params.symbol)
    // let symbols = req.params.symbols.split(',').map(item => {return {symbol: item}})
    robot.pickOccasions(req.params.symbol)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

exports.simulateBuy = async (req, res, next) => {
    let symbols
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }    
    }
    let occasions = await SimOccasion.find(query).sort({symbol: 1, run_date: 1})    
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
    res.status(200).json('simulateBuy started')    
}

exports.simulateSell = (req, res, next) => { 
    let query = {}
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => ({symbol: item}))
        query = { $or: symbols }
    }

    robot.simulateSell(query)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

exports.getOccasions = (req, res, next) => {
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