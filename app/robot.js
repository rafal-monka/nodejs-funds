const TFIValues = require('./models/tfi-values-model')
// const TFIMetaData = require('./models/tfi-metadata-model')
const SimOccasion = require('./models/sim-occasion-model')
const SimBuy = require('./models/sim-buy-model')
const linReg = require('./linear-regression.js')

// const CONST_SIMULATE = '#SIMULATE'
const CONST_SIMULATE_MIN_RUN_DATE = new Date("2020-10-01")

const CONST_DAY = 1000*60*60*24
const CONST_YEAR_DAYS = 365
const CONST_LONG_TERM_TREND_DAYS = 1*CONST_YEAR_DAYS

const paramsPick = {
    long_term_trend: [10.0],
    period_length: [30, /*60*/], //how deep look into the past before current (run) date
    potential_full: [7.0, 10.0], //minimum difference between max value and min value
    potential_level: [0.7 /*0.8*/], //current value potentially can grow % of full potential
    date_min_before: [2, 3, 5, 7, 10] //minimum value date must occur N calendar days before current (run) date  
}

const paramsBuy = {
    buy_days_delay: [2, 3]
}

const paramsSell = {
    sell_days_delay: [3, 4, 5],
    sell_threshold: [-1, 6.0] //<-----------4.0???
}

//------------------------------------------------OCCASION (PICKS)
function processOccasions(symbol, values, mode, minTFIValuesDate) {
    let runs = []
    let runDates = []

    //return values

    if (mode === 'SIMULATION') {
        runDates = values.filter(value => value.date >= CONST_SIMULATE_MIN_RUN_DATE.getTime()).map(value => value.date2)        
        paramsPick.long_term_trend.forEach(long_term_trend => {
            paramsPick.period_length.forEach(period_length => {
                paramsPick.potential_full.forEach(potential_full => {
                    paramsPick.potential_level.forEach(potential_level => {
                        paramsPick.date_min_before.forEach(date_min_before => {
                            runs.push({
                                long_term_trend: long_term_trend,
                                period_length: period_length,
                                potential_full: potential_full,
                                potential_level: potential_level,
                                date_min_before: date_min_before
                            })    
                        })    
                    })
                })
            })
        })
    } else {
        //###??? production: current date and calibrated parameters...
        runDates.push(values[values.length-1].date2)
        runs.push({
            consider_trend: true,
            period_length: 60,
            potential_full: 10.0,
            potential_level: 0.8,
            date_min_before: 14
        }) 
    }

    let occasions = []
    runDates.forEach(date => {
        runs.forEach(run => {
            let startOfPeriod = new Date(new Date(date).getTime() - run.period_length*CONST_DAY)
            let finding = findOccasion(startOfPeriod, date, run, values)
            if (finding !== null) occasions.push({
                //values: values, //---
                symbol: symbol,
                run_date: date,
                run_startOfPeriod: startOfPeriod,
                minTFIValuesDate: minTFIValuesDate,
                run_params: run,
                finding: finding       
            })
        })
    })

    return occasions
}

function findOccasion(startOfPeriod, date, params, values) {
    // console.log('findOccasion, date=', date, 'from', startOfPeriod)
    let records = values.filter(point => point.date >= startOfPeriod.getTime() 
                                         && point.date <= new Date(date).getTime())
// console.log(records.length, date, params.period_length, new Date(date).getTime() - params.period_length*CONST_DAY, new Date(date))
    let maximum = records[0]
    let current = records[records.length-1]

    //find maximum
    records.forEach(point => {
        if (point.value > maximum.value) maximum = point
    })
    
    //find minimum (but only later than maximum point) - filter by dates
    let minimum = null
    records = records.filter(point => point.value < maximum.value 
                                      && point.value < current.value 
                                      && point.date > maximum.date 
                                      && point.date < new Date(date).getTime() - params.date_min_before*CONST_DAY)
    if (records.length > 0) {
        minimum = records[0]
        records.forEach(point => {
            if (point.value < minimum.value) minimum = point
        })
    }

    //linear regression (long term trend)
    let trend_lr = null
    let trend_lr_OK = true
    let trend_lr_yield_yearly = null
    let trend_cur_diff = null

    if (params.long_term_trend > 0.0) {
        trend_lr = linReg.calcLR(
            values.filter(val=>val.date<=current.date)
                  .map(val=>[val.date, val.change])  
        )
        trend_lr_yield_yearly = Math.round( (trend_lr.yn - trend_lr.y0)/trend_lr.dx2*CONST_YEAR_DAYS *100)/100
        trend_lr_OK = (trend_lr_yield_yearly >= params.long_term_trend)
        trend_cur_diff = Math.round( ( (trend_lr.a * current.date + trend_lr.b) - current.change) * 100)/100
    }
// console.log(date, minimum, maximum)

    if (minimum !== null && trend_lr_OK) {
        let special_exclude = new Date(minimum.date).getFullYear() === 2020 && [1,2,3].indexOf(new Date(minimum.date).getMonth())>-1
        let max_min_diff = Math.round( (maximum.change - minimum.change) *100)/100
        let max_cur_diff = Math.round( (maximum.change - current.change) *100)/100
        let min_cur_diff = Math.round( (current.change - minimum.change) *100)/100
        let max_cur_level =  Math.round( (max_cur_diff / max_min_diff) *100)/100

        let days_max_to_min = -(maximum.date - minimum.date)/CONST_DAY
        let days_min_to_cur = -(minimum.date - current.date)/CONST_DAY
        let days_max_to_cur = -(maximum.date - current.date)/CONST_DAY

        if (!special_exclude 
            && max_cur_diff >= params.potential_full
            && max_cur_level >= params.potential_level) 
        {
            return { 
                cur: current,
                min: minimum,
                max: maximum,
                stat: {
                    max_min_diff: max_min_diff,
                    max_cur_diff: max_cur_diff,
                    max_cur_level: max_cur_level,
                    alpha:  Math.round( max_min_diff/days_max_to_min *100)/100,
                    beta:  Math.round( min_cur_diff/days_min_to_cur *100)/100,
                    days_max_to_min: days_max_to_min,
                    days_min_to_cur: days_min_to_cur,
                    days_max_to_cur: days_max_to_cur,
                },
                trend: {
                    lr: trend_lr,
                    yield_yearly: trend_lr_yield_yearly,
                    cur_diff: trend_cur_diff
                }
            }
        } else {
            return null
        }
    } else {
        return null
    }
}

exports.pickOccasions = (symbol, mode) => {
    let maxPeriod = Math.max(...paramsPick.period_length)
    let today = new Date()
    today.setHours(0, 0, 0, 0)
    let minTFIValuesDate = new Date(new Date(today.toISOString().substring(0,10)).getTime() - 1000*60*60*24*(maxPeriod+CONST_LONG_TERM_TREND_DAYS))
    let query = {
        symbol: symbol,
        date: {$gte: minTFIValuesDate } 
    }

    return new Promise(function(resolve, reject) {
        TFIValues
            .find(query)
            .select({ "symbol": 1, "date": 1, "value": 1, "_id": 0})
            .sort({date: 1})
            .then(function (result) {
                let values = result.map((point, index) => ({   
                    date: new Date(point.date).getTime(),
                    date2: new Date(point.date).toISOString().substring(0,10),
                    value: point.value,
                    change: Math.round( (point.value - result[0].value)/result[0].value*100*100)/100                   
                })) 
                let occasions = processOccasions(symbol, values, mode, minTFIValuesDate)
                resolve(occasions)                          
            }).catch(e => {
                reject(e.toString())
            })
    })
}



//------------------------------------------------BUY
function processBuys(occasions, values) {
    let runs = []
    paramsBuy.buy_days_delay.forEach(buy_days_delay => {  
        runs.push({
            buy_days_delay: buy_days_delay    
        })
    })

    let buys = []
    runs.forEach(params => {
        occasions.forEach(occasion => {
            let buy = makeBuy(params, occasion, values)
            if (buy !== null) buys.push(buy)
        })
    })

    return buys
} 

function makeBuy(params, occasion, values) {
    // console.log('occasion.run_date', occasion.run_date)
    let init = undefined
    let future_values = values.filter((value, index) => value.date >= occasion.run_date)
    if (params.buy_days_delay <= future_values.length-1) {
        init = future_values[params.buy_days_delay]
    }
    //
    if (init !== undefined) {
        //console.log('params.buy_days_delay, occasion.run_date', params.buy_days_delay, occasion.run_date, init)
        let finding = JSON.parse(occasion.finding)
        return {
            symbol: occasion.symbol, 
            run_date: occasion.run_date,
            occasion_id: occasion._id,
            initDate: init.date,
            initValue: init.value,
            potentialYield: finding.stat.max_cur_diff,
            occasionParams: JSON.stringify(occasion.run_params),
            occasionStat: JSON.stringify(finding.stat),
            occasionTrend: JSON.stringify(finding.trend),
            buyParams: JSON.stringify(params),
        }
    } else {
        //console.log(occasion.symbol, 'Can not buy yet. No values.', occasion.run_date, params.buy_days_delay)
        return null
    }
}

exports.simulateBuys = (symbol) => {
    console.log('robot.simulateBuy', symbol)
    return new Promise(function(resolve, reject) {
        try {
            SimOccasion.find({symbol: symbol})
                       .sort({symbol: 1, run_date: 1}) 
                       .then(function (occasions) {
                            let minTFIValuesDate = occasions.reduce((min, value) => Math.min(min, new Date(value.run_date)) || min, new Date()  )
                            //console.log('minTFIValuesDate', new Date(minTFIValuesDate))
                            let query = {
                                symbol: symbol,
                                date: {$gte: minTFIValuesDate } 
                            }
                            //values
                            TFIValues
                                .find(query)
                                .select({ "date": 1, "value": 1, "_id": 0})
                                .sort({date: 1})
                                .then(function (values) {
                                    values = values.map(val => ({date: new Date(val.date)/*@@@.getTime()*/, value: val.value}))
                                    let buys = processBuys(occasions, values)
                                    //console.log('values', values)
                                    resolve(buys)
                                })
                       })
        } catch (e) {
            reject(e.toString())
        }
    }) 
}


//------------------------------------------------SELL
function processSells(buys, values) {
    let runs = []
    paramsSell.sell_days_delay.forEach(sell_days_delay => { 
        paramsSell.sell_threshold.forEach(sell_threshold => {  
            runs.push({
                sell_days_delay: sell_days_delay,
                sell_threshold: sell_threshold   
            })
        })
    })

    let sells = []
    runs.forEach(params => {
        buys.forEach(buy => {
            let sell = makeSell(params, buy, values)
            sells.push(sell)
        })
    })

    return sells
}

function makeSell(params, buy, values) {
    let end = undefined
    let stopValue = undefined
    let status
    let future_values = values.filter((value, index) => value.date >= buy.initDate)

    //search for value that meets sell criteria (yield)
    let i = 0
    let threshold = params.sell_threshold > 0.0 ? params.sell_threshold : buy.potentialYield //???*level 
    while (i < future_values.length) {
// console.log('searching...', i, buy.initDate, buy.initValue, future_values[i])
        let tmp_yield = Math.round( (future_values[i].value - buy.initValue)/buy.initValue*100 *100)/100
// console.log('tmp_yield', tmp_yield, threshold)
        if (tmp_yield >= threshold) {
            stopValue = future_values[i]
// console.log('found')
            break;
        }
        i++
    }

    if (stopValue !== undefined) {
// console.log('selling?...', i + params.sell_days_delay, future_values.length-1, i + params.sell_days_delay <= future_values.length-1)
        if (i + params.sell_days_delay <= future_values.length-1) {
            end = future_values[i + params.sell_days_delay]
        }
    }

    //
    if (end === undefined) {
        status = 'HOLD',
        end = future_values[future_values.length-1]
    } else {
        status = 'SOLD'
    }

    return {
        symbol: buy.symbol,
        occassion_id: buy.occasion_id,
        buy_id: buy._id,
        status: status,
        run_date: buy.run_date,
        initDate: buy.initDate,
        initValue: buy.initValue,
        potentialYield: buy.potentialYield,
        sellDate: end.date,
        sellValue: end.value,
        resultYield: Math.round( (end.value - buy.initValue)/buy.initValue*100 *100)/100,
        resultDays: (new Date(end.date)-new Date(buy.initDate))/CONST_DAY,
        occasionParams: buy.occasionParams,
        occasionStat: buy.occasionStat,
        occasionTrend: buy.occasionTrend,
        buyParams: buy.buyParams,
        sellParams: JSON.stringify(params)
    }
}

exports.simulateSells = (symbol) => {
    console.log('robot.simulateSell', symbol)
    return new Promise(function(resolve, reject) {
        try {
            SimBuy.find({symbol: symbol})
                       .sort({symbol: 1, run_date: 1, initDate: 1}) 
                       .then(function (buys) {
                            let minTFIValuesDate = buys.reduce((min, value) => Math.min(min, new Date(value.initDate)) || min, new Date()  )
                            //console.log('minTFIValuesDate', new Date(minTFIValuesDate))
                            let query = {
                                symbol: symbol,
                                date: {$gte: minTFIValuesDate } 
                            }
                            //values
                            TFIValues
                                .find(query)
                                .select({ "date": 1, "value": 1, "_id": 0})
                                .sort({date: 1})
                                .then(function (values) {
                                    values = values.map(val => ({date: new Date(val.date)/*@@@.getTime()*/, value: val.value}))
                                    //console.log('values', values)
                                    let sells = processSells(buys, values)
                                    resolve(sells)
                                })
                        })
        } catch (e) {
            reject(e.toString())
        }
    }) 
}