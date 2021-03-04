const Launcher = require("./../launcher.js")
const TFI = require('./../../config/TFI')
const robot = require("./../robot.js")
const SimOccasion = require('./../models/sim-occasions-model')
const TFIMetaDataCtrl = require('./tfi-controller')

exports.runSimPicks = (wssClientID, symbols) => {
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        callFunctionSimPick,
        //callbackFunction,
        (item, occasions)=> {
            console.log('runSimPicks Launcher callbackFunction', occasions.length)

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
                    console.log("Robot-controller. Multiple documents inserted to SimOccasion Collection", docs.length);
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
console.log('callFunctionSimPick callFunction', tfi)
    await TFIMetaDataCtrl.update(tfi.symbol, {
        status: 'CALC-STARTED'
    }) 
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

// SimPick = async (wssClientID, symbol, resolve, reject) => { 
//     // let symbols = symbol.split(',').map(item => {return {symbol: item}})
//     console.log('SimPick', symbols)    
// }

exports.httpSimPick = (req, res, next) => { 
    console.log('httpSimPick', req.params.symbol)
    // let symbols = req.params.symbols.split(',').map(item => {return {symbol: item}})
    robot.pickOccasions(req.params.symbol)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)

    // res.status(200).json(symbols[0].symbol)
    // return 
return
    //###run [symbols]
    robot.pickOccasions(symbols[0].symbol)
        .then(occasions => {

            console.log('occasions.length', occasions.length)
            let occasionsSerialized = occasions.map(occasion => ({
                symbol: occasion.symbol,
                run_date: occasion.run_date,
                run_startOfPeriod: occasion.run_startOfPeriod,
                minTFIValuesDate: occasion.minTFIValuesDate,
                run_params: JSON.stringify(occasion.run_params),
                finding: JSON.stringify(occasion.finding)
            }))

            //storage
            if (true) SimOccasion.insertMany(occasionsSerialized, function (err, docs) {
                if (err){ 
                    console.error(err);
                    // TFIMetaDataCtrl.update(item.symbol, {
                    //     status: 'ERROR',
                    //     errorMsg: err.toString().substring(0,100)
                    // })
                } else {
                    console.log("Robot-controller. Multiple documents inserted to SimOccasion Collection", docs.length);
                    // TFIMetaDataCtrl.update(item.symbol, {
                    //     initDate: (res.initDate === null) ? arr[0].date : res.initDate,
                    //     lastDate: arr[arr.length-1].date,
                    //     status: 'OK',
                    //     errorMsg: ''
                    // })
                }
            })
            // 
            res.status(200).json(occasions)
        })
        //.catch (next)
}

exports.simulateBuy = (req, res, next) => {
    robot.simulateBuy(query)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next) 
}

exports.simulateSell = (req, res, next) => { 
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