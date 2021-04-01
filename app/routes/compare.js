const express = require('express')
const router = express.Router()
const CompareCtrl = require('../controllers/compare-controller.js')

router.get('/values/:symbols/:date/:period', CompareCtrl.getMonthlyValues)
router.get('/days-of-month/:symbols/:date', CompareCtrl.getDaysOfMonthChanges)

module.exports = router