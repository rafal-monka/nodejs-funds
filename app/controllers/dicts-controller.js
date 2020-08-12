const Dict = require('./../models/dicts-model')

exports.getAll = (req, res, next) => {  
    Dict.find({}).sort({symbol: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}

