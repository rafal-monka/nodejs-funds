const Fund = require('./models/funds-model')
const Investment = require('./models/investments-model')
const Dictionary = require('./models/dicts-model')
const Result = require('./models/result-model')
const RoiController = require('./controllers/rois-controller.js')
const TFIvalues = require('./models/tfi-values-model')

exports.getDictionary = async () => {
    let res = await Dictionary.find({})
    return res
}

exports.getFundsValues = () => {
    return new Promise(async function(resolve, reject) {
        try {
            let fundsValues = await Fund.find({})
            resolve(fundsValues);
        } catch (e) {
            reject('getFundsValues. SOMETHING WRONG '+e)
        }
    })
}

exports.storeResult = (obj) => {
    Result.insertMany(obj)
    // let result = new Result(obj)
    // result.save()
        .then(function (res ){
            //console.log(res)
        })
        .catch(e => {
            console.log('Error in storeResult()', e)
        })
}

exports.delete = (symbol) => {
    Fund.deleteMany({symbol: symbol}, function (err, docs) {
        console.log('Deleted')
    })    
}

exports.store = (symbol, date, value) => {
    Fund.find( {symbol: symbol, date: date}, function (err, docs) {
        if (docs.length===0) {
            //console.log('Storing fund '+symbol+' for date '+date.toISOString().substr(0,10)+' with value of '+value)
            let fund = new Fund({
                symbol: symbol,
                date: date,
                value: value
            })
            fund.save()
                .then(function (result ){
                    //console.log(result)                       
                })
                .catch(e => {
                    console.log('Error in Fund.save()', e)
                })
        } else {
            //console.log('Fund '+symbol+' for date '+date.toISOString().substr(0,10)+' already exists')
            if (value === docs[0].value) {
                //console.log('OK values are the same.')
            } else {
                console.log('ERROR different values. Fund '+symbol+' for date '+date.toISOString().substr(0,10)+' '+value+' <> '+docs[0].value)
            }
        }

        //###only these funds @@@HERE!!!
        //###REM when migrate
        if (['PEK-OBL', 'NN-OBL', 'SAN-OBLP', 'SAN-OBL', 'SKB-OBL', 'QUE-DLK'].indexOf(symbol) > -1) RoiController.calcFundROI(symbol, 1)
    })
}

exports.storeInvestment = (inv) => {
    Investment.find( {symbol: inv.symbol, dateStart: inv.dateStart}, function (err, docs) {
        if (docs.length===0) {
            console.log('Storing Investment '+inv.symbol+' for date '+inv.date)
            let investment = new Investment(inv)
            investment.save()
                .then(function (result ){
                    console.log(result)
                })
                .catch(e => {
                    console.log('Error in Investment.save()', e)
                })
        } else {
            console.log('Investment '+inv.symbol+' for date '+inv.date+' already exists')
            if (inv.capital === docs[0].capital) {
                console.log('OK capital is the same.')
            } else {
                console.log('ERROR different capital values')
            }
        }
    })
}

exports.checkFundsAgaistTFIvalues = async () => {
    console.log('checkFundsAgaistTFIvalues()')
    const CONST_MIN_DATE = new Date("2020-06-30")

    let dict = await Dictionary.find()
    console.log('dict', dict)

    let funds = await Fund.find({
        date: { $gte: CONST_MIN_DATE }
    }).sort({date: 1})
    // console.log('funds', funds[0])

    let tfivalues = await TFIvalues.find({
        date: { $gte: CONST_MIN_DATE }
    }).sort({date: 1})
    // console.log('tfivalues', tfivalues[0])

    dict.forEach(dict => {
        console.log('Fund', dict.symbol)
        let _funds = funds.filter(item => item.symbol === dict.symbol)
        let _tfivalues = tfivalues.filter(item => item.symbol === dict.moneyplsymbol)
        //console.log(dict.symbol, '[0]', _funds[0], _tfivalues[0])

        //Funds vs TFIvalues
        _funds.map(fund => {
            let inx = _tfivalues.findIndex(tfi => tfi.date.getTime() === fund.date.getTime())
            if (inx >-1) {
                if (fund.value !== _tfivalues[inx].value) {
                    console.log(fund.symbol, dict.moneyplsymbol, fund.date, 'Value diff', fund.value, _tfivalues[inx].value)
                } else {
                    //console.log('Value OK', fund.symbol, fund.date)
                }
            } else {
                console.log(fund.symbol, dict.moneyplsymbol, fund.date, 'No value in TFIvalues', fund.value)
            }
        })

        //TFIvalues vs Funds
        _tfivalues.map(tfi => {
            let inx = _funds.findIndex(fund => fund.date.getTime() === tfi.date.getTime())
            if (inx >-1) {
                if (tfi.value !== _funds[inx].value) {
                    console.log(dict.symbol, tfi.symbol, tfi.date, 'Value diff', tfi.value, _funds[inx].value)
                } else {
                    //console.log('Value OK', dict.symbol, tfi.date)
                }
            } else {
                console.log(dict.symbol, tfi.symbol, tfi.date, 'No value in Funds', tfi.value)
                //@@@store(dict.symbol, new Date(tfi.date), tfi.value)
            }
        })
        
    })

}