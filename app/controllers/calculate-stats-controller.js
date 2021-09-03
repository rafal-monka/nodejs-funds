const Launcher = require("../libs/launcher.js")
const fs = require('fs')
const jsonexport = require('jsonexport')
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


exports.simulateReturns = (req, res, next) => {

    let pad = new Launcher(
        5, 
        [
            {category: "ALL", period: "M", dateFrom: new Date("2000-01-01"), dateTo: new Date("2000-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2001-01-01"), dateTo: new Date("2001-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2002-01-01"), dateTo: new Date("2002-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2003-01-01"), dateTo: new Date("2003-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2004-01-01"), dateTo: new Date("2004-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2005-01-01"), dateTo: new Date("2005-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2006-01-01"), dateTo: new Date("2006-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2007-01-01"), dateTo: new Date("2007-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2008-01-01"), dateTo: new Date("2008-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2009-01-01"), dateTo: new Date("2009-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2010-01-01"), dateTo: new Date("2010-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2011-01-01"), dateTo: new Date("2011-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2012-01-01"), dateTo: new Date("2012-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2013-01-01"), dateTo: new Date("2013-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2014-01-01"), dateTo: new Date("2014-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2015-01-01"), dateTo: new Date("2015-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2016-01-01"), dateTo: new Date("2016-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2017-01-01"), dateTo: new Date("2017-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2018-01-01"), dateTo: new Date("2018-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2019-01-01"), dateTo: new Date("2019-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2020-01-01"), dateTo: new Date("2020-12-31")},
            {category: "ALL", period: "M", dateFrom: new Date("2021-01-01"), dateTo: new Date("2021-12-31")},
        ],//.slice(0,1), 
        //callFunction,
        async (item) => {
            console.log('simulateReturns callFunction', item)

            return new Promise(function(resolve, reject) {
                try {    
                    statsCalculator.calcStats(item.period, item.dateFrom, item.dateTo)
                        .then(result => {
                            resolve( result )
                        })
                        .catch(e => {
                            reject(e.toString())
                        }) 
                } catch (e) {
                    console.log(item, 'PROMISE EXCEPTION', e)
                    reject('Promise is rejested'+e.toString())
                }
            })
        },
        //callbackFunction,
        (item, value)=> {
            //console.log('calculate-stats Launcher callbackFunction', item, value)
            //https://github.com/kaue/jsonexport
            jsonexport(value, {includeHeaders: true, rowDelimiter: ';'}, function(err, csv){
                if (err) res.status(200).json(err)
                // console.log(csv);
                fs.writeFileSync('download/returns-'+item.category+'_'+item.period+'_'+item.dateFrom.toISOString().substring(0,10)+'_'+item.dateTo.toISOString().substring(0,10)+'.csv', csv);               
            });
            return true
        },
        //catchFunction
        (error, item)=> {
            console.log('simulateReturns catchFunction', error, item)
        },
        //finalCallBack
        (param) => {         
            console.log('simulateReturns final')                                                         
        } 
    );
    pad.run();
    res.status(200).json('simulateReturns started')

    //'ARK27,ARS04,ARK33S,UNI03,ING76,SKR36,ING65,ING07,ING17,SKR54,ALL14,ARK57,ALL75,ING77,SKR23,ING91,ING35,ARK24,ARK38,ARS01,ING71'
    // statsCalculator.calcStats('*')
    //     .then(result => {
    //         res.status(200).json({
    //             result: result
    //         })
    //     })
    //     .catch(e => {
    //         res.status(403).json({
    //             error: e.toString()
    //         })
    //     }) 
}