const express = require('express')
const router = express.Router()
const TimeSeriesCtrl = require('../controllers/time-series-controller.js')

router.get('/heatmap/:symbols/:date', TimeSeriesCtrl.changeHeatMap)

router.get('/test', TimeSeriesCtrl.test)

module.exports = router