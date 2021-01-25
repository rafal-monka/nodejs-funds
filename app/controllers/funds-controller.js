const Funds = require('./../models/funds-model')
const Investments = require('./../models/investments-model')
const Dict = require('./../models/dicts-model')

const CONST_DATE_START = "2020-06-01"
const CONST_TAX = 0.81
const CONST_ONE_DAY = 24*60*60*1000
const CONST_ONE_YEAR = 365 * CONST_ONE_DAY

let monthlyArrOBL = []
let monthlyArrAKC = []

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
                    moneyplsymbol: item.moneyplsymbol,
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

            res.status(200).json( {
                dict: dict,
                // invs: invs,
                // funds: funds,
                chartDataOBL: chartDataOBL,
                monthlyArrOBL: monthlyArrOBL,
                chartDataAKC: chartDataAKC,
                monthlyArrAKC: monthlyArrAKC
            })
        })
        .catch (next) 
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
    console.log('monthlyArr', monthlyArr.length)
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