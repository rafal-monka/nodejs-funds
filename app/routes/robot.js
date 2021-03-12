const express = require('express')
const router = express.Router()
const RobotCtrl = require('../controllers/robot-controller.js')

router.get('/pick/:mode/:symbol', RobotCtrl.pickOccasion)
router.get('/launch-pick/:mode/:symbols', RobotCtrl.launchPickOccasion)

router.get('/simulate/launch-buy/:symbols', RobotCtrl.launchSimulateBuy)
router.get('/simulate/sell/:symbol', RobotCtrl.simulateSell)
router.get('/simulate/launch-sell/:symbols', RobotCtrl.launchSimulateSell)

router.get('/occasions/:mode/:symbols', RobotCtrl.getOccasions)
router.get('/delete-picks/:mode/:symbols', RobotCtrl.deletePicks)
router.get('/export-sells/:symbols', RobotCtrl.exportSells)


module.exports = router