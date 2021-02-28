const Funds = require('./../models/funds-model')
const Investments = require('./../models/investments-model')
const Dict = require('./../models/dicts-model')
const utils = require("./../utils.js")

const CONST_DATE_START = "2020-03-01"
const CONST_DATE_MIN_TS = "2020-07-01"
const CONST_TAX = 0.81
const CONST_ONE_DAY = 24*60*60*1000
const CONST_ONE_YEAR = 365 * CONST_ONE_DAY
const CONST_LO_LIMIT_AKC = -7.0/2
const CONST_LO_LIMIT_OBL = -2.0/2
const CONST_LO_LAST_PERIOD = 90*24*60*60*1000

let monthlyArrOBL = []
let monthlyArrAKC = []

exports.deleteData = (req, res, next) => {
    Funds.deleteMany({symbol: req.params.symbol}, function(err, result) {} )
    res.json('Deleted '+req.params.symbol)
}

exports.getAll = (req, res, next) => {  
    Funds.find({date: {$gt: new Date(CONST_DATE_START)}}).sort({symbol: 1, date: 1}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}

exports.getData = (req, res, next) => {  
    let DictQuery = Dict.find({}).sort({symbol: 1})
    let InvQuery = Investments.find({}) 
    let fundQuery = Funds.find({date: {$gt: new Date(CONST_DATE_START)}}).sort({symbol: 1, date: 1})

    Promise.all([DictQuery, InvQuery, fundQuery])
        .then(function (result) {

            monthlyArrOBL = []
            monthlyArrAKC = []

            //dictionary
            let dict = result[0].map(item => {
                return {
                    symbol: item.symbol,
                    moneyplsymbol: item.moneyplsymbol, //###???unused
                    code: item.code,
                    aolurl: item.aolurl
                }
            })

            //investments def
            let invs = result[1].map(item => {
                return {
                    symbol: item.symbol,
                    type: item.type,
                    dateStart: item.dateStart,
                    dateEnd: item.dateEnd,
                    capital: item.capital
                }
            })

            //funds values
            let funds = result[2].map(item => {
                return {
                    symbol: item.symbol,
                    date: item.date,
                    value: item.value
                }
            })

            //bonds - values
            let chartDataOBL = []
            invs.filter(inv => inv.type ==='OBL' && (inv.dateEnd === null || inv.dateEnd === undefined)).forEach(inv => {
                chartDataOBL.push(processInvestment(funds, inv, monthlyArrOBL))
            })
            //bonds - linear regression
            let chartDataLR = []
            chartDataOBL.forEach(fundSeries => chartDataLR.push(fLR(fundSeries)))
            chartDataLR.forEach(lr => chartDataOBL.push(lr))

            //shares
            let chartDataAKC = []
            invs.filter(inv => inv.type ==='AKC' && (inv.dateEnd === null || inv.dateEnd === undefined)).forEach(inv => {
              chartDataAKC.push(processInvestment(funds, inv, monthlyArrAKC))
            })

            //console.log('funds', funds)
            //trailing stop
            let groupedFunds = []
            funds.forEach(fund => {
                if (groupedFunds[fund.symbol] === undefined) groupedFunds[fund.symbol] = []
                groupedFunds[fund.symbol].push({
                    date: fund.date.getTime(), 
                    value: fund.value
                })
            })
// console.log('groupedFunds', groupedFunds)            
            let arr = Object.getOwnPropertyNames(groupedFunds)
                .map(item => {
                    if (item.indexOf('length')!==0) return {
                        symbol: item,
                        data: groupedFunds[item]
                    }
                })
                .filter(item => item)
            //console.log('arr', arr)
            let trailingStopOBL = []
            //arr.forEach(fundSeries => console.log('fundSeries', fundSeries))
            arr
            // .filter(TEMP=>TEMP.symbol.indexOf('OBL') > -1)
            .forEach(fundSeries => trailingStopOBL.push(fTS(fundSeries)))
            
            //Linia obrony
            //last day od previous month
            let previousMonthLastValue = arr.map(f => {
                return { 
                    symbol: f.symbol,                     
                    data: f.data
                        .filter(val => new Date(val.date).getTime() <= utils.getLastDayOfPreviousMonth(f.data[f.data.length-1].date).getTime())
                        .map(d => {
                            return {
                                c: 'last',
                                date: new Date(d.date),
                                value: d.value
                            }
                        })
                        .sort((a,b) => new Date(a.date) < new Date(b.date) ? 1 : -1)
                        .filter((val, i) => i === 0)
                }
            }) 
            //current (this) month values
            let dateQ = new Date(new Date().getTime() - CONST_LO_LAST_PERIOD).getTime()
            let currentValues = arr 
                .filter(f => invs.findIndex(inv => inv.symbol === f.symbol && (inv.dateEnd === null || inv.dateEnd === undefined)) > -1 )               
                .map(f => {
                    return { 
                        symbol: f.symbol, 
                        minMaxLastQ: f.data
                            .filter(val => new Date(val.date).getTime() > dateQ) 
                            .reduce(([min, max], v) => [
                                Math.min(min, v.value) || min,
                                Math.max(max, v.value) || max], [Infinity, -Infinity]),
                        data: f.data
                            .filter(val => new Date(val.date).getTime() > utils.getLastDayOfPreviousMonth(f.data[f.data.length-1].date).getTime())
                            //.sort((a,b) => new Date(a.date) > new Date(b.date) ? 1 : -1)
                            .map(d => {
                                //.filter((d,i)=> i === f.data.length-1).map(d => {
                                return {
                                    c: 'current',
                                    date: new Date(d.date),
                                    value: d.value
                                }
                            })
                    }
                }) 

            let fundsLOValues = currentValues.map(el => {
                let prevMonth = previousMonthLastValue.filter(pf => pf.symbol === el.symbol)
                el.data.unshift(prevMonth[0].data[0])
                let type = invs.filter(inv => inv.symbol === el.symbol)[0].type 
                let threshold = (type === 'AKC' ? CONST_LO_LIMIT_AKC : CONST_LO_LIMIT_OBL) 
                let lo = Math.round( el.data[0].value * (100+threshold)/100 * 100)/100

                let data = el.data.map(val => {
                    let change = Math.round( ((val.value - el.data[0].value) / el.data[0].value)*100 * 100) / 100
                    return [
                        new Date(val.date).getTime(),
                        1*change,
                        val.value
                    ]
                })
                //let color = type === 'OBL' ? '0,'+(Math.random()*255)+',255':'255,'+(Math.random()*255)+',0'
                
                let valMin = Math.min(el.minMaxLastQ[0], lo)
                let valCurrent = data[data.length-1][2]
                let valLastDayOfPrevMonth = data[0][2]
                //console.log(el.symbol, 'lo, valMin, el.minMaxLastQ[1]', lo, valMin, el.minMaxLastQ[1])
                return {
                    name: el.symbol,
                    marker: {
                        enabled: true
                    },
                    //color: 'rgba('+color+',1.0)',
                    data: data,
                    fundType: type,
                    minMaxLastQ: el.minMaxLastQ,
                    valLastDayOfPrevMonth: valLastDayOfPrevMonth,
                    valLO: lo,
                    valCurrent: valCurrent,
                    valMin: valMin,
                    currentValueColor: valCurrent > valLastDayOfPrevMonth ? 'green': valCurrent > lo ? 'orange' : 'red',
                    valScaled: {
                        lo: scaledValue(lo, valMin, el.minMaxLastQ[1]),
                        min: scaledValue(el.minMaxLastQ[0], valMin, el.minMaxLastQ[1]),
                        max: scaledValue(el.minMaxLastQ[1], valMin, el.minMaxLastQ[1]),
                        current: scaledValue(data[data.length-1][2], valMin, el.minMaxLastQ[1]),
                        lastPrevMonth: scaledValue(data[0][2], valMin, el.minMaxLastQ[1])
                    }
                }
            })

            let fundsLOValuesAKC = fundsLOValues.filter(el => el.fundType === 'AKC')
            let fundsLOValuesOBL = fundsLOValues.filter(el => el.fundType === 'OBL')
            // currentValues.reduce((x,f) => {
            //     let prevMonth = previousMonthLastValue.filter(pf => pf.symbol === f.symbol)
            //     f.data.unshift(prevMonth[0].data[0])
            //     let type = invs.filter(inv => inv.symbol === f.symbol)[0].type 
            //     let threshold = (type === 'AKC' ? -7.0 : -2.0) //###CONST
            //     f.data.forEach((el, inx) => {
            //         let change = Math.round( ((el.value - f.data[0].value) / f.data[0].value)*100 * 100) / 100
            //         let level = Math.round( (change / threshold) * 100 ) 
            //         let warningLevel = ( level < 0 ? Math.max(-255, level*10) : Math.min(255,level*10) )
            //         fundsLOValues.push ({
            //             symbol: f.symbol,
            //             type: type,
            //             date: new Date(el.date).toISOString().substring(0,10),
            //             value: el.value,
            //             lo: (inx === 0) ? Math.round( el.value * (100+threshold)/100 * 100)/100 : null,
            //             change: change,
            //             warningInfo: type+'/' + (change <= threshold) ? 'NO' : 'WARNING',
            //             warningColor: ('rgb('+(level < 0 ? '0,'+(-1)*(warningLevel)+',0' : (warningLevel)+',0,0') + ')')
            //         })
            //     })                                    
            // }, fundsLOValues)

            res.status(200).json( {
                dict: dict,
                // invs: invs,
                fundsLOValuesAKC: fundsLOValuesAKC,
                fundsLOValuesOBL: fundsLOValuesOBL,
                chartDataOBL: chartDataOBL,
                monthlyArrOBL: monthlyArrOBL,
                chartDataAKC: chartDataAKC,
                monthlyArrAKC: monthlyArrAKC,
                trailingStop: trailingStopOBL
            })
        })
        //.catch (next) 
}

scaledValue = (value, min, max) => {
    return Math.round( (300 / (max-min)) * (value - min) ) 
}

setTable = (investment, obs, monthlyArr) => {
    obs.map((item, index) => {
        let cumWsp =  (item.value - obs[0].value)/obs[0].value * 100
        let wsp = index>0 ?  (item.value - obs[index-1].value)/obs[index-1].value * 100 : 0.0
        monthlyArr.push({
            ...item,
            capital: investment.capital,
            cumPercent: Math.round(cumWsp * 100)/100,
            percent: Math.round(wsp * 100)/100,
            cumInterests: Math.round(cumWsp/100 * investment.capital * 100)/100,
            interests:  Math.round(wsp/100 * investment.capital * 100)/100
        })
    })
}

processInvestment = (funds, investment, monthlyArr) => {
    //console.log('monthlyArr', monthlyArr.length)
    let obs = []
    let lastObs
    let arr = funds
        .filter( fund => fund.symbol === investment.symbol && new Date(fund.date).getTime() >= new Date(investment.dateStart).getTime() )
        .sort( (a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime()
        })
        .map((fund, index, array)=> {
            //A. monthly table
            //(1) choose obsevations dates
            if (index === 0) {
                lastObs = fund
                obs.push(lastObs)
            } else {
                if (new Date(fund.date).getMonth() !== new Date(lastObs.date).getMonth() && new Date(lastObs.date).getTime() !== new Date(obs[obs.length-1].date).getTime()) {
                    obs.push(lastObs)
                }
                lastObs = fund
                if (index === array.length-1) {
                    obs.push(fund)
                }
            }

            //B. percentage change
            return [
                new Date(fund.date).getTime(),
                Math.round( (fund.value - array[0].value)/array[0].value * 100 * 100 ) / 100, //versus first (start date)
                // index===0 ? 0 : Math.round( (fund.value - arr[index-1].value)/arr[index-1].value * 100 * 100 ) / 100, //versus previous date
                fund.value
            ]
        })

        //(2) calculate monthly table
        setTable(investment, obs, monthlyArr)

    return {
        name: investment.symbol,
        marker: {
          enabled: false,
          symbol: 'circle'
        },
      data: arr
  }
}

fLR = (series) => {
    // console.log(series)
    let trendSeries
    //series.forEach(item => {
    let avg = {
        x: Math.round(series.data.reduce((total, item) => total+item[0], 0) / series.data.length * 100) / 100,
        y: Math.round(series.data.reduce((total, item) => total+item[1], 0) / series.data.length * 100) / 100
    }
    let sumCounter = series.data.reduce((total, item) => total + (item[0] - avg.x)*(item[1] - avg.y), 0)
    let sumDenominator = series.data.reduce((total, item) => total + Math.pow( (item[0] - avg.x), 2), 0)
    let a = sumCounter / sumDenominator
    let lr = {
        a: a,
        b: avg.y - a * avg.x
    }

    trendSeries = {
        name: 'LR-'+series.name+'/'+Math.round(lr.a*CONST_ONE_YEAR*100)/100+'%',
        marker: {
          enabled: false
        },
        color: 'lightgrey', //series.color
        data: series.data.map(item => [
            item[0],
            Math.round( (lr.a * item[0] + lr.b)*100)/100
        ])
    }
    return trendSeries

}

function getMin1Month(series, dateTo) {
    const DAYS_BACK = 30
    let dateFrom = new Date(dateTo-DAYS_BACK*24*60*60*1000).getTime()
    //console.log('min.dateTo => dateFrom', dateTo, dateFrom, new Date(dateTo), new Date(dateFrom))
    let data = series.filter(item => item.date >= dateFrom && item.date <= dateTo)
    return data.reduce((min, p) => p.value < min ? p.value : min, data[0].value)
}

function getMax3Month(series, dateTo) {
    const DAYS_BACK = 90
    let dateFrom = new Date(dateTo-DAYS_BACK*24*60*60*1000).getTime()
    let data = series.filter(item => item.date >= dateFrom && item.date <= dateTo)
    return data.reduce((max, p) => p.value > max ? p.value : max, data[0].value)
}

fTS = (series) => {
    let dateStart = new Date(CONST_DATE_MIN_TS).getTime()
    let color = series.symbol.indexOf('OBL')>-1 ? '0,'+(Math.random()*255)+',255':'255,'+(Math.random()*255)+',0'
    let trendSeries = {
        name: series.symbol,
        marker: {
          enabled: false
        },
        color: 'rgba('+color+',1.0)',
        //color: , //series.color
        data: series.data.filter(item => item.date >= dateStart).map(item => [
            item.date,
            Math.round( ((getMin1Month(series.data, item.date)/getMax3Month(series.data, item.date)*100)-100) * 100) /100
        ])
    }
    return trendSeries

}