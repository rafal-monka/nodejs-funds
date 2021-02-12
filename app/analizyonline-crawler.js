var axios = require('axios');
var DomParser = require('dom-parser');
var Launcher = require("./launcher.js");
const storage = require('./fund-storage')
const email = require("./email")
const TFI = require('../config/TFI')
const Funds = require('./models/funds-model')
const utils = require("./utils.js")

exports.perform = async (req) => {
    console.log('analizyonline-crawler perform')
    let dictionary = await storage.getDictionary()    
    // return 
    let pad = new Launcher(
        10, 
        dictionary, 
        //callFunction,
        getFund,
        //callbackFunction,
        parseFund,
        //catchFunction
        (e, item)=> {
            console.log('aol-crawler Launcher catchFunction', e.toString().substring(0,100))
        },
        //finalCallBack
        (param) => {         
            let arr = []
            //console.log('param', param)
            //return

            //store
            param.sort((a,b) => a.output.title > b.output.title ? 1: -1).forEach(el => {                               
                //temp
                arr.push({
                    title: el.output.title, 
                    symbol: el.item.symbol,
                    date: new Date(el.output.date).toISOString().substring(0,10), 
                    value: el.output.value
                })
                //console.log('==>', el.item.symbol, new Date(el.output.date), el.output.value)
                storage.store(el.item.symbol, new Date(el.output.date), el.output.value)                
            })

            //% change 
            Funds
                .find({})
                .sort({date: -1, symbol: 1}) 
                .limit(arr.length*2)
                .then(function (result) {
                    //console.log(result.length)
                    let changes = result
                        .filter((item, index) => index < arr.length)
                        .map((item, index) => {
                            return {
                                symbol: item.symbol,
                                date: item.date,
                                change: Math.round( ((item.value - result[arr.length+index].value) / result[arr.length+index].value * 100) * 100)/100,
                            }
                        })
                    //console.log(changes)
                    arr = arr.map((a,i)=> {
                        let change = changes.filter(ch => ch.symbol === a.symbol)
                        let position = {
                            title: a.title,
                            date: a.date,
                            value: a.value,
                            change: change[0].change,
                            msg: ''
                        }
                        if (new Date(change[0].date).getTime() !== new Date(a.date).getTime()) {
                            position.msg = 'Check dates ['+new Date(change[0].date).toISOString().substring(0,10)+'] ['+a.date+']'
                        }
                        return position 
                        
                    })
                    //console.log(arr)
                    //email
                    if (true) email.sendEmail(' Funds (AnalizyOnline) '+new Date(), 
                    '<a href="'+req.protocol + '://' + req.get('host')+'">Show panel</a>'
                    +'<br><br>'
                    +'<a href="'+req.protocol + '://' + req.get('host')+'/compare/'+TFI.CONST_CBONDS_FUNDS+'/'+TFI.DATE_COMPARE_FROM.toISOString().substring(0,10)+'">Show comparition chart</a>'
                    +'<br><br><a href="https://money.cnn.com/data/fear-and-greed/">Fear and greed</a>'
                    //+'<div><pre><small>'+JSON.stringify(arr, ' ', 2)+'</small></pre></div>'
                    +'<div><pre>'+utils.json2Table(arr, [0,0,1,1,0], 'change')+'</pre></div>'
                ) 
                })                                              
        } 
    );
    pad.run()
}


getFund = (item) => {    
    //console.log('getFund', item.code);
    try {
        return axios({
            url: item.aolurl,
            method: 'get',
            params: { }
        })
    } catch (error) {
        console.error(error);
    }
}


parseFund = (item, html) => {  
    var parser = new DomParser();
    var dom = parser.parseFromString(html.data);
    
    let result = {}; 
	try {
        let productValueSumUp = dom.getElementsByClassName('productValueSumUp')[0]
        let value = productValueSumUp.getElementsByClassName('productBigText')[0].innerHTML
        let date = productValueSumUp.getElementsByClassName('lightProductText')[0].innerHTML
        // console.log(date.substring(0,2), date.substring(3,5), date.substring(6,10))
        result = { 
            title: dom.getElementsByClassName('productName')[0].innerHTML,
            date: new Date(date.substring(6,10)+"-"+date.substring(3,5)+"-"+date.substring(0,2)),
            value: 1.0*value.replace(',','.').replace(' ','')
        }
        // console.log('result', result)
        return result;        
	} catch (e) {
        console.error(e);        
        console.log(item);
		return result;
	}
}







//----------------
// if (el.item.startValue > 0) {
//     diff = (el.output.value - el.item.startValue) / el.item.startValue
//     interests = Math.round(diff * el.item.capital * 100) / 100
//     arr.push({
//         code: el.item.code,
//         fund: el.output.title,
//         startDate: el.item.startDate,
//         startValue: el.item.startValue,
//         date: new Date(el.output.date),
//         value: el.output.value,
//         diff: Math.round(diff * 100 * 100)/100,
//         interests: interests,
//         interests_net: Math.round(interests*0.81*100)/100
//     })                      
// }  


// let arr = []  
// let diff
// let interests
// console.log(arr)
// let total = arr.reduce((total,item) => total+item.interests_net, 0 )
// console.log('total', total)

// [
//     {
//         symbol: 'NN-OBL',
//         code: 'nn-obligacji',
//         startDate: '2020-07-02',  
//         startValue: 345.96, 
//         capital: 100000.0
//     },
//     // {
//     //     code: 'nn-obligacji',
//     //     startDate: '2020-08-08',  
//     //     startValue: 0.0, 
//     //     capital: 60000.0
//     // },
//     {
//         symbol: 'SKB-OBL',
//         code: 'SKARBIEC-Obligacja', 
//         startDate: new Date('2020-08-09'),                 
//         startValue: 0.0, 
//         capital: 20000.0
//     },
//     {
//         symbol: 'SKB-SWZ',
//         code: 'SKARBIEC-Sek-Nieruch', 
//         startDate: new Date('2020-08-09'),
//         startValue: 0.0, 
//         capital: 20000.0
//     },
//     {
//         symbol: 'SAN-OBL',
//         code: 'Santander-Obligacji-Skarbowych-A', 
//         startDate: new Date('2020-06-30'), 
//         startValue: 23.57, 
//         capital: 100000.0
//     },
//     {
//         symbol: 'SAN-OBLP',
//         code: 'Santander-Prestiz-Obligacji-Skarbowych',
//         startDate: new Date('2020-06-30'),  
//         startValue: 1500.86, 
//         capital: 100000.0
//     },
//     {
//         symbol: 'SAN-AKP',                
//         code: 'Santander-Akcji-Polskich-A', 
//         startDate: new Date('2020-06-25'), 
//         startValue: 0.0, 
//         capital: 1000.0
//     },
//     {
//         symbol: 'PEK-OBL',                
//         code: 'Pekao-Obligacji-Dynamiczna-Alokacja-2-FIO', 
//         startDate: new Date('2020-08-10'), 
//         startValue: 0.0,
//         capital: 200000.0
//     }
//     // '',Quercus
// ]