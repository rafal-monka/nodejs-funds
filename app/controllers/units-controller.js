const utils = require("../libs/utils.js")

const UnitPurchase = require('./../models/unit-purchase-model')
const UnitRedemption = require('./../models/unit-redemption-model')
const UnitRegister = require('./../models/unit-register-model')
const TFIValues = require('./../models/tfi-values-model')
const TFIMetaData = require('./../models/tfi-metadata-model')

const UnitsPurchaseCtrl = require('./units/purchase')
const UnitsRedemptionCtrl = require('./units/redemption')
const LineOfDefenceCtrl = require('./line-of-defence-controller')

//internal function to register new purchase
async function _purchase(purchase) {
    let result_purchase = await new UnitPurchase(purchase).save()
    let result = await UnitsPurchaseCtrl.processPurchase(result_purchase)
    return(result) 
}

//end-point for POST request to register new purchase
exports.purchaseUnits = async (req, res, next) => {
    // res.json( req.body )
    // return
    try {
        let result = await _purchase(req.body.purchase)
        res.json( { 
            result: result,
            status: 'OK'
        })
    } catch (e) {
        res.json( { 
            error: e.toString(),
            status: 'ERROR'
        } )
    }
} 

//internal function to redeem units
async function _redeem(redemption) {
    let result = await UnitsRedemptionCtrl.processRedeem(redemption)
    return result
}

//end-point for POST request to redeem units
exports.redeemUnits = async (req, res, next) => {  
    //res.json( req.body )
    //return
    try {
        let result = await _redeem(req.body.redemption)
        res.json( { 
            result: result,
            status: 'OK'
        } )
    } catch (e) {
        res.json( { 
            error: e.toString(),
            status: 'ERROR'
        } )
    }
} 

//rebuild register based on purchases and redemptions
exports.rebuildRegister = (req, res, next) => {
    console.log( 'rebuildRegister()', req.body.symbol)

    let symbol = req.body.symbol
    Promise.all([
        UnitPurchase.find({symbol: symbol}),
        UnitRedemption.find({symbol: symbol})
    ]).then(function (result) {
        let purchases = result[0]
        let redemptions = result[1]

        let operations = []
        purchases.forEach(item => {
            operations.push( {
                type: 'P',
                date: item.date,
                object: item
            })
        })
        redemptions.forEach(item => {
            operations.push( {
                type: 'R',
                date: item.date,
                object: item
            })
        })
        operations = operations.sort((a,b) => a.date > b.date ? 1 : -1)

        UnitRegister.deleteMany({symbol: symbol}, async function(err, result) {

            for (let o=0; o<operations.length; o++) {
                console.log(o, operations[o].type, operations[o].object.date, operations[o].object.units)
                switch(operations[o].type) {
                    case 'P': 
                        await UnitsPurchaseCtrl.processPurchase(operations[o].object); 
                        break;
                    case 'R': 
                        await UnitsRedemptionCtrl.processRedeem(operations[o].object); 
                        break;
                }
                await delay(100)
            }

            res.json( {
                purchases: purchases,
                redemptions: redemptions,
                operations: operations
            })
        } ) 
    })
}

function ifPeriodChanged(period, date1, date2) {
    date1 = new Date(date1)
    date2 = new Date(date2)
    let change
    switch (period) {
        case 'Y': 
            change = date1.getFullYear() !== date2.getFullYear()
            break;                                    
        case 'Q': 
            change = utils.getQuarter(date1) !== utils.getQuarter(date2)
            break;
        case 'M': 
            change = date1.getMonth() !== date2.getMonth()
            break; 
        case 'D': 
            change = date1.getDay() !== date2.getDay()
            break;             
        default: 
            change = true
            break;
    }
    return change
}

exports.getRegister = async (req, res, next) => {
    let onDate = req.params.date === "*" ? new Date() : req.params.date
    let period = req.params.period

    //read from db
    let registers = await UnitRegister.find({ 
        fromDate: {$lte: onDate},
        toDate: {$gt: onDate},
        units: {$gt: 0.0} 
    })

    //unique symbols
    let unique_registers = [...new Set(registers.map(reg => reg.symbol))].sort((a,b)=>a > b ? 1 : -1) //temp: [...new Set( ['ING04'] )] 
    let query_symbols = unique_registers.map(item => {return {symbol: item}})

    //add class info (A, B, C) to unique_registers beside symbol
    let metadata = await TFIMetaData.find({symbol: {$in: unique_registers/*$or: querySymbols*/}})
    let unique_registers_full = unique_registers.map(symbol => {
        let tfi = metadata.find(item => item.symbol === symbol)
        return {
          symbol: tfi.symbol,
          name: tfi.name,
          type: tfi.type,
          fundClass: tfi.class
        }
    })

    try {
        let groupedArr = []
        let chartSeries = []

        let minDateForAll = registers.reduce((minDate, reg) => Math.min(minDate, reg.date), new Date())
        let valuesAll = await TFIValues.find({symbol: {$in: unique_registers/*$or: querySymbols*/}  /*$or: query_symbols*/, date: {$gte: new Date(minDateForAll), $lte: new Date(onDate)}}).sort({date: 1})

        for (let ur=0; ur<unique_registers_full.length; ur++) {
            let symbol = unique_registers_full[ur].symbol
            let register = registers.filter(register => register.symbol === symbol)        
            //let minDate = register.reduce((minDate, reg) => Math.min(minDate, reg.date), new Date())
 
            //construct arrays
            let chart = {}
            let invs = []        
            invs = register.map(reg => {
                //period changes
                let reg_values = valuesAll.filter(value => value.symbol === reg.symbol && value.date >= reg.date)
                let inv_history = reg_values.map(value => {
                    let ok = reg.date.getTime() === value.date.getTime() ? reg.price===value.value : null
                    if (ok===false) throw Error('Error between prices '+(new Date(reg.date))+' '+symbol+' '+reg.price+'<>'+value.value)
                    return {
                        symbol: symbol,
                        fundClass: unique_registers_full[ur].fundClass,
                        date: value.date,
                        value: value.value,
                        capital: Math.round( reg.units*reg.price *100)/100,
                        //price: reg.price,
                        units: reg.units,
                        cumPercent: Math.round( 100* (value.value - reg.price)/reg.price * 100)/100,
                        cumInterests: Math.round( (value.value*reg.units - reg.price*reg.units) * 100)/100,
                        val0: Math.round( reg.price*reg.units * 100)/100,     
                        valn: Math.round( value.value*reg.units * 100)/100
                    }
                })
                //console.log('inv_history', inv_history.length)

                            
                let chartData = inv_history.map(his => [
                    his.date.getTime(),
                    his.cumPercent,
                    his.value
                ])
                chart = {
                    name: symbol+' '+unique_registers_full[ur].name,
                    fundClass: unique_registers_full[ur].fundClass,
                    marker: {enabled: false, symbol: "circle"},
                    data: chartData,
                    //negativeColor:' red',
                    value: reg.units * reg_values[reg_values.length-1][1],
                    units: reg.units
                }
                chartSeries.push(chart)

                //cummulate per period
                let inv_history_grouped = []
                let last
                inv_history.forEach((invh, index) => {
                    if (index === 0) {
                        last = invh
                        inv_history_grouped.push(last)
                    } else {
                        if (ifPeriodChanged(period, invh.date, last.date) /*&& index !== inv_history.length-1*/) { 
                            inv_history_grouped.push(last)
                        }
                        if (index === inv_history.length-1) {
                            inv_history_grouped.push(invh)
                        }
                        last = invh
                    }                    
                })
                inv_history_grouped = inv_history_grouped.map((item, index) => {
                    if (index === 0) {
                        item.interests = 0.0
                    } else {
                        item.interests = Math.round((item.cumInterests - inv_history_grouped[index-1].cumInterests)*100)/100
                    }
                    return item
                })

                return {     
                    symbol: reg.symbol,       
                    d: reg.date,
                    units: reg.units,
                    p: reg.price,
                    capital: Math.round( reg.units*reg.price *100)/100,
                    curPrice: reg_values[reg_values.length-1].value,
                    valn: reg.valn,
                    history: inv_history_grouped,                    
                }
            })
            
            //normalize array
            invs.forEach(inv => {
                inv.history.forEach(his => {
                    groupedArr.push(his)
                })
                groupedArr.push({
                    symbol: inv.symbol,
                    fundClass: unique_registers_full[ur].fundClass,
                    date: '9999-12-31',
                    value: 0.0,
                    interests: 0.0,
                    units: inv.units,
                    capital: inv.capital,
                    curPrice: inv.curPrice,
                    //curPrice = curPrice2: inv.history[inv.history.length-1].value,
                    valn: inv.history[inv.history.length-1].valn
                })
            })
            //console.log(symbol, 'invs', invs.length)                    
        }

        //line od defence
        let lineOfDefence = LineOfDefenceCtrl.getArr(valuesAll, unique_registers_full)

        //return result 
        res.json({
            status: 'OK',
            unique_registers: unique_registers_full,
            metadata: metadata,
            registers: registers,
            onDate: onDate,
            period: period,
            chartSeries: chartSeries,
            groupedArr: groupedArr,
            lineOfDefence: lineOfDefence
            //minDate: new Date(minDate)
        })

    } catch (e) {
        res.json({status: 'ERROR', error: e.toString()})
    }
    //console.log('outArr', outArr.length)


}


exports.getFullRegister = async (req, res, next) => {
    let onDate = req.params.date === "*" ? new Date() : req.params.date

    let _time = new Date()
    //read from db
    let registersActive = await UnitRegister.find({ 
        fromDate: {$lte: onDate},
        toDate: {$gt: onDate}
    })

    //unique symbols
    let uniqueRegisters = [...new Set(registersActive.map(reg => reg.symbol))].sort((a,b)=>a > b ? 1 : -1) //temp: [...new Set( ['ING04'] )] 
    
    //add class info (A, B, C) to unique_registers beside symbol
    let metadata = await TFIMetaData.find({symbol: {$in: uniqueRegisters/*$or: querySymbols*/}})

    let uniqueRegistersExt = uniqueRegisters.map(symbol => {
        let tfi = metadata.find(item => item.symbol === symbol)
        return {
            symbol: tfi.symbol,
            name: tfi.name,
            type: tfi.type,
            fundClass: tfi.class
        }
    })
    
    //minimum date for all symbols (in order to make only one db query)
    let minDateForAll = registersActive.reduce((minDate, reg) => Math.min(minDate, reg.date), new Date())    
    //console.log(new Date() - _time, 'time1')
    let valuesAll = await TFIValues
        .find({
            symbol: {$in: uniqueRegisters/*$or: querySymbols*/}, 
            date: {$gte: new Date(minDateForAll), $lte: new Date(onDate)}
        })
        .sort({date: 1})

    //console.log(new Date() - _time, 'time2')

    res.json({
        uniqueRegistersExt: uniqueRegistersExt,
        registersActive: registersActive.map(reg => 
            {
                let valuesSymbol = valuesAll.filter(item => item.symbol === reg._doc.symbol)
                return {
                    ...reg._doc,
                    fname: metadata.find(item => item.symbol === reg._doc.symbol).name,
                    valn: valuesSymbol[valuesSymbol.length-1].value,
                    daten: valuesSymbol[valuesSymbol.length-1].date
                }
            }
        ),
        minDateForAll: minDateForAll,
        valuesAll: valuesAll.length
    })

}


//------------------------------------------------------temp

exports.clearAll = async (req, res, next) => {
    UnitPurchase.deleteMany({}, async function(err, result) {})
    UnitRedemption.deleteMany({}, async function(err, result) {})
    UnitRegister.deleteMany({}, async function(err, result) {})
    res.json('clear-all')
}

const delay = ms => new Promise(res => setTimeout(res, ms))

exports.testPurchases = async (req, res, next) => {
    let data = [
        {symbol: 'ARK11', distributor: 'Santander', date: '2020-06-24', units: 41.462535, price: 23.5}, 
        {symbol: 'ARK11', distributor: 'Santander', date: '2020-06-30', units: 4133.939644, price: 23.57}, 
        {symbol: 'ARK23', distributor: 'Santander', date: '2020-06-30', units: 66.628466, price: 1500.86}, 
        {symbol: 'ARK01', distributor: 'Santander', date: '2020-06-25', units: 32.538206, price: 28.67}, 
        {symbol: 'ING04', distributor: 'Moje ING', date: '2020-07-02', units: 289.050757, price: 345.96}, 
        {symbol: 'ING04', distributor: 'Moje ING', date: '2020-08-07', units: 172.965493, price: 346.89}, 
        {symbol: 'SKR36', distributor: 'mBank', date: '2020-12-29', units: 112.9518, price: 159.36}, 
        {symbol: 'SKR36', distributor: 'PSAT', date: '2021-01-14', units: 122.8954, price: 165.14}, 
        {symbol: 'SKR23', distributor: 'Kupfundusz.pl', date: '2021-01-07', units: 80.701566, price: 185.87}, 
        {symbol: 'ALL14', distributor: 'mBank', date: '2020-12-29', units: 34.2661, price: 175.1}, 
        {symbol: 'ALL75', distributor: 'Kupfundusz.pl', date: '2020-12-29', units: 26.0734, price: 230.12}, 
        {symbol: 'ALL75', distributor: 'Kupfundusz.pl', date: '2021-02-10', units: 15.1217, price: 264.52}, 
        {symbol: 'ING17', distributor: 'Moje ING', date: '2021-02-11', units: 24.352626, price: 246.38}, 
        {symbol: 'ING17', distributor: 'Moje ING', date: '2021-03-03', units: 16.147263, price: 247.72}, 
        //{symbol: 'ALL75', distributor: 'Kupfundusz.pl', date: '2021-03-05', units: 17.2518, price: 231.86},              
    ]
    for (let i=0; i<data.length; i++) {
        let res = await _purchase(data[i])
        await delay(100)
        console.log('testPurchases', i, data[i].date, data[i].units)
    }
    res.json( 'testPurchases()' )
}

exports.testRedeems = async (req, res, next) => {    
    let data = [ 
        {
            "symbol": "ING04",
            "distributor": "Moje ING",
            "date": "2021-03-03",
            "units": 11.363959,
            "price": 351.99
        }
    ]

    for (let i=0; i<data.length; i++) {
        let res = await _redeem(data[i])
        await delay(100)
        console.log('testRedeems', i, data[i].date, data[i].units)
    }

    res.json( 'testRedeems()' )
}

//-------------------------------------------------------old
// let querySymbols = uniqueRegisters.map(item => {return {symbol: item}})

