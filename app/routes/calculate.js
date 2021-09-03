const express = require('express')
const router = express.Router()
const CalculateStatsCtrl = require('../controllers/calculate-stats-controller.js')

router.get('/launch/:symbols', CalculateStatsCtrl.launchCalcStats)

router.get('/test-allocation', CalculateStatsCtrl.testAllocation)

router.get('/simulate-returns', CalculateStatsCtrl.simulateReturns)

module.exports = router