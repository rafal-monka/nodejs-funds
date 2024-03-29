const express = require('express')
const router = express.Router()
const ObserveCtrl = require('../controllers/observe-controller.js')

router.get('/krugerrand', ObserveCtrl.observeKrugerrand)
router.get('/all/:summary', ObserveCtrl.observeAll)

module.exports = router