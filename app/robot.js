const TFIValues = require('./models/tfi-values-model')
// const TFIMetaData = require('./models/tfi-metadata-model')
const SimOccasion = require('./models/sim-occasions-model')
const linReg = require('./linear-regression.js')

const CONST_SIMULATE = '#SIMULATE'
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
    buy_days_delay: [2,3]
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

function processOccasions(symbol, values, date, minTFIValuesDate) {
    let runs = []
    let runDates = []

    //return values

    if (date === CONST_SIMULATE) {
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
                //values: values, //###---
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
    // return {
    //     //values: values,
    //     //run_space: runs,
    //     //run_count: runs.length, 
    //     //run_count_dates: runDates.length,
    //     //run_count_full: runDates.length * runs.length, 
    //     occasions: occasions
    // }
}

exports.pickOccasions = (symbol) => {
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
                let occasions = processOccasions(symbol, values, CONST_SIMULATE, minTFIValuesDate)
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
            buys.push(buy)
        })
    })

    return buys
} 

function makeBuy(params, occasion, values) {
    console.log('values.length', values.length)
    let init = values

    let finding = JSON.parse(occasion.finding)
    return {
        symbol: occasion.symbol, 
        run_date: occasion.run_date,
        occasion_id: occasion._id,
        initDate: null,
        initValue: null,
        potentialYield: finding.stat.max_cur_diff,
        buyParams: JSON.stringify(params),
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
                            console.log('minTFIValuesDate', new Date(minTFIValuesDate))
                            let query = {
                                symbol: symbol,
                                date: {$gte: minTFIValuesDate } 
                            }
                            //values
                            TFIValues
                                .find(query)
                                .select({ "date": 1, "value": 1})
                                .sort({date: 1})
                                .then(function (values) {
                                    let buys = processBuys(occasions, values)
                                    //console.log('buys', buys)
                                    resolve(buys)
                                })
                       })
        } catch (e) {
            reject(e.toString())
        }
    }) 
}


//------------------------------------------------SELL
exports.simulateSell = () => {
    return new Promise(function(resolve, reject) {
        try {
            resolve('simulateSell')
        } catch (e) {
            reject(e.toString())
        }
    }) 
}