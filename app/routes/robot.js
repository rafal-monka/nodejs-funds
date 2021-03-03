const express = require('express')
const router = express.Router()
const RobotCtrl = require('../controllers/robot-controller.js')

router.get('/pick/:symbols', RobotCtrl.pickOccasions)
router.get('/buy/:symbols', RobotCtrl.simulateBuy)
router.get('/sell/:symbols', RobotCtrl.simulateSell)
router.get('/occasions/:symbols', RobotCtrl.getOccasions)

module.exports = router