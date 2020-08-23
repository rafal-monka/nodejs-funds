const Investments = require('./../models/investments-model')

exports.getAll = (req, res, next) => {  
    Investments.find({}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}



