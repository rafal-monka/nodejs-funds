const Fund = require('./models/funds-model')

exports.store = (symbol, code, date, value) => {
    Fund.find( {symbol: symbol, date: date}, function (err, docs) {
        if (docs.length===0) {
            console.log('Storing fund '+symbol+' for date '+date+' with value of '+value)
            let fund = new Fund({
                symbol: symbol,
                code: code,
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
            console.log('Fund '+symbol+'for date '+date+' already exists')
            if (value === docs[0].value) {
                console.log('OK values are the same.')
            } else {
                console.log('ERROR different values')
            }
        }
    })
}