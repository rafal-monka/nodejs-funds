const Fund = require('./models/funds-model')
const Investment = require('./models/investments-model')
const Dictionary = require('./models/dicts-model')
const Result = require('./models/result-model')

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
            console.log('Storing fund '+symbol+' for date '+date.toISOString().substr(0,10)+' with value of '+value)
            let fund = new Fund({
                symbol: symbol,
                date: date,
                value: value
            })
            fund.save()
                .then(function (result ){
                    console.log(result)
                })
                .catch(e => {
                    console.log('Error in Fund.save()', e)
                })
        } else {
            console.log('Fund '+symbol+' for date '+date.toISOString().substr(0,10)+' already exists')
            if (value === docs[0].value) {
                console.log('OK values are the same.')
            } else {
                console.log('ERROR different values')
            }
        }
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