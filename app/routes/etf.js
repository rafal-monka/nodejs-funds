const express = require('express')
const router = express.Router()
const ETFCtrl = require('../controllers/etf-controller.js')

router.get('/test', ETFCtrl.test)

module.exports = router 