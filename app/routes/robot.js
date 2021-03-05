const express = require('express')
const router = express.Router()
const RobotCtrl = require('../controllers/robot-controller.js')

router.get('/simulate/pick/:symbol', RobotCtrl.simulatePick)
router.get('/simulate/launch-pick/:symbols', RobotCtrl.launchSimulatePick)
router.get('/simulate/launch-buy/:symbols', RobotCtrl.launchSimulateBuy)
router.get('/simulate/launch-sell/:symbols', RobotCtrl.launchSimulateSell)
router.get('/simulate/occasions/:symbols', RobotCtrl.getSimOccasions)

module.exports = router