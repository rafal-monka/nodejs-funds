const utils = require("../libs/utils.js")
const TFIValues = require('../models/tfi-values-model')

const CONST_DAY_MILLS = 1000*60*60*24

exports.getMonthlyValues = (req, res, next) => {  
    let symbols = req.params.symbols.split(',').map(item => {return {symbol: item}})
    let minDate = new Date(req.params.date)
    let period = req.params.period.toUpperCase()
    let query = { $or: symbols, date: {$gte: minDate } }

//console.log(query)

    calcMonthlyValues(query, period)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

function calcMonthlyValues(query, period) {
    return new Promise(function(resolve, reject) {
        TFIValues.find( query ) 
            .sort( {symbol: 1, date: 1})
            .then(function (result) {
                console.log(result.length) 
                let arr = []
                result.forEach(item => {
                    if (arr[item.symbol] === undefined) arr[item.symbol] = {symbol: item.symbol, data: []}
                    let currentItem = arr[item.symbol].data.length
                    let change = currentItem === 0 ? 0.0 : (item.value - arr[item.symbol].data[currentItem-1][1]) / arr[item.symbol].data[currentItem-1][1] * 100
                    arr[item.symbol].data.push([
                        new Date(item.date),
                        item.value,
                        Math.round(change*100)/100              
                    ])
                }) 
                
                //construct data array per each fund
                let fundData = []
                Object.getOwnPropertyNames(arr).map((item, index) => {
                    let data = arr[item].data
                    if (index>0) {
                        let monthly = []
                        if (data.length > 0) {
                            //first record
                            let previous = {
                                date: new Date(data[0][0]),
                                value: data[0][1]
                            }
                            //iterate days
                            data.forEach((day, inx) => {
                                if (inx > 0) {
                                    let current = {
                                        date: new Date(day[0]),
                                        value: day[1]
                                    }
                                    let change
                                    switch (period) {
                                        case 'Y': 
                                            change = current.date.getFullYear() !== previous.date.getFullYear()
                                            break;                                    
                                        case 'Q': 
                                            change = utils.getQuarter(current.date) !== utils.getQuarter(previous.date)
                                            break;
                                        case 'M': 
                                            change = current.date.getMonth() !== previous.date.getMonth()
                                            break; 
                                        default: //daily
                                            change = true
                                            break;
                                        }
                                    //if period (month, quarter, year) changes or last data
                                    if (change || inx === data.length-1) {
                                        monthly.push([
                                            new Date(previous.date.getFullYear(), previous.date.getMonth(), (period === 'D') ? previous.date.getDate() : 1, 12).getTime(),
                                            Math.round( (current.value - previous.value)/previous.value * 100 * 100)/100,
                                            // previous.date, previous.value, 
                                            // current.date, current.value                                            
                                        ])
                                        previous = {
                                            date: current.date,
                                            value: current.value
                                        }
                                    }
                                }
                            })    
                        }

                        //calculate statistic
                        let dataROI = data.length > 0 ? { 
                            value: Math.round( (data[data.length-1][1] - data[0][1])/data[0][1]*100 * 100) / 100,
                            dateFrom: new Date(data[0][0]).toISOString().substring(0,10),
                            dateTo: new Date(data[data.length-1][0]).toISOString().substring(0,10),
                            days: (data[data.length-1][0] - data[0][0]) / CONST_DAY_MILLS
                        } : null
                        let statData = {
                            minMaxWithout202003: monthly
                            .filter(value => !(new Date(value[0]).getFullYear()===2020 && new Date(value[0]).getMonth()===2))
                            //.map(val => [new Date(val[0]).toISOString(), val[1]])
                            .reduce(([min, max], value) => [
                                Math.min(min, value[1]) || min,
                                Math.max(max, value[1]) || max], [Infinity, -Infinity]),
                            minMax: monthly.reduce(([min, max], value) => [
                                Math.min(min, value[1]) || min,
                                Math.max(max, value[1]) || max], [Infinity, -Infinity]),
                            dataROI: dataROI,
                            dataYearAvgYield: (data.length > 0 ? Math.round(dataROI.value * 365 / dataROI.days * 100)/100 : null),
                            sumROI: monthly.reduce((sum, value) => sum + value[1], 0) 
                        }
                        fundData.push({
                            name: arr[item].symbol, 
                            data: monthly,
                            //tickmarkPlacement: 'on',
                            //pointPlacement: 'on', //https://www.highcharts.com/forum/viewtopic.php?t=40059
                            statData: statData                                
                        })
                    }   
                })

                //sum all changes per period
                let sumData = []
                fundData.forEach(fund => {
                    fund.data.forEach(dat => {
                        if (sumData[dat[0]]===undefined) {
                            sumData[dat[0]] = 0.0
                        }
                        sumData[dat[0]] += dat[1]
                    })                    
                })
                let sumDataOut = []
                Object.getOwnPropertyNames(sumData).map((item, index) => {                    
                    if (index>0) {
                        sumDataOut.push( {
                            date: new Date(item*1).toISOString().substring(0,10), 
                            value: sumData[item]
                        })
                    }
                })
                // console.log(sumDataOut)             

                console.log('fundData.length', fundData.length) 
                resolve({
                    //resultArr: resultArr,
                    //combinedArr: combinedArr,
                    //varData: varData,
                    //pivotData: pivotData,
                    chartData: fundData,
                    sumData: sumDataOut,
                    // portfolioSimArr: portfolioSimArr
                })                          
            }).catch(e => {
               reject(e.toString())
            })
    })
         
}


