const express = require('express')
const router = express.Router()
const FundsController = require('../controllers/funds-controller.js')

router.get('/', FundsController.getAll)

router.get('/data', FundsController.getData)

router.get('/delete/:symbol', FundsController.deleteData)


module.exports = router