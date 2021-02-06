const express = require('express')
const router = express.Router()
const IndicatorsController = require('../controllers/indicators-controller.js')

router.get('/', IndicatorsController.getIndicators)

module.exports = router