const express = require('express')
const router = express.Router()
const CbondsController = require('../controllers/cbonds-controller.js')

router.get('/', CbondsController.getAll)
router.get('/perform', CbondsController.perform)
router.get('/load', CbondsController.load)

module.exports = router