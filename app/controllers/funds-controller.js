const Funds = require('./../models/funds-model')

const CONST_DATE_START = "2020-06-01"

exports.getAll = (req, res, next) => {  
    Funds.find({date: {$gt: new Date(CONST_DATE_START)}}).sort({symbol: 1, date: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}

