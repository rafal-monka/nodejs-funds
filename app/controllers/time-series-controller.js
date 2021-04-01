
const Launcher = require("../libs/launcher.js")
const pivotTable = require("../libs/pivot-table.js")

const mySQLDatabase = require("./../../config/mysql-database")
const TFIValues = require('./../models/tfi-values-model')
const TimeSeries = mySQLDatabase.timeseries


function getSRRI(inputArr, period) {
    const SRRI = [
        { T: 5*12 /*, m: 12*/ }, //monthly
        { T: 5*52 /*, m: 52*/ }, //weekly
        { T: 5*365 /*, m: 365*/ }
    ] 


    let N = Math.min(SRRI[period].T, inputArr.length)
    let m = N / 5
    inputArr = inputArr.filter((item, index) => index <= N)

    let arithmeticMean = inputArr.reduce((total, item) => total+item.value, 0) / N 
    let variance = inputArr.reduce((total, item) => total + Math.pow( (item.value - arithmeticMean), 2), 0) * m / (N - 1)
    let stdDev = Math.sqrt(variance)

    let srri
    if (stdDev >= 0 && stdDev < 0.5) {
        srri = 1
    } else if (stdDev >= 0.5 && stdDev < 2.0) {
        srri = 2
    } else if (stdDev >= 2.0 && stdDev < 5.0) {
        srri = 3
    } else if (stdDev >= 5.0 && stdDev < 10.0) {
        srri = 4
    } else if (stdDev >= 10.0 && stdDev < 15.0) {
        srri = 5
    } else if (stdDev >= 15.0 && stdDev < 25.0) {
        srri = 6
    } else if (stdDev >= 25.0) {
        srri = 7
    }

    return [inputArr.length, N, m, arithmeticMean, variance, stdDev, srri]
}

exports.changeHeatMap = (req, res, next) => {
    const CONST_LIMIT = 100000

    let dateFrom = req.params.date ? new Date(req.params.date) : new Date(new Date() - 1000*60*60*24 * 30)
    let symbols = req.params.symbols.split(',').map(item => {return {symbol: item}})
    let query = { $or: symbols, date: {$gte: dateFrom } }

    //return
    TFIValues.find(query).sort({date:1}).limit(CONST_LIMIT).then(tfivalues => {
        let arr = tfivalues.map(item => [new Date(item.date).toISOString().substring(0,10), item.symbol, item.value])         
        let outArr = pivotTable.createPivotTable(arr)


        outArr.pivotArrPlain.forEach((row, r) => {
            let rowSum = 0
            for (let c=row.length-1; c>=0; c--) {
                let change = (c === 0 ? 0.0 : (row[c] === null ? null : Math.round( (row[c] - row[c-1]) / row[c-1]*100 *100)/100)) 
                let colorIntense = change === null ? null : Math.max(0, 255-Math.round(255 * Math.abs(change) / 5.0))
                let color = change === null ? 'lightgrey' : (change === 0 ? 'white' : (change > 0 ? 'rgb('+colorIntense+',255,'+colorIntense+')' : 'rgb(255,'+colorIntense+','+colorIntense+')'))
                row[c] = {
                    value: row[c],
                    change: change,
                    color: color
                }
                rowSum += (change === null ? 0.0 : row[c].change)
            }
            row.unshift(outArr.uniqueY[r])
            row.push({
                change: Math.round(rowSum*100)/100,
                color: 'grey'
            })
        })

        //this.heatMap.pivotArrFilled.push([])
        // outArr.pivotArrFilled.push([])
        // outArr.pivotArrFilled.forEach((col, c) => {
        //     let sumCol = 0
        //     col.forEach((row, r)=> {    
        //         if (c <= outArr.pivotArrFilled.length-2) {       
        //             let change = (c === 0 ? 0.0 : Math.round((row.v - outArr.pivotArrFilled[c-1][r].v)/outArr.pivotArrFilled[c-1][r].v*100 *100)/100 )
        //             let colorIntense = Math.max(0, 255-Math.round(255 * Math.abs(change) / 5.0))
        //             let color = change === 0 ? 'white' : (change > 0 ? 'rgb('+colorIntense+',255,'+colorIntense+')' : 'rgb(255,'+colorIntense+','+colorIntense+')')
        //             outArr.pivotArrFilled[c][r].ch = change
        //             outArr.pivotArrFilled[c][r].c = color
        //             sumCol += change
        //         }
        //         if (c === outArr.pivotArrFilled.length-2) {
        //             //console.log(c, r)
        //             let sumRow = outArr.pivotArrFilled.reduce((total, item, index) => total + (index <= outArr.pivotArrFilled.length-2 ? item[r].ch : 0.0), 0) 
        //             outArr.pivotArrFilled[outArr.pivotArrFilled.length-1].push(Math.round(sumRow*100)/100)
        //         }                
        //     })
        //     outArr.pivotArrFilled[c].push(Math.round(sumCol*100)/100)
        // })

        res.json(outArr)
    })
}

exports.test = (req, res, next) => {
    const CONST_MIN_ARRAY_LENGTH = 30
    let symbol = 'ARK29S'
    let category = 'STDEV'
    let period = 2

    TFIValues.find({symbol: symbol}).sort({date:1}).limit(99999).then(async tfivalues => {

        //grouped
        let grouped = []
        if (period === 0) {
            let prev = tfivalues[0]
            grouped.push(prev) //first
            tfivalues.forEach((tv, i) => {
                if ( i !== 0 && (new Date(tv.date).getMonth() !== new Date(prev.date).getMonth() || i === tv.length-1)) {
                    grouped.push(prev)
                }
                prev = tv
            })
            grouped.push(prev) //last

        } else if (period === 2) {
            grouped = tfivalues
        }

        //% change
        let arr = grouped.map((tv, i) => ({
                date: tv.date,
                value: i === 0 ?    0.0 : (tv.value - grouped[i-1].value) / grouped[i-1].value * 100
            })).sort((a,b)=> b.date - a.date)
        // res.json(arr)        
        // return


        //read last stored data
        let lastData = await TimeSeries.findAll({
            where : {symbol: symbol, cat: category}, 
            order: [['date', 'DESC']],
            limit: 1
        })        
// console.log(arr[0])

        //iterate through dates
        let records = []
        for (var i = 0; i < arr.length; i++) {
            let arr2 = arr.filter(a2 => a2.date <= arr[i].date)
            if (arr2.length >= CONST_MIN_ARRAY_LENGTH && (lastData.length === 0 || new Date(arr[i].date) > new Date(lastData[0].date))) {
                let srri = getSRRI(arr2, period)
                records.push({
                    //i: i,
                    symbol: symbol,
                    cat: category,
                    date: arr[i].date,                
                    //srri: srri
                    value: srri[5], //###=stdDev
                    comment: JSON.stringify(srri)
                })    
            } else {
                // console.log('break', i)
                break
            }
        }
      
        //INSERT    
        // let records = tfivalues.map(tv => ({
        //     symbol: tv.symbol,
        //     date: tv.date,
        //     value: tv.value
        // })) 
        if (true) TimeSeries.bulkCreate(records)
        .then(data => {
            console.log(symbol, category, (lastData.length === 0 ? 'no data' : lastData[0].dataValues.date), 'TimeSeries.bulkCreate', data.length)
            res.json({
                lastData: lastData,
                records: records
            }) 
        })
        .catch(err => {
            console.log('Catch', err.message)
            res.json('Catch '+err.message)
        });
    })   
}
