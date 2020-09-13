
const TFIValues = require('../models/tfi-values-model')
const trendAnalyzer = require("../analyse-trends.js")
const wss = require('./../../wss')

const ONE_DAY = 24*60*60*1000
const CONST_LAST_PERIOD_VALUE = 22 * 12 * 5
const CONST_LAST_PERIOD = 22 * 3

exports.calcLRFunds = (wssClientID, symbols) => {
    trendAnalyzer.run(wssClientID, symbols)   
}

fLR = (inputArr) => {
        let lr = {}
        try {
        let avg = {
            x: Math.round(inputArr.reduce((total, item) => total+item[0], 0) / inputArr.length * 100) / 100,
            y: Math.round(inputArr.reduce((total, item) => total+item[1], 0) / inputArr.length * 100) / 100
        }
        let sumCounter = inputArr.reduce((total, item) => total + (item[0] - avg.x)*(item[1] - avg.y), 0)
        let sumDenominator = inputArr.reduce((total, item) => total + Math.pow( (item[0] - avg.x), 2), 0)
        let a = sumCounter / sumDenominator
        lr = {
            a: a,
            b: avg.y - a * avg.x
        } 
        lr.y0 = Math.round((lr.a * inputArr[0][0] + lr.b) * 100) / 100
        lr.yn = Math.round((lr.a * inputArr[inputArr.length-1][0] + lr.b) * 100) / 100
        lr.dx = inputArr[inputArr.length-1][0] - inputArr[0][0]
        lr.dx2 = (inputArr[inputArr.length-1][0] - inputArr[0][0]) / ONE_DAY
    } catch (e) {
        console.log('Error in fLR', inputArr, e.toString())
    }
    return lr
}

exports.calcLR = async (wssClientID, symbol, resolve, reject) => { 
    console.log('calcLR', symbol)

    try {
        //let self = this
        TFIValues
            .find({ symbol: symbol }) 
            .then(function (result) {
                let ordered = result.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .filter((item, index) => index>=Math.max(0,result.length-CONST_LAST_PERIOD_VALUE))

                ordered = ordered.map((val, index) => {
// if (index < 10) console.log(val.date, val.date.getTime(), index, val.value, ordered[0].value, (val.value - ordered[0].value)/ordered[0].value *100)
                    return [val.date.getTime(), 100*(val.value - ordered[0].value)/ordered[0].value ]
                })
                
                let lr = fLR(ordered)

                //difference (last period)
                let diffArr = ordered
                    .filter((item, index) => index>=Math.max(0,ordered.length-CONST_LAST_PERIOD))
                    .map(item => { 
                    let dval = Math.round( (item[1] - (lr.a * item[0] + lr.b)) * 100)/100
                    return [ 
                        item[0],
                        dval
                    ]
                })
                let diff_lr = fLR(diffArr)

                resolve({
                    lr: lr,
                    lastDiff: Math.round( (ordered[ordered.length-1][1] - (lr.a * ordered[ordered.length-1][0] + lr.b)) * 100 ) / 100,
                    lastDiffPercent:  Math.round( (ordered[ordered.length-1][1] - (lr.a * ordered[ordered.length-1][0] + lr.b)) / ordered[ordered.length-1][1] * 100 * 100 ) / 100, //percentage diff
                    //diffArr: diffArr,
                    diff_lr: diff_lr,
                    CONST_LAST_PERIOD_VALUE: CONST_LAST_PERIOD_VALUE,
                    CONST_LAST_PERIOD: CONST_LAST_PERIOD
                })
            })
        } catch (e) {
            reject(e.toString())
        }
}
