
const Launcher = require("../libs/launcher.js")

const TFI = require('./../../config/TFI')
const statsCalculator = require("./../calculate-stats.js")
const TFIMetaDataCtrl = require('./tfi-controller')

exports.launchCalcStats = async (req, res, next) => {
    console.log('launchCalcStats', req.params.symbols)
    let symbols = req.params.symbols
    if (symbols !== '*') {
        symbols = req.params.symbols.split(',') 
    }
    this._launchCalcStats(null, symbols)
    res.status(200).json('launchCalcStats started '+symbols)
}

exports._launchCalcStats = (wssClientID, symbols) => {
    let pad = new Launcher(
        5, 
        TFI.getList(symbols),//.slice(0,1), 
        //callFunction,
        async (tfi) => {
            //console.log('callFunctionStat callFunction', tfi)
            await TFIMetaDataCtrl.update(tfi.symbol, {
                status: 'CALC-STARTED'
            }) 
            return new Promise(function(resolve, reject) {
                try {    
                    statsCalculator.calcStats(tfi.symbol)
                        .then(result => {
                            resolve( result )
                        })
                        .catch(e => {
                            reject(e.toString())
                        }) 
                } catch (e) {
                    console.log(tfi.symbol, 'PROMISE EXCEPTION', e)
                    reject('Promise is rejested'+e.toString())
                }
            })
        },
        //callbackFunction,
        (item, value)=> {
            //console.log('calculate-stats Launcher callbackFunction', item, value)
            TFIMetaDataCtrl.update( item.symbol, {
                status: 'DONE',
                errorMsg: JSON.stringify(value)
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





exports.testAllocation = (req, res, next) => {
    let arr = [0,10,20,30,40,50,60,70,80,90,100]
    let amount = Math.max(...arr)
    let R = 4
    
    let variationsArr = variationsWithRepetion(arr, R);
    let variationsAmount = variationsArr.filter(v => amount === v.reduce((total, item) => total+item, 0))

    //ARK29, ARK04, ARK32, ARK33, ARK11
    // let mins = [-0.69, -2.9, -1.31, -2.71, -2.56]
    // let maxs = [2.73, 6.31, 2.74, 4.23, 1.99]

    //ARK56,ARK31,ARK27,ARK23
    let mins = [-0.09, -0.16, -0.7, -2.51]
    let maxs = [1.16, 0.79, 2.85, 2.0]


    let outputArr = variationsAmount.map(variation => {
        let tmpArr = []
        let txt = 'V#'+variation.toString()
        tmpArr.push({
            v: txt,
            min: Math.round( variation.reduce((total, amount, index) => total + amount*mins[index]/100, 0) *100)/100,
            max: Math.round( variation.reduce((total, amount, index) => total + amount*maxs[index]/100, 0) *100)/100 
        })
        return tmpArr                
    })

    res.status(200).json({
        variationsAmount: variationsAmount,
        outputArr: outputArr
    })
}