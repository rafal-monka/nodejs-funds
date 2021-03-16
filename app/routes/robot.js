const express = require('express')
const router = express.Router()
const RobotCtrl = require('../controllers/robot-controller.js')

router.get('/pick/:mode/:symbol', RobotCtrl.pickOccasion)
router.get('/launch-pick/:mode/:symbols', RobotCtrl.launchPickOccasion)
router.get('/occasions/:mode/:symbols', RobotCtrl.getOccasions)
router.get('/occasions-params-conf/:mode', RobotCtrl.getOccasionsParamsConf)

router.get('/delete-picks/:mode/:symbols', RobotCtrl.deletePicks)

router.get('/simulate/launch-buy/:symbols', RobotCtrl.launchSimulateBuy)
router.get('/simulate/sell/:symbol', RobotCtrl.simulateSell)
router.get('/simulate/launch-sell/:symbols', RobotCtrl.launchSimulateSell)
router.get('/simulate/export-sells/:symbols', RobotCtrl.exportSimSells)

router.get('/temp/save-occasion-params-sconf', RobotCtrl.saveOccasionParamsConf)
router.get('/testquery', RobotCtrl.testQuery)


module.exports = router