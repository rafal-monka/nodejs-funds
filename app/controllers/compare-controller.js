const utils = require("../libs/utils.js")
const TFIValues = require('../models/tfi-values-model')

const CONST_DAY_MILLS = 1000*60*60*24

exports.getMonthlyValues = (req, res, next) => {  
    let symbols = req.params.symbols.split(',')//.map(item => {return {symbol: item}})
    let minDate = new Date(req.params.date)
    let period = req.params.period.toUpperCase()
    //let query = { $or: symbols, date: {$gte: minDate } }
    let query = {symbol: {$in: symbols}, date: {$gte: minDate } }

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


exports.getDaysOfMonthChanges = (req, res, next) => {
    let symbols = req.params.symbols.split(',')//.map(item => {return {symbol: item}})
    let minDate = new Date(req.params.date)
    //let query = { $or: symbols, date: {$gte: minDate } }
    let query = {symbol: {$in: symbols}, date: {$gte: minDate } }

    calcDaysOfMonthChanges(query)
        .then(output => {
            res.status(200).json(output)
        })
        .catch (next)
}

function calcDaysOfMonthChanges(query) {
    return new Promise(function(resolve, reject) {
        TFIValues.find( query ) 
            .sort( {symbol: 1, date: 1})
            .then(function (result) {
                //console.log(result.length) 

                try {
                    let groupedArr = groupValuesByFund(result)

                    //grouped series by month and day day of month
                    let daysOfMonth = []
                    for (var f=0; f<groupedArr.length; f++) {
                                                
                        //iterate days
                        let previous
                        let current
                        let cum
                        if (true) groupedArr[f].data.forEach((day, inx) => {
// console.log(inx, day[0])
                            if (inx === 0) { 
                                daysOfMonth.push({
                                    name: groupedArr[f].symbol+'/'+day[0].getFullYear()+'-'+(day[0].getMonth()+1),
                                    data: [
                                        [day[0].getDate(), day[1]]
                                    ]                                     
                                })
                                cum = day[1]
                                previous = day[0]
                            } else {
                                current = day[0]
// console.log(inx, previous, current)
                                let change = current.getMonth() !== previous.getMonth()
// console.log(groupedArr[f].symbol, current, previous, current.getMonth() !== previous.getMonth())
                                //if changes of month
                                if (change) {
                                    daysOfMonth.push({
                                        name: groupedArr[f].symbol+'/'+current.getFullYear()+'-'+(current.getMonth()+1),
                                        data: [
                                            [day[0].getDate(), day[1]]
                                        ]                                       
                                    })  
                                    cum = day[1]                                 
                                } else {
                                    cum += day[1] 
                                    daysOfMonth[daysOfMonth.length-1].data.push(
                                        [day[0].getDate(), Math.round(cum* 100)/100] 
                                    )
                                }
                                previous = current
                            }
                        })                                        
                    }

                    //grouped series only by day of month (average)
                    let dataAvgMinMax = []
                    const CONST_GROUP = 31 //6 - day of week OR 31 - day of month
                    groupedArr.forEach(fund => {
                        let dataAvg = new Array(CONST_GROUP).fill(0)
                        let dataMin = new Array(CONST_GROUP).fill(null)
                        let dataMax = new Array(CONST_GROUP).fill(null)
                        let dataAvgCount = new Array(CONST_GROUP).fill(0)
     
                        for (var d=0; d<fund.data.length; d++) {
                            let day = fund.data[d][0].getDate()//Day()//OR .getDate()
                            dataAvg[day] += fund.data[d][1]
                            dataMin[day] = ((fund.data[d][1] < dataMin[day] || dataMin[day] === null) ? fund.data[d][1] : dataMin[day])
                            dataMax[day] = ((fund.data[d][1] > dataMax[day] || dataMax[day] === null) ? fund.data[d][1] : dataMax[day])
                            dataAvgCount[day] += 1
                        }

                        for (var d=0; d<dataAvg.length; d++) {
                            dataAvg[d] = [d, Math.round( (dataAvgCount[d] > 0 ? dataAvg[d] / dataAvgCount[d] : null) * 100)/100 ]
                            dataMin[d] = [d, Math.round(dataMin[d]* 100)/100 ]
                            dataMax[d] = [d, Math.round(dataMax[d]* 100)/100]
                        }

                        dataAvg = dataAvg.slice(1)
                        dataMin = dataMin.slice(1)
                        dataMax = dataMax.slice(1)
                        dataAvgMinMax.push({
                            name: fund.symbol+'-AVG',
                            data: dataAvg
                        })
                        dataAvgMinMax.push({
                            name: fund.symbol+'-MIN',
                            data: dataMin
                        })
                        dataAvgMinMax.push({
                            name: fund.symbol+'-MAX',
                            data: dataMax
                        })
                    })
                    

                    //data by days of week / month
                    let dataByDays = []
                    groupedArr.forEach((fund, index) => {
                        dataByDays.push({
                            name: fund.symbol,
                            data: 
                                fund.data.map((day, inx) => {
                                    return [
                                        day[0].getDate(),
                                        day[1]
                                    ]
                                })
                        })
                    })

                    resolve({
                        dataAvgMinMax: dataAvgMinMax,
                        dataByDays: dataByDays, 
                        groupedArr: groupedArr,
                        daysOfMonth: daysOfMonth,
                        daysOfMonthAMM: dataAvgMinMax
                    })
                } catch (e) {
                    reject(e.toString())
                }
            })
            .catch(e => {
                reject(e.toString())
            })
        })
}

function groupValuesByFund(inArr) {
    let arr = []
    inArr.forEach(item => {
        if (arr[item.symbol] === undefined) arr[item.symbol] = {symbol: item.symbol, data: []}        
        arr[item.symbol].data.push([
            new Date(item.date),
            item.value              
        ])
    })

    let fundData = []
    Object.getOwnPropertyNames(arr).map((item, index) => {
        if (index>0) {
            let dataArr = arr[item].data
            fundData.push({
                symbol: arr[item].symbol, 
                data: dataArr.map( (item, index) => [
                    item[0],
                    // item[1], 
                    // index === 0 ? 0.0 : dataArr[index-1][1],
                    index === 0 ? 0.0 : Math.round( (item[1] - dataArr[index-1][1])/dataArr[index-1][1] * 100 * 100)/100
                ])
            })
        }
    })
    return fundData
}