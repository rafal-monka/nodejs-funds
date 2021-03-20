const express = require('express')
const router = express.Router()
// const money2 = require("../money2-crawler.js");
const TFIController = require('../controllers/tfi-controller.js')

router.get('/values/:symbol', TFIController.getValues)
router.get('/values/:symbol/:date', TFIController.getValuesDate)
router.get('/metadata/:symbol', TFIController.getMetadata)
router.get('/look/:symbol', TFIController.getLook)
router.get('/delete/:symbol', TFIController.daleteValues)
router.get('/load/:symbols', TFIController.loadTFIValues)
//router.get('/loadmybonds', TFIController.loadMyBondTFIValues)
router.get('/copy/:symbolfrom/:symbolto', TFIController.copyValues)
router.get('/export/:symbols', TFIController.getExport)

// router.get("/run/:symbol", (req, res) => {    
//     console.log('/api/run/:symbol', req.params.symbol)
//     money2.run(new Date(), req.params.symbol)
//     res.json({ message: "TFI called." })
// });
// router.get('/calclr/:symbol', TFIController.calcLR)

module.exports = router