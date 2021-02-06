var axios = require('axios')
const { json } = require('express')
var Launcher = require("../launcher.js")
const utils = require("../utils.js")
const email = require("../email")

const Cbonds = require('./../models/cbonds-model')
const BASE_URL = 'https://cbonds.pl/api/chart/get_tradings/'

const MIN_DATE_FROM = new Date('2020-01-01') //###min date 

const funds = ['NN-OBL','PEK-OBL','SAN-OBL']  
let bondParams = []
bondParams['NN-OBL'] = [
    [20221, 0.74],
    [739107, 15.56],
    [751543, 9.45],
    [763057, 3.37],
    [27037, 0.14],
    [817559, 0.74],
    [79207, 0.19],
    [413421, 0.14],
    [828581, 0.55],
    [330175, 0.05],
    [31057, 0.11],
    [541423, 0.23],
    [697537, 0.55],
    [320671, 0.07],
    [360205, 0.04],
    [379041, 0.03],
    [237102, 0],
    [324751, 0.22],
    [20091, 0.49],
    [145407, 2.98],
    [700801, 1.19],
    /*[78907, 0.99],*/ /*13.01.2021 jest jakiś skok w wycenie*/
    [140693, 2.08],
    [35013, 0.94],
    [70023, 0.94],
    [364483, 0.06],
    [719145, 0.4],
    [19985, 0],
    [20089, 0.01],
    [20203, 0],
    [32297, 0.9],
    [38087, 0.05],
    [77635, 2.33],
    [164469, 7.19],
    [208949, 0],
    [248389, 4.78],
    [261003, 0.57],
    [293775, 1.27],
    [343465, 0.02],
    [467059, 6.59],
    [500687, 0.06],
    [536249, 10.84],
    [724295, 7.32],
    [762551, 0.81],
    [208775, 1.27],
    [679381, 1.2],
    [171745, 0.28],
    [87033, 0.61],
    [165275, 1.02],
    [34941, 0.03],
    [239355, 0.14]    
]
bondParams['PEK-OBL'] = [
    [326447, 1.69],
    [739107, 5.83],
    [742673, 1.58],
    [164469, 10.99],
    [248389, 7.73],
    [500687, 4.47],
    [724919, 2.59],
    [724295, 6.5],
    [38087, 3.98],
    [34941, 2.09],
    [411879, 6.27],
    [690659, 2.33],
    [784821, 3.13],
    [300703, 1.12],
    [742195, 2.72],
    [719145, 1.66],
    [679381, 1.14]    
]
bondParams['SAN-OBL'] = [
    [20091, 20.21],
    [239355, 1.12],
    [536249, 23.15],
    [724295, 26.47],
    [503951, 2.06],
    [739107, 22.05],
    [751543, 4.89],    
]

getDictionary = () => {
    let dictionary = []
    funds.forEach(
        fund => bondParams[fund].map(item => item[0]).forEach(
                item => dictionary.push(item)
        )           
    )
    return dictionary    
}

exports.download = (req, res, next) => {
    let arr = []
    Cbonds.find( {} )
        .sort({emission_id: 1, date: -1}) 
        .then(function (result) { 
            let cbondValues = bondParams['PEK-OBL'].map(param => {
                return result
                    .filter(bond => 1*bond.emission_id === param[0])
                    .map(bond => {
                        arr.push({
                            emission_id: 1*bond.emission_id,
                            date: new Date(bond.date).toISOString().substring(0,10),
                            indicative_price: bond.indicative_price//Number(bond.indicative_price.replace(',','.').replace(' ',''))
                        })
                    })
            })


            res.json(arr)
    })
        
    return

    // res.json("OK")
    let pad = new Launcher(
        5, 
        utils.getDaysArray(new Date('2021-01-01'), new Date()), 
        //callFunction,
        (item) => {
            return axios({
                url: 'http://localhost:8080/api/cbonds/calculate/'+item,
                method: 'get'
            })            
        },
        //callbackFunction,
        (item, input) => {
            return input.data
            return input.data.map(row => {
                return {
                    fund: row.fund,
                    date: row.date,
                    change: row.change
                }
            })    
        },
        //catchFunction
        (e, item)=> {
            console.log('Launcher catchFunction', e.toString().substring(0,100))
        },
        //finalCallBack
        (param) => {         
            let arr = []
            param.forEach(day => {
                day.output.forEach(item => {
                    arr.push({
                        day: day.item,
                        fund: item.fund,
                        change: item.change
                    })
                })
            })
            res.json(param)
        } 
    );
    pad.run()
    //res.json('Loading started.')
}

createPivotTable = (arr) => {
    let pivotArr = [[]]
    let pivotArrFilled = [[]]
    let uniqueX = [...new Set(arr.sort( (a, b) => a[0] > b[0] ? 1 : -1).map(item => item[0]))]
    let uniqueY = [...new Set(arr.sort( (a, b) => a[1] > b[1] ? 1 : -1).map(item => item[1]))]
    // console.log(uniqueX)
    // console.log(uniqueY)

    //init empty arrays
    uniqueX.forEach((x, xi) => {
        pivotArr[x] = []
        pivotArrFilled[xi] = []
        uniqueY.forEach((y, yi) => {
            pivotArr[x][y] = null
            pivotArrFilled[xi][yi] = {v1: null, v2:null, c:null}/*, null*/
        })
    })
    arr.forEach(el => {
        let x = el[0]
        let y = el[1]
        pivotArr[x][y] = el[2]
    })
    //   console.log(JSON.stringify(pivotArr))

    //fill with "original" values
    uniqueX.forEach((x, xi) => {
            uniqueY.forEach((y, yi) => {
                let ux = uniqueX[xi]
                let uy = uniqueY[yi]
                pivotArrFilled[xi][yi].v1 = pivotArr[x][y]
                pivotArrFilled[xi][yi].x = x
                pivotArrFilled[xi][yi].y = y
    //console.log(xi, yi, x, y, pivotArr[x][y], pivotArr[ux][uy])
            })
    })

    //fill the gaps (bottom-up, top-bottom)
    uniqueX.forEach((x, xi) => {

            let prevValue = pivotArrFilled[xi][0].v1
            uniqueY.forEach((y, yi) => {
                let curValue = pivotArrFilled[xi][yi].v1
                if (curValue !== null) {
                    pivotArrFilled[xi][yi].v2 = curValue
                    prevValue = curValue
                } else {
                    if (prevValue !== null) {
                        pivotArrFilled[xi][yi].v2 = prevValue   
                    } else {
                        let r = yi + 1
                        let newValue = null
                        while (r < pivotArrFilled[xi].length && newValue === null) {
                            newValue = pivotArrFilled[xi][r].v1
                            r++
                        }                    
                        if (newValue !== null) {
                            pivotArrFilled[xi][yi].v2 = newValue
                            prevValue = newValue
                        } else {
                            pivotArrFilled[xi][yi].c = 0.0
                        }
                    }
                }
                //calculate % change
                if (pivotArrFilled[xi][yi].c === null) {
                    if (yi === 0) {
                        pivotArrFilled[xi][yi].c = 0.0
                    } else {
                        pivotArrFilled[xi][yi].c = (pivotArrFilled[xi][yi].v2-pivotArrFilled[xi][yi-1].v2)/pivotArrFilled[xi][yi-1].v2*100 
                    }
                }
            })
    })
    return {
        emissions: uniqueX,
        pivotArrFilled: pivotArrFilled
    }
}

exports.calculate = (req, res, next) => {

    //for testing
    if (false) {
        res.json( [
            {
                name: 'XXX',
                data: [
                    [new Date("2021-01-04").getTime(), 0.1],
                    [new Date("2021-01-05").getTime(), 0.12],
                    [new Date("2021-01-07").getTime(), 0.17],
                    [new Date("2021-01-08").getTime(), 0.11],
                ]
            },
            {
                name: 'YYY',
                data: [
                    [new Date("2021-01-04").getTime(), 0.13],
                    [new Date("2021-01-05").getTime(), 0.17],
                    [new Date("2021-01-07").getTime(), 0.19],
                    [new Date("2021-01-08").getTime(), 0.12],
                ]
            }
        ] )
        return 
    }

    let effectiveDate = new Date(req.params.date)
    Cbonds
    .find( {date: { $gte: effectiveDate } } )
    .sort({emission_id: 1, date: 1}) 
    .then(function (result) {
        let arr = result.map(element => {
            let indicative_price
            try {
                indicative_price = Number(element.indicative_price.replace(',','.').replace(' ',''))
            } catch (e) {
                console.log('Invalid indicative_price', element.emission_id, element.date, element.indicative_price)
                indicative_price = null
            }
            return [
                1*element.emission_id, 
                new Date(element.date).toISOString().substring(0,10),  
                indicative_price                  
            ]
        })

        let pivotTable = createPivotTable(arr)
        
        //calculate funds
        let outArr = []
        if (true) funds/*.filter(item=>item==='NN-OBL')*/.forEach(fund => {
            //raw percentage sum
            let sum = bondParams[fund].reduce( (result, element) => result + element[1], 0 )
           
            //weighted percentage sum
            let percentWeighted = bondParams[fund].map( element => element[1] / sum * 100) 
            let sumPercentWeighted = percentWeighted.reduce( (result, element) => result + element, 0 ) 

            //make aux array with indexes (from pivot array) of fund bonds 
            let fundIndexes = bondParams[fund].map(bondParam => {
                return {
                    e: bondParam[0],
                    i: pivotTable.emissions.indexOf(bondParam[0]),
                    w: bondParam[1] //weight %
                }
            })
            
            //accumulate changes
            // let cbonds = []
            let data = []
            for (let dateRow = 0; dateRow < pivotTable.pivotArrFilled[0].length; dateRow++) {
                let weightedChange = 0.0
                fundIndexes.forEach(fundIndex => {
                    if (fundIndex.i !== -1) {
//if (pivotTable.pivotArrFilled[fundIndex.i][dateRow].c > 2) console.log(fundIndex.e, pivotTable.pivotArrFilled[0][dateRow].y, pivotTable.pivotArrFilled[fundIndex.i][dateRow].c)
                        weightedChange += pivotTable.pivotArrFilled[fundIndex.i][dateRow].c * fundIndex.w / 100
                    }      
                })  
                // cbonds.push({
                //     date: pivotTable.pivotArrFilled[0][dateRow].y,
                //     weightedChange: weightedChange,
                //     weightedChangeAcc: 0.0
                // })
                data.push( [
                    new Date(pivotTable.pivotArrFilled[0][dateRow].y).getTime(),
                    0.0
                ] )
                //add accumulative
                if (dateRow > 0) {
                    // cbonds[cbonds.length-1].weightedChangeAcc = cbonds[cbonds.length-2].weightedChangeAcc + weightedChange
                    data[data.length-1][1] = Math.round( (data[data.length-2][1] + weightedChange) * 100) / 100
                }
            }                       

            outArr.push({
                name: fund+'*',
                //sum: sum,
                //sumPercentWeighted: sumPercentWeighted,
                //percentWeighted: percentWeighted,
                //fundIndexes: fundIndexes,
                //cbonds: cbonds,
                data: data
            })
        })
        res.json(outArr)

        // res.json({
        //     pivotTable: pivotTable,
        //     outArr: outArr
        // })

    })

return
let arr = [
    [1, "2021-02-01T00:00:00.000Z", 1],
    [1, "2021-02-03T00:00:00.000Z", 2],
    [2, "2021-02-03T00:00:00.000Z", 3],
    [2, "2021-02-04T00:00:00.000Z", 4],
    [2, "2021-02-05T00:00:00.000Z", 5],
    [3, "2021-02-01T00:00:00.000Z", 6], 
    [3, "2021-02-02T00:00:00.000Z", 7],
    [3, "2021-02-03T00:00:00.000Z", 8],
    [4, "2021-02-01T00:00:00.000Z", null]   
  ]
  let pivotArrFilled = createPivotTable(arr)
  console.log(pivotArrFilled)
  res.json(pivotArrFilled)
}

exports.calculateNEW = (req, res, next) => {
    let effectiveDate = new Date(req.params.date)
    Cbonds
        .find( {date: { $lte: effectiveDate } } )
        .sort({emission_id: 1, date: -1}) 
        .then(function (result) {
            let arr = result.map(element => {
                let indicative_price
                try {
                    indicative_price = Number(element.indicative_price.replace(',','.').replace(' ',''))
                } catch (e) {
                    console.log('Can not create indicative_price', element.emission_id, element.date, element.indicative_price)
                    indicative_price = null
                }
                return [
                    1*element.emission_id, 
                    element.date,  
                    indicative_price                  
                ]
            })

            let pivotArr = {}
            arr.forEach(ele => {
                pivotArr[el.date] = {}
                pivotArr[el.date][elt.emission_id] = el.indicative_price
            })

            res.status(200).json(pivotArr)
        })
}

//calculate daily weighted percentage change
exports.calculateORY = (req, res, next) => {
    let dictionary = getDictionary()
    //console.log(dictionary.length, req.params.date)
    let effectiveDate = new Date(req.params.date)

    //return sorted by emission id (ASC) and date (DESC) 
    Cbonds.find( {date: { $lte: effectiveDate } } ).sort({emission_id: 1, date: -1}) 
        .then(function (result) {            
            let arr = result
                .filter(element => dictionary.indexOf(1*element.emission_id) > -1)
                .map(element => {
                try {
                    return {
                        emission_id: 1*element.emission_id, 
                        date: element.date,
                        indicative_price: Number(element.indicative_price.replace(',','.'))
                    }
                } catch (e) {
                    console.log('error', element.emission_id, e.toString().substring(0,50))
                    return {
                        emission_id: 1*element.emission_id, 
                        date: element.date,
                        indicative_price: Number(element.buying_quote.replace(',','.'))    
                    }
                }
            })

            let outVal = [] 
            funds.forEach(fund => {
                //raw percentage sum
                let sum = bondParams[fund].reduce( (result, element) => result + element[1], 0 )
               
                //weighted percentage sum
                let percentWeighted = bondParams[fund].map( element => element[1] / sum * 100)
                
                //return two last values
                let cbondValues = bondParams[fund].map(param => {
                    return arr.filter(bond => bond.emission_id === param[0])
                            .filter( (el, index) => index <= 1)
                            .map(el => el.indicative_price/*{ 
                                return {
                                    e: el.emission_id,
                                    v: Number(el.indicative_price.replace(',','.')), 
                                    d: el.date
                                    }
                                }*/)
                })
                
                //cbondValues = cbondValues.filter(item => item.length > 0)
                cbondValues.forEach((item,index) => {
                    if (item.length === 0) {
                        item.push(1)
                        item.push(1)
                    }
                })

                cbondValues = cbondValues.map(cbondValue => {
                    let change = (cbondValue[0] - cbondValue[1]) / cbondValue[1]
                    cbondValue.push(change===null ? 0.0 : change)
                    return cbondValue
                })
                
                //cbondValues.forEach(item => console.log(item, item.length) )

                //final weighted % change
                let change = percentWeighted.reduce( (sum, element, i) => sum + (cbondValues[i][2] * element), 0)

                outVal.push( {
                    fund: fund,
                    //show dates
                    date: effectiveDate,
                    arr: bondParams[fund].map(param => 
                            arr.filter((bond, index) => bond.emission_id === param[0])
                               .filter( (el, index) => index === 0).length//[0].date
                    ),
                    sum: sum,
                    percentWeighted: percentWeighted,
                    cbondValues: cbondValues,
                    change: Math.round(change * 10000) / 10000
                } )
            })
            res.status(200).json(outVal)
        })
        .catch (next) 
}


exports.load = (req, res, next) => {        
    //unique bonds
    let cbonds = [...new Set(getDictionary())]//.slice(0,3)

// res.json({
//     cbonds: cbonds,
//     length: cbonds.length
// })
// return

    let pad = new Launcher(
        5, 
        cbonds, 
        //callFunction,
        getCbond,
        //callbackFunction,
        checkCbond,
        //catchFunction
        (e, item)=> {
            console.log('migrate Launcher catchFunction', e.toString().substring(0,100))
        },
        //finalCallBack
        (param) => {  
            let msg = []       
            //store
            if (true) param.forEach(async el => {                               

                //console.log('==>', el.item, el.output.length)
                el.output.forEach(cbond => {
                    msg.push(cbond.emission_id+' ['+cbond.date+'] '+cbond.indicative_price)
                    Cbonds.find( {emission_id: cbond.emission_id, date: cbond.date}, function (err, docs) {
                        //console.log(cbond.emission_id, 'docs.length', docs.length) 
                        if (docs.length === 0) {                                
                            if (cbond.indicative_price !== undefined) {
                                //console.log(cbond.emission_id+' new value for '+cbond.date)
                                let obj = new Cbonds(cbond)
                                obj.save()
                            }
                        } else {        
                            if  (cbond.indicative_price === docs[0].indicative_price) {
                                //console.log(cbond.emission_id+' value for '+cbond.date+' already exists. OK '+docs.length)
                            } else {
                                console.log(cbond.emission_id+' value for '+cbond.date+' already exists. Values NOT OK '+docs.length+'/'+cbond.indicative_price+'!='+docs[0].indicative_price)
                            }                            
                        }

                    })    
                })               
            })
            //email
            email.sendEmail(' Cbonds (loaded)'+new Date(), 
                '<div><pre><small>'+JSON.stringify(msg, ' ', 2)+'</small></pre></div>'
            ) 
                                              
        } 
    );
    pad.run()
    res.json('Loading started.')
}

getCbond = async (item) => {
    //console.log(item, 'getCbond');
    try {
        result = await Cbonds.find( {emission_id: item} ).sort( {date: -1} )
                
        let dateFrom
        let dateTo = new Date().toISOString().substring(0,10)
        if (result.length === 0) {
            dateFrom = MIN_DATE_FROM.toISOString().substring(0,10)
        } else {
            dateFrom = new Date(result[0].date).toISOString().substring(0,10)
        }

// console.log(item, BASE_URL+dateFrom+'/'+dateTo+'/')

        return axios({
            url: BASE_URL+dateFrom+'/'+dateTo+'/',
            method: 'post',
            params: {  
                "bonds": [item], 
                "grounds": [item===326447 ? 51 : 4] //ground id ???
            }
        })
        
    } catch (error) {
        console.error(error);
    }
}

checkCbond = (item, input) => {
    //console.log(item, 'checkCbond', input.data.length)
    return input.data
}


//OLD
// getCbond2 = (emmisionId, dateFrom, dateTo) => {    
//     console.log('getCbond', emmisionId, dateFrom, dateTo);
//     try {
//         return axios({
//             url: BASE_URL+dateFrom+'/'+dateTo+'/',
//             method: 'post',
//             params: {  
//                 "bonds": [emmisionId], 
//                 "grounds": [4]
//             }
//         })
//     } catch (error) {
//         console.error(error);
//     }
// }

// exports.perform = (req, res, next) => {
//     console.log('perform')
//     getCbond2(724919, '2021-01-06', '2021-01-08').then(result => {
//         //console.log(result.data[0])
//         result.data.forEach(element => {
//             console.log(element)  
//             let cbond = new Cbonds(element)
//             cbond.save()
//                 .then(function (result ){
//                     console.log(result)
//                 })
//                 .catch(e => {
//                     console.log('Error while saving Cbonds', e)
//                 })
//         })
//         res.json( result.data )
//     })
// }
