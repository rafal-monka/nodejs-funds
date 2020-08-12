const express = require('express')
const router = express.Router()
const DictsController = require('../controllers/dicts-controller.js')

router.get('/', DictsController.getAll)

module.exports = router