const Launcher = require("./launcher.js")
const TFI = require('../config/TFI')
const TFIMetaDataCtrl = require('./controllers/tfi-controller')
const CalculateStatsCtrl = require('./controllers/calculate-stats-controller')

callFunctionStat = async (tfi) => {
    //console.log('callFunctionStat callFunction', tfi)
    await TFIMetaDataCtrl.update(tfi.symbol, {
        status: 'CALC-STARTED'
    }) 
    return new Promise(function(resolve, reject) {
        try {  
            setTimeout(          
                () => CalculateStatsCtrl.calcStat(999999, tfi.symbol, resolve, reject),
                100
            )
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
        callFunctionStat,
        //callbackFunction,
        (item, value)=> {
            //console.log('calculate-stats Launcher callbackFunction', item, value)
            TFIMetaDataCtrl.update( item.symbol, {
                status: 'DONE',
                dataStat: JSON.stringify(value),
                errorMsg: JSON.stringify(value.minMaxWithout202003)
            }) 
            return true
        },
        //catchFunction
        (error, item)=> {
            console.log('Launcher catchFunction', error, item)
            TFIMetaDataCtrl.update(item.symbol, {                        
                status: 'ERROR',                        
                errorMsg: error
            })
        },
        //finalCallBack
        (param) => {         
            console.log('runStats final')                                                         
        } 
    );
    pad.run();    
}