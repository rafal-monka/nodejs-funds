const TFIValues = require('../models/tfi-values-model')
const TFILook = require('../models/tfi-look-model')

const trendAnalyzer = require("../analyse-trends.js")
const wss = require('./../../wss')

const CONST_ONE_DAY = 24*60*60*1000
const CONST_LAST_PERIOD_VALUE = 22 * 12 * 5
const CONST_LAST_PERIOD = 22 * 3

const CONST_ONE_YEAR = 365 * CONST_ONE_DAY
const CONST_THRESHOLD_LRA = 3.0 / CONST_ONE_YEAR //=3% per year

exports.calcLRFunds = (wssClientID, symbols) => {
    trendAnalyzer.run(wssClientID, symbols)   
}

fatLR = (inputArr) => {
    // console.log('[fatLR]', inputArr.length);
    // try {
        // console.log('[fatLR][1]')
        let avg = {
            x: Math.round(inputArr.reduce((total, item) => total+item[0], 0) / inputArr.length * 100) / 100,
            y: Math.round(inputArr.reduce((total, item) => total+item[1], 0) / inputArr.length * 100) / 100
        }
        // console.log('[fatLR][2]')
        let sumCounter = inputArr.reduce((total, item) => total + (item[0] - avg.x)*(item[1] - avg.y), 0)
        let sumDenominator = inputArr.reduce((total, item) => total + Math.pow( (item[0] - avg.x), 2), 0)
        let a = sumCounter / sumDenominator
        let lr = {
            a: a,
            b: avg.y - a * avg.x
        } 
        lr.y0 = Math.round((lr.a * inputArr[0][0] + lr.b) * 100) / 100
        lr.yn = Math.round((lr.a * inputArr[inputArr.length-1][0] + lr.b) * 100) / 100
        lr.dx = inputArr[inputArr.length-1][0] - inputArr[0][0]
        lr.dx2 = (inputArr[inputArr.length-1][0] - inputArr[0][0]) / CONST_ONE_DAY
        // console.log('[fatLR][3]')
        return lr
    // } catch (e) {
    //    console.log('Error in fatLR', inputArr, e.toString())
    //    return {a: 0, b: 0}
    // }    
}

exports.calcLR = async (wssClientID, symbol, resolve, reject) => { 
    console.log('calcLR', symbol)

    try {
        //let self = this
        TFIValues
            .find({ symbol: symbol }) 
            .then(function (result) {
                // console.log('[1]', symbol)
                try {
                    let ordered = result.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .filter((item, index) => index>=Math.max(0,result.length-CONST_LAST_PERIOD_VALUE))

                    ordered = ordered.map((val, index) => {
    // if (index < 10) console.log(val.date, val.date.getTime(), index, val.value, ordered[0].value, (val.value - ordered[0].value)/ordered[0].value *100)
                        return [val.date.getTime(), 100*(val.value - ordered[0].value)/ordered[0].value ]
                    })
                    // console.log('[2] ordered.length=', ordered.length)
                    let lr = fatLR(ordered)
                    // let lr = {    a: 1, b: 1 } 
                    // console.log('[3]')
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
                    let diff_lr = fatLR(diffArr)
                    // diff_lr = { a: 2, b: 2 }
                    let lastDiff = Math.round( (ordered[ordered.length-1][1] - (lr.a * ordered[ordered.length-1][0] + lr.b)) * 100 ) / 100
                    let lastDiffPercent = Math.round( (ordered[ordered.length-1][1] - (lr.a * ordered[ordered.length-1][0] + lr.b)) / ordered[ordered.length-1][1] * 100 * 100 ) / 100 //percentage diff
                    
                    // console.log('[5]', symbol)
                    resolve({
                        lr: lr,
                        lastDiff: lastDiff,
                        lastDiffPercent: lastDiffPercent,
                        //diffArr: diffArr,
                        diff_lr: diff_lr,
                        look: (lr.a >= CONST_THRESHOLD_LRA && lastDiff < 0 && diff_lr.a > CONST_THRESHOLD_LRA),
                        CONST_LAST_PERIOD_VALUE: CONST_LAST_PERIOD_VALUE,
                        CONST_LAST_PERIOD: CONST_LAST_PERIOD
                    })
                } catch (e) {
                    reject(e.toString())
                }
            })
        } catch (e) {
            reject(e.toString())
        }
}


exports.saveLook = (symbol, a, b) => {
    console.log('saveLook()... '+symbol)

    TFIValues
    .find({ symbol: symbol }) 
    .sort({ date: -1})
    .limit(1)
    .then(function (result) {
        //console.log('result', result[0])
        TFILook.find( {symbol: symbol, lookDate: result[0].date}, function (err, docs) {
            if (docs.length===0) {            
                    console.log('Storing LOOK. Fund '+symbol+' for date '+result[0].date+' with value of '+result[0].value)
                    let look = new TFILook({
                        symbol: symbol,
                        lookDate: result[0].date,
                        value: result[0].value,
                        lra: a,
                        lrb: b
                    })
                    look.save()
                        .then(function (savedResult){
                            console.log(savedResult)                       
                        })
                        .catch(e => {
                            console.log('Error in saveLook()', e.toString())
                        })        
            } else {
                console.log('Look '+symbol+' for date '+result[0].date+' already is in look')
            }
        })

    })
}