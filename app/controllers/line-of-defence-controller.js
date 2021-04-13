const utils = require("./../libs/utils.js")

const CONST_LO_LIMIT_A = -1
const CONST_LO_LIMIT_B = -3.5
const CONST_LO_LIMIT_C = -7
const CONST_LO_LAST_PERIOD = 90*24*60*60*1000

const SCALE_PIXS = 500

scaledValue = (value, min, max) => {
    return Math.round( (SCALE_PIXS / (max-min)) * (value - min) ) 
}

exports.getArr = (values, unique_registers) => {

    let groupedFunds = []
    values.forEach(fund => {
        if (groupedFunds[fund.symbol] === undefined) groupedFunds[fund.symbol] = []
        groupedFunds[fund.symbol].push({
            date: new Date(fund.date).getTime(), 
            value: fund.value
        })
    })
    let arr = Object.getOwnPropertyNames(groupedFunds)
    .map(item => {
        if (item.indexOf('length')!==0) return {
            symbol: item,
            data: groupedFunds[item]
        }
    })
    .filter(item => item)

    //return arr

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
        // .filter(f => invs.findIndex(inv => inv.symbol === f.symbol && (inv.dateEnd === null || inv.dateEnd === undefined)) > -1 )               
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
        //console.log('el.symbol', el.symbol)
        let prevMonth = previousMonthLastValue.filter(pf => pf.symbol === el.symbol)
        el.data.unshift(prevMonth[0].data[0])
        let ur = unique_registers.find(item => item.symbol === el.symbol)
        
        let threshold
        switch (ur.fundClass) {
            case 'A': threshold = CONST_LO_LIMIT_A; break;
            case 'B': threshold = CONST_LO_LIMIT_B; break;
            case 'C': threshold = CONST_LO_LIMIT_C; break;
        }  
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
            name: el.symbol+' '+ur.name,
            fundClass: ur.fundClass,
            threshold: threshold,
            marker: {
                enabled: true
            },
            //color: 'rgba('+color+',1.0)',
            data: data,
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
    .sort((a,b) => a.name > b.name ? 1 : -1)


    return fundsLOValues
}