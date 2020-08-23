const storage = require('../fund-storage')
const status = require("../status");

const CONST_TAX = 0.81

exports.load = (fund) => { 
    storage.getFundsValues().then(res => {
        let filtered = res.filter(item => {
            return item.symbol === fund.symbol && item.date >= fund.dateStart
        })
        .sort( (a, b) => {
            return a.date - b.date        
        })
        //console.log('filtered', filtered)

        //choose obsevations dates
        let obs = []
        lastObs = filtered[0]
        obs.push(lastObs)
        filtered.filter((i, index) => index > 0).map(item => {
            console.log('item.date', item.date, 'lastObs.date', lastObs.date)
            if (item.date.getMonth() !== lastObs.date.getMonth()) {
                console.log('push')
                if (lastObs.date.getTime() !== obs[obs.length-1].date.getTime()) obs.push(lastObs)
            }
            lastObs = item
        })
        obs.push(filtered[filtered.length-1])
        //console.log('obs', obs)

        //calculate %
        let arr = obs.map((item, index) => {
            let cumWsp = Math.round( (item.value - obs[0].value)/obs[0].value * 100 * 100) / 100
            let wsp = index>0 ? Math.round( (item.value - obs[index-1].value)/obs[index-1].value * 100 * 100) / 100: 0.0
            return {
                ...item._doc, 
                cumPercent: cumWsp,
                percent: wsp,                
                cumInterests: Math.round( CONST_TAX * cumWsp/100 * fund.capital * 100) / 100,
                interests:  Math.round(CONST_TAX * wsp/100 * fund.capital * 100) / 100
            }            
        })

        console.log('arr', arr)

        //store
        //arr.forEach(item => storage.storeResult(item))
        storage.storeResult(arr)
        status.setStatus(fund.symbol, true)
        console.log(status.getInfo())

    })
}