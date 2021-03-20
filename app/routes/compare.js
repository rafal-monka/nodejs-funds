const express = require('express')
const router = express.Router()
const CompareCtrl = require('../controllers/compare-controller.js')

router.get('/values/:symbols/:date/:period', CompareCtrl.getMonthlyValues)

module.exports = router