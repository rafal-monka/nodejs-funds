const express = require('express')
const router = express.Router()
const InvestmentController = require('../controllers/investments-controller.js')

router.get('/', InvestmentController.getAll)

module.exports = router