const express = require('express')
const router = express.Router()
const TfiValuesController = require('../controllers/tfi-values-controller.js')

router.get('/', TfiValuesController.getAll)

module.exports = router