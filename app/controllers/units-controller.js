const utils = require("../utils.js")
const UnitsPurchaseCtrl = require('./units/purchase')
const UnitsRedemptionCtrl = require('./units/redemption')
const UnitPurchase = require('./../models/unit-purchase-model')
const UnitRedemption = require('./../models/unit-redemption-model')
const UnitRegister = require('./../models/unit-register-model')
const TFIValues = require('./../models/tfi-values-model')

//internal function to register new purchase
async function _purchase(purchase) {
    let result_purchase = await new UnitPurchase(purchase).save()
    let result = await UnitsPurchaseCtrl.processPurchase(result_purchase)
    return(result) 
}

//end-point for POST request to register new purchase
exports.purchaseUnits = async (req, res, next) => {
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
        //symbol: symbol, 
        fromDate: {$lte: onDate},
        toDate: {$gt: onDate}
    })

    unique_registers = [...new Set(registers.map(reg => reg.symbol))].sort((a,b)=>a > b ? 1 : -1)
    
    try {
        let groupedArr = []
        let chartSeries = []
        for (let ur=0; ur<unique_registers.length; ur++) {
            let symbol = unique_registers[ur]
            let register = registers.filter(register => register.symbol === symbol)        
            let minDate = register.reduce((minDate, reg) => Math.min(minDate, reg.date), new Date())
            //console.log('symbol', symbol)
            let values = await TFIValues.find({symbol: symbol, date: {$gte: new Date(minDate), $lte: new Date(onDate)}}).sort({date: 1})
            //console.log('register', register.length)
            //outArr.push(values.length)

            //construct
            let chart = {}
            let invs = []        
            invs = register.map(reg => {
                //period changes
                let inv_history = values.filter(value => value.date >= reg.date).map(value => {
                    let ok = reg.date.getTime() === value.date.getTime() ? reg.price===value.value : null
                    if (ok===false) throw Error('Error between prices '+(new Date(reg.date))+' '+symbol+' '+reg.price+'<>'+value.value)
                    return {
                        symbol: symbol,
                        date: value.date,
                        value: value.value,
                        capital: Math.round( reg.units*reg.price *100)/100,
                        //price: reg.price,
                        //units: reg.units,
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
                    name: symbol,
                    marker: {enabled: false, symbol: "circle"},
                    data: chartData,
                    negativeColor:' red'
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
                        if (ifPeriodChanged(period, invh.date, last.date) && index !== inv_history.length-1) { //new Date(last.date).getTime() !== new Date(inv_history_grouped[inv_history_grouped.length-1].date).getTime()
                            inv_history_grouped.push(last)
                        }
                        last = invh
                        if (index === inv_history.length-1) {
                            inv_history_grouped.push(last)
                        }
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
                    d: reg.date,
                    u: reg.units,
                    p: reg.price,
                    history: inv_history_grouped,                    
                }
            })
            
            //normalize array
            invs.forEach(inv => {
                inv.history.forEach(his => {
                    groupedArr.push(his)
                })
            })

            

            //console.log(symbol, 'invs', invs.length)                    
        }
        res.json({
            status: 'OK',
            unique_registers: unique_registers,
            registers: registers,
            onDate: onDate,
            period: period,
            chartSeries: chartSeries,
            groupedArr: groupedArr,
            //minDate: new Date(minDate),
            invs: 0//@@@invs
        })

    } catch (e) {
        res.json({status: 'ERROR', error: e.toString()})
    }
    //console.log('outArr', outArr.length)


}


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