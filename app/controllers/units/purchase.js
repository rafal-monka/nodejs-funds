
const UnitRegister = require('../../models/unit-register-model')

exports.processPurchase = async (purchase) => {
    console.log("purchase.processPurchase", purchase.date)

    //return new Promise(function(resolve, reject) {
        try {
            //throw new Error('Error in processPurchase')
            let register = {
                symbol: purchase.symbol, 
                distributor: purchase.distributor,
                name: purchase.name,
                date: purchase.date,
                units: purchase.units,
                price: purchase.price,
                fromDate: purchase.date,
                toDate: new Date("9999-12-31"),
                status: 'A',
                gain: 0.0,
                redeemed_units: 0.0
            }
            let result = await new UnitRegister(register).save()//.then(function (result){
            return {
                purchase: purchase,
                register: result
            }
            //})            
        } catch (e) {
            return e
        }        
    //})
}