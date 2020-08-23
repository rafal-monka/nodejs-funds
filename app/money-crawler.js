var axios = require('axios')
const qs = require('querystring')
const csv = require('csv-parse') //https://csv.js.org/parse/
const storage = require('./fund-storage')
var Launcher = require("./launcher.js")
const { resolve } = require('path')

const BASE_URL = "https://www.money.pl/fundusze/archiwum/fundusze/"

//  santander OBL = TFI112
//  santander OBLP = TFI4562
//  santander AKP = TFI1 
//  skarbiec OBL = TFI66
//  skarbiec SWZ = TFI4635
//  peako OBL = TFI8172
//  nn OBL = TFI6771
//  quercus = TFI5438


getCSV = (symbol, moneyplsymbol, dateFrom, DateTo, resolveCallback, rejectCallback) => {
    console.log('getCSV', symbol, moneyplsymbol, dateFrom, DateTo)
    const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
    }
    const requestBody = {
        od: dateFrom,
        do: DateTo,
        symbol: moneyplsymbol,
        format: 'csv'
    }
    return axios.post( BASE_URL, qs.stringify(requestBody), config).then(res => {
        //console.log('res', res.data)
        csv( res.data, {
            from_line: 3,
            skip_lines_with_error: true,
            delimiter: ','
        } , function(err, records){
            //console.log('records', records)
            //records.forEach(rec => console.log(rec[0], 1*rec[1].replace(',','.')) )
            records.forEach(rec => {
                try {
                    //console.log(symbol, new Date(rec[0]), rec[1])
                    storage.store(symbol, new Date(rec[0]), 1*rec[1].replace(',','.'))
                } catch (e) {
                    console.log('Error', symbol, rec, e.toString())
                    rejectCallback(e)
                }                 
            })
            console.log('getCSV', 'Storing...', symbol, moneyplsymbol, dateFrom, DateTo)
            resolveCallback()
        })
        
    })
}


exports.import = async (dateFrom, dateTo) => {
    let dictionary = await storage.getDictionary()
    dictionary.forEach(fund => {
        console.log(fund.symbol, fund.moneyplsymbol, dateFrom, dateTo)
        getCSV(fund.symbol, fund.moneyplsymbol, dateFrom, dateTo)
    })    
}

exports.importFund = (symbol, moneySymbol, yearFrom, yearTo, dFrom, dTo)=> {
    let dateFrom = new Date(dFrom)
    let dateTo = new Date(dTo)
    Array.prototype.range = function () {
        let array = []
        this.map((item, index, arr) => {
          let i=arr
          while (arr[0] <= arr[1]) {
              array.push(arr[0])
              arr[0]++
          }
        })
        return array
      }
    let dates = []
    let years = [yearFrom, yearTo].range()    
    let months = [0,11].range() 
    for (let y=0; y<years.length; y++) {
        for (let m=0; m<months.length; m++) {            
            let d1 = new Date(years[y], months[m], 2)
            let d2 = new Date(years[y], months[m]+1, 1)
            //if (d1 >= new Date(dateFrom))
            //console.log(years[y], months[m], d1, d2)
            //getCSV('PEK-OBL', 'TFI8172', d1, d2)
            // let dateFrom = new Date(years[y], months[m], 1)
            let dF = d1 >= dateFrom ? d1 : dateFrom
            let dT = d2 <= dateTo ? d2 : dateTo
            if (dF <= dT) dates.push([dF, dT]) 
        }   
    }  

    // console.log(dates)
    //for (let i=0; i<dates.length-1; i++) console.log(dates[i])
    //return

    let pad = new Launcher(
        1, 
        dates, 
        //callFunction,
        (item)=> {
            return new Promise(async function(resolve, reject) {
                 //console.log('crawler', item[0].toISOString().substring(0,10), item[1].toISOString().substring(0,10))
                 getCSV(symbol, moneySymbol, item[0].toISOString().substring(0,10), item[1].toISOString().substring(0,10), resolve, reject)
            })
        },
        //callbackFunction,
        (item, value)=> {
            //console.log(item, value)
        },
        //finalCallBack
        (param) => {         
            console.log('final', param)                                                         
        } 
    );
    pad.run();    
}



// exports.importFund = async (symbol, dateFrom, dateTo) => {
//     let dictionary = await (await storage.getDictionary())
//     dictionary.filter(f => f.symbol === symbol).forEach(fund => {
//         console.log(fund.symbol, fund.moneyplsymbol, dateFrom, dateTo)
//         getCSV(fund.symbol, fund.moneyplsymbol, dateFrom, dateTo)
//     })    
// }