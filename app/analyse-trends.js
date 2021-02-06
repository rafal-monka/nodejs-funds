const Launcher = require("./launcher.js")
const TFI = require('../config/TFI')
const TFIMetaDataCtrl = require('./controllers/tfi-controller')
const AnalyseTrendsCtrl = require('./controllers/analyse-trends-controller')

callFunctionLR = async (tfi) => {
    //console.log('runCalc callFunction', tfi)
    await TFIMetaDataCtrl.update(tfi.symbol, {
        status: 'CALC-STARTED'
    }) 
    return new Promise(function(resolve, reject) {
        try {            
            AnalyseTrendsCtrl.calcLR(999999, tfi.symbol, resolve, reject)
        } catch (e) {
            console.log(tfi.symbol, 'PROMISE EXCEPTION', e)
            reject('Promise is rejested'+e.toString())
        }
    })
}

exports.run = (wssClientID, symbols) => {
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        callFunctionLR,
        //callbackFunction,
        (item, value)=> {
            //console.log('runCalc Launcher callbackFunction', item, value)
            TFIMetaDataCtrl.update( item.symbol, {
                lra: value.lr.a,
                lrb: value.lr.b,
                status: 'DONE',
                lastDiff: value.lastDiff,
                lastDiffPercent: value.lastDiffPercent,
                diff_lra: value.diff_lr.a,
                diff_lrb: value.diff_lr.b,
                look: value.look,
                CONST_LAST_PERIOD_VALUE: value.CONST_LAST_PERIOD_VALUE,
                CONST_LAST_PERIOD: value.CONST_LAST_PERIOD,
                errorMsg: null
            }) 

            //save TFIs which meet "look" criteria
            if (value.look) {
                //console.log('Saving look...'+item.symbol)
                AnalyseTrendsCtrl.saveLook(item.symbol, value.lr.a, value.lr.b)
            }
            return true
        },
        //catchFunction
        (error, item)=> {
            console.log('Launcher catchFunction', error, item)
            TFIMetaDataCtrl.update(item.symbol, {                        
                status: 'ERROR',
                lastDiff: null,
                lra: null,
                lrb: null,
                lastDiffPercent: null,
                diff_lra: null,
                diff_lrb: null,
                look: null,        
                errorMsg: error
            })
        },
        //finalCallBack
        (param) => {         
            console.log('runCalc final')                                                         
        } 
    );
    pad.run();    
}


