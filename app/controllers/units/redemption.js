const UnitRedemption = require('../../models/unit-redemption-model')
const UnitRegister = require('../../models/unit-register-model')
const TFIMetaData = require('../../models/tfi-metadata-model')

const methods = [
    {name: 'LIFO', f: (a,b) => {return a.date > b.date ? -1 : 1} },
    {name: 'FIFO', f: (a,b) => {return a.date < b.date ? -1 : 1} },
    {name: 'HIFO', f: (a,b) => {return a.price > b.price ? -1 : 1}}
]

function temp(symbol) {
    return new Promise((resolve, reject) => {
        TFIMetaData.find({symbol: symbol}, (err, res) => {
            resolve(res)
        }).exec()
    })
}

exports.processRedeem = async (redemption) => {
    console.log("purchase.processRedeem", redemption.date)
    
    //return new Promise(function(resolve, reject) {
        try {
            //console.log("purchase.processRedeem[1]")
            let result = await Promise.all([
                TFIMetaData.find({symbol: redemption.symbol}),
                UnitRegister.find({symbol: redemption.symbol, status: 'A', date: {$lt: redemption.date}})
            ])
            // let result = []
             
            // result[0] = await TFIMetaData.find({symbol: redemption.symbol})//.exec() //await temp(redemption.symbol) //
            // result[1] = await UnitRegister.find({symbol: redemption.symbol, status: 'A', date: {$lt: redemption.date}})//.exec() 
            // ])//.then(function (result) {
                //console.log("purchase.processRedeem[2]")
                //return
                //console.log('result[0]', result[0])
                //console.log(redemption.date, 'result[1]', result[1])
                //console.log('1', redemption.date)
            //return result
                //method
                let method = methods.find(m => m.name === result[0][0].method)   
                // console.log('method', method)                  
                let register = result[1].sort(method.f)

                //iterate
                let units_available = register.reduce((total, item) => total+item.units, 0)
                let units_to_redeem = redemption.units === -1 ? units_available : redemption.units
                //console.log('2', redemption.date)
                //check conditions
                if (register.length === 0) {
                    console.log('No units in register')
                    return( 'No units in register' )
                } 
                if (units_available < units_to_redeem) {
                    console.log('Unsufficient units '+units_available+' vs '+units_to_redeem)
                    return( 'Unsufficient units '+units_available+' vs '+units_to_redeem )
                }                 
                
                //console.log('3', redemption.date)
                //store                
                let redemption_result = await new UnitRedemption(redemption).save()//.then(function (redemption_result){

                    //console.log('4', redemption.date)
                    let outputArr = []
                    let i = 0                                            
                    while (units_to_redeem > 0 && i < register.length) {
                        let reg = {
                            _id: register[i]._id,
                            toDate: new Date(redemption.date),                            
                            status: '---',
                            redemption_id: redemption_result._id                            
                        }
                        let price_change = (redemption.price - register[i].price)
                        if (units_to_redeem >= register[i].units) {
                            units_to_redeem -= register[i].units
                            reg.redeemed_units = Math.round( register[i].units *1000000)/1000000
                            reg.gain = Math.round( reg.redeemed_units * price_change *100)/100
                            //deletion
                            outputArr.push(reg)
                        } else {
                            reg.redeemed_units = units_to_redeem
                            reg.gain = Math.round( reg.redeemed_units * price_change *100)/100
                            //deletion
                            outputArr.push(reg)

                            //new replacement
                            let reg2 = {
                                symbol: register[i].symbol,
                                distributor: register[i].distributor,
                                name: register[i].name,
                                date: register[i].date,
                                units: Math.round( (register[i].units - units_to_redeem)*1000000)/1000000,
                                price: register[i].price,
                                fromDate: new Date(redemption.date),
                                toDate: new Date(register[i].toDate),
                                status: 'A'
                            }
                            units_to_redeem = 0 
                            outputArr.push(reg2)
                        }
                        i++
                    }

                    //console.log('5', redemption.date)

                    //store changes in db
                    await outputArr.forEach(async reg => {
                        if (reg._id === undefined) {
                            //insert
                            console.log('INSERT')
                            let r = new UnitRegister(reg)
                            let res = await r.save()//.then(() => {})
                        } else {
                            //update
                            console.log('UPDATE')
                            reg.updated_at = new Date()
                            let res = await UnitRegister.findOneAndUpdate({_id: reg._id}, reg)
                        }
                    })

                    return {
                        redemption: redemption_result,
                        register: register,
                        outputArr: outputArr,
                        method: method.name
    
                    }
                //})


            //})
        } catch (e) {
            return e
        }        
    //})
}