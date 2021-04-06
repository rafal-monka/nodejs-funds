const { json } = require('express')
const express = require('express')
const router = express.Router()
const UnitsCtrl = require('../controllers/units-controller.js')
const { resolve } = require('path')

router.post('/purchase', UnitsCtrl.purchaseUnits)
router.post('/redeem', UnitsCtrl.redeemUnits)
router.post('/rebuild-register', UnitsCtrl.rebuildRegister)
router.get('/register/:period/:date', UnitsCtrl.getRegister)
router.get('/register-full/:period/:date', UnitsCtrl.getFullRegister)
router.put('/clear-all', UnitsCtrl.clearAll)

router.post('/test-purchases', UnitsCtrl.testPurchases)
router.post('/test-redeems', UnitsCtrl.testRedeems)

module.exports = router