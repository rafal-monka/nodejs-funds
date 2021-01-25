const express = require('express')
const router = express.Router()
const FundsController = require('../controllers/funds-controller.js')

router.get('/', FundsController.getAll)

router.get('/data', FundsController.getData)

module.exports = router