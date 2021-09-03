const utils = require("./libs/utils.js")
const TFI = require('./../config/TFI')
const TFIValues = require('./models/tfi-values-model')
const TFIMetaData = require('./models/tfi-metadata-model')
var variationsWithRepetion = require('./libs/variations-repetition').variationsWithRepetion

const CONST_MIN_DATE = new Date("2011-01-01")
const CONST_MAX_DATE = new Date("2015-12-31")
const CONST_DAY_MILLS = 1000*60*60*24


exports.calcStats = (period, dateFrom, dateTo) => {
    console.log('calcStats', period, dateFrom, dateTo)
    //let symbols = symbol.split(',').map(item => {return {symbol: item}})
    //let period = "Q" //month    
    let infos = [
        "mieszane polskie aktywnej alokacji",
        "mieszane polskie pozostałe",
        "mieszane polskie stabilnego wzrostu",
        "mieszane polskie z ochroną kapitału",
        "mieszane polskie zrównoważone",
        "mieszane zagraniczne aktywnej alokacji",
        "mieszane zagraniczne aktywnej alokacji (waluta)",
        "mieszane zagraniczne pozostałe",
        "mieszane zagraniczne stabilnego wzrostu",
        "mieszane zagraniczne z ochroną kapitału",
        "mieszane zagraniczne zrównoważone"
        /*
        "akcji polskich małych i średnich spółek",
        "akcji polskich pozostałe",
        "akcji polskich sektorowych pozostałe",
        "akcji polskich uniwersalne"
        */
    ]   

    let symbols = TFI.getList('*')
        //.filter(item => infos.indexOf(item.info) > -1)
        .map(item => { return {symbol: item.symbol} })  

    let query = {/*$or: symbols,*/ date: {$gte: dateFrom, $lte: dateTo } }

    if (true) return new Promise(function(resolve, reject) {
        //console.log('query', query) 
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
                

                //simulate earnings for portfolio
                let portfolioSimArr = [] 
                let portfolioConf = [
                    {symbol: 'ARK27', amount: 89718},
                    {symbol: 'ARS04', amount: 63975},
                    {symbol: 'ARK33S', amount: 42481},
                    {symbol: 'UNI03', amount: 15166},
                    {symbol: 'ING76', amount: 15026},
                    {symbol: 'SKR36', amount: 11082},
                    {symbol: 'ING65', amount: 11002},
                    {symbol: 'ING07', amount: 10435},
                    {symbol: 'ING17', amount: 8434},
                    {symbol: 'SKR54', amount: 6392},
                    {symbol: 'ALL14', amount: 6381},
                    {symbol: 'ARK57', amount: 6223},
                    {symbol: 'ALL75', amount: 6139},
                    {symbol: 'ING77', amount: 5470},
                    {symbol: 'SKR23', amount: 5272},
                    {symbol: 'ING91', amount: 5261},
                    {symbol: 'ING35', amount: 4937},
                    {symbol: 'ARK24', amount: 3989},
                    {symbol: 'ARK38', amount: 3428},
                    {symbol: 'ARS01', amount: 2657},
                    {symbol: 'ING71', amount: 1996}                                      
                ]
                //calculate portfolio changes
                let amount = 100
                if (true) fundData.forEach(fund => {
                    //let position = portfolioConf.find(ptf => ptf.symbol === fund.name)                    
                    fund.data.forEach(dat => {
                        portfolioSimArr.push([
                            fund.name, 
                            new Date(dat[0]).toISOString().substring(0,10),
                            dat[1],
                            Math.round(dat[1] * /*position.amount*/ amount/100 * 100)/100,
                            //position.amount
                        ])
                    })  
                })

                console.log('portfolioSimArr.length', portfolioSimArr.length) 
                resolve(portfolioSimArr) 
                                          
            }).catch(e => {
               reject(e.toString())
            })
    })
         
}

