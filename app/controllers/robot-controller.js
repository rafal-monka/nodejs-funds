const robot = require("./../robot.js")
const SimOccasion = require('./../models/sim-occasions-model')

exports.pickOccasions = (req, res, next) => { 
    let symbols = []
    if (req.params.symbols !== '*') {
        symbols = req.params.symbols.split(',').map(item => {return {symbol: item}})       
    }

    // res.status(200).json(symbols[0].symbol)
    // return 

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
        query = {symbol: req.params.symbols} 
    }
    SimOccasion.find(query).sort({symbol: 1, run_date: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}