var axios = require('axios')
const qs = require('querystring')
const csv = require('csv-parse') //https://csv.js.org/parse/
const storage = require('./fund-storage')

const BASE_URL = "https://www.money.pl/fundusze/archiwum/fundusze/"

//  santander OBL = TFI112
//  santander OBLP = TFI4562
//  santander AKP = TFI1 
//  skarbiec OBL = TFI66
//  skarbiec SWZ = TFI4635
//  peako OBL = TFI8172
//  nn OBL = TFI6771
//  quercus = TFI5438

getCSV = (symbol, moneyplsymbol, dateFrom, DateTo) => {
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
    axios.post( BASE_URL, qs.stringify(requestBody), config).then(res => {
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
                    storage.store(symbol, new Date(rec[0]), 1*rec[1].replace(',','.'))
                } catch (e) {
                    console.log('Error', symbol, rec, e)
                }
                 
            })
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