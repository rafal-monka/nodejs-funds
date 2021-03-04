const express = require('express')
const router = express.Router()
const RobotCtrl = require('../controllers/robot-controller.js')

router.get('/pick/:symbol', RobotCtrl.httpSimPick)
router.get('/buy/:symbols', RobotCtrl.simulateBuy)
router.get('/sell/:symbols', RobotCtrl.simulateSell)
router.get('/occasions/:symbols', RobotCtrl.getOccasions)

module.exports = router