const express = require('express')
const router = express.Router()
const CalculateStatsCtrl = require('../controllers/calculate-stats-controller.js')

router.get('/monthly/values/:symbols/:date/:period', CalculateStatsCtrl.getMonthlyValues)


module.exports = router