var axios = require('axios')
var Launcher = require("../launcher.js")

const Cbonds = require('./../models/cbonds-model')
const BASE_URL = 'https://cbonds.pl/api/chart/get_tradings/'
const DATE_FROM = '2021-01-01'
const DATE_TO = '2021-01-31' //###

exports.getAll = (req, res, next) => {
    const funds = ['NN-OBL','PEK-OBL']  
    let bondParams = []
    bondParams['NN-OBL'] = [
        [536249, 14.44],
        [164469, 8.55],
        [467059, 7.95],
        [724295, 6.29],
        [248389, 5.81],
        [343465, 5.30],
        [38087, 4.51],
        [724919, 4.43]
    ]
    bondParams['PEK-OBL'] = [
        [164469, 14.5],
        [248389, 9.6],
        [343465, 9.34],
        [38087, 8.89],
        [77635, 4.69],
        /*[526693, 4.37],*/
        [20091, 3.62],
        /*[326447, 2.67],*/
        [720985, 2.66],
        [712223, 2.47]
    ]

    //res.status(200).json(bondParams[fund])
    //return

    Cbonds.find( {} ).sort({emission_id: 1, date: -1}) 
        .then(function (result) {
            let arr = result.map(element => {
                return {
                    emission_id: element.emission_id, 
                    date: element.date,
                    indicative_price: element.indicative_price
                }
            })
            let outVal = [] 
            funds.forEach(fund => {
                let sum = bondParams[fund].reduce( (result, element) => result + element[1], 0 )
                //console.log('sum', sum)                
                let percentWeighted = bondParams[fund].map( element => element[1] / sum * 100)
                //console.log('percentWeighted', percentWeighted)
                
                let cbondValues = bondParams[fund].map(param => {
                    return arr.filter(bond => bond.emission_id*1 === param[0])
                            .filter( (el, index) => index <= 1)
                            .map(el => Number(el.indicative_price.replace(',','.'))/*{ 
                                return {
                                    e: el.emission_id,
                                    v: Number(el.indicative_price.replace(',','.')), 
                                    d: el.date
                                    }
                                }*/)
                })
                cbondValues = cbondValues.map(cbondValue => {
                    let change = (cbondValue[0]-cbondValue[1])/cbondValue[1]
                    cbondValue.push(change===null ? 0.0 : change)
                    return cbondValue
                })
                
                let change = percentWeighted.reduce( (sum, element, i) => sum + (cbondValues[i][2] * element), 0)
                //console.log('change', change, '%')

                outVal.push( {
                    fund: fund,
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


getCbond2 = (emmisionId, dateFrom, dateTo) => {    
    console.log('getCbond', emmisionId, dateFrom, dateTo);
    try {
        return axios({
            url: BASE_URL+dateFrom+'/'+dateTo+'/',
            method: 'post',
            params: {  
                "bonds": [emmisionId], 
                "grounds": [4]
            }
        })
    } catch (error) {
        console.error(error);
    }
}

exports.perform = (req, res, next) => {
    console.log('perform')
    getCbond2(724919, '2021-01-06', '2021-01-08').then(result => {
        //console.log(result.data[0])
        result.data.forEach(element => {
            console.log(element)  
            let cbond = new Cbonds(element)
            cbond.save()
                .then(function (result ){
                    console.log(result)
                })
                .catch(e => {
                    console.log('Error while saving Cbonds', e)
                })
        })
        res.json( result.data )
    })
}


exports.load = (req, res, next) => {
    let dictionary = [
        //NN-OBL
        536249,
        164469,        
        467059,
        724295,
        248389,
        343465,
        38087,
        724919,
        //PEK-OBL
        164469,
        248389,
        343465,
        38087,
        77635,
        526693,
        20091,
        326447,
        720985,
        712223
    ]
    //console.log(dictionary)
    // return 
    let pad = new Launcher(
        5, 
        dictionary, 
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
            let arr = []
            console.log('param', param)
            //return

            //store
            param.forEach(async el => {                               
                //temp
                console.log('==>', el.item, el.output.length)
                el.output.forEach(cbond => {
                    // arr.push(cbond)
                    //console.log(cbond.emission_id, 'cbond.emission_id', cbond.date)
                    Cbonds.find( {emission_id: cbond.emission_id, date: cbond.date}, function (err, docs) {
                        //console.log(cbond.emission_id, 'docs.length', docs.length) 
                        if (docs.length === 0) {
                            console.log('INSERT', docs.length)
                            let obj = new Cbonds(cbond)
                            obj.save()
                        } else {                
                            //console.log('EXISTS???', docs.length)
                        }
                    })    
                })               
            })

            //email
            //return
            // email.sendEmail('Funds (AnalizyOnline)'+new Date(), 
            //     '<a href="https://rm-app-funds.herokuapp.com">Look</a>'
            //     +'<div><pre><small>'+JSON.stringify(param.map(item=>item.output), ' ', 2)+'</small></pre></div>'
            // )                                   
        } 
    );
    pad.run()
    res.json('Loading started.')
}

getCbond = (item) => {
    console.log('getCbond', item, DATE_FROM, DATE_TO);
    try {
        return axios({
            url: BASE_URL+DATE_FROM+'/'+DATE_TO+'/',
            method: 'post',
            params: {  
                "bonds": [item], 
                "grounds": [4]
            }
        })
    } catch (error) {
        console.error(error);
    }
}

checkCbond = (item, input) => {
    console.log(item, 'checkCbond', input.data.length)
    return input.data
}