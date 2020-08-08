const Funds = require('./../models/funds-model')

exports.getAll = (req, res, next) => {  
    Funds.find({}).sort({symbol: 1, date: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}

