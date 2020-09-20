const express = require('express')
const router = express.Router()
const RoiController = require('../controllers/rois-controller.js')

router.get('/:datemin', RoiController.getAll)
router.get('/calc/all', RoiController.calcAll)
router.get('/calc/:symbol'  , RoiController.calc)
router.get('/delete/:symbol', RoiController.delete)

module.exports = router