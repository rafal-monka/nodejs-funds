require('dotenv').config()
const axios = require('axios')

const TFIMetaDataCtrl = require('./controllers/tfi-controller')
const TFIvalues = require('./models/tfi-values-model')
const ETFvalues = require('./models/etf-values-model')

const BASE_URL = 'https://eodhistoricaldata.com/api/eod'

//https://eodhistoricaldata.com/financial-apis/list-supported-indices/
//https://eodhistoricaldata.com/financial-apis/list-supported-exchanges/
//https://eodhistoricaldata.com/exchange/INDX?page=3

//https://eodhistoricaldata.com/cp/settings
//https://eodhistoricaldata.com/api/eod/IQQ0.XETRA?api_token=607dd1d7ddd5b0.03235574&from=2021-04-01&to=2021-04-19&fmt=json

//https://eodhistoricaldata.com/api/search/IE00B8FHGS14?api_token=607dd1d7ddd5b0.03235574 //ISHARES EDGE MSCI WORLD MINIMUM VOLATILITY UCITS = IQQ0.XETRA | MINV.LSE
//https://eodhistoricaldata.com/api/search/IE00B8KGV557?api_token=607dd1d7ddd5b0.03235574 //ISHARES EDGE MSCI EM MINIMUM VOLATILITY UCITS = EUNZ.XETRA | EMV.LSE ???iShares STOXX Europe 50 UCITS ETF EUR (Dist)!!!
//https://eodhistoricaldata.com/api/search/IE00B4L5Y983?api_token=607dd1d7ddd5b0.03235574 //ISHARES CORE MSCI WORLD UCITS = EUNL.XETRA | SWDA.LSE
//https://eodhistoricaldata.com/api/search/IE00BKM4GZ66?api_token=607dd1d7ddd5b0.03235574 //ISHARES CORE MSCI EM IMI UCITS = IS3N.XETRA | EMIM.LSE


exports.callFunction = async (etf) => {
    //console.log(etf.symbol, 'etf-eodhistoricaldata-values-loader.callFunction', etf)
    
    try {
        let res = await TFIMetaDataCtrl.read(etf.symbol)
    
        if (res === null) {
            TFIMetaDataCtrl.create(etf.source, etf.symbol, etf.name, null, null, null, null)
        } else {
            //console.log(new Date(), 'etf-eodhistoricaldata-values-loader.callFunction[2]', etf.symbol)
            await TFIMetaDataCtrl.update(etf.symbol, {
                status: 'RUNNING',
                errorMsg: ''
            })
        }

        let params = { 
            api_token: process.env.EOD_API_TOKEN,
            to: new Date().toISOString().substring(0,10),
            fmt: 'json'
        }   
        return axios.get(BASE_URL+'/'+etf.symbol, {
            params: params
        })
    } catch (error) {
        console.error(error);
    }

}

exports.callbackFunction = (etf, values)=> {
    //console.log('callbackFunction.values', etf.symbol, values.data)
    //console.log(etf.symbol, 'etf-eodhistoricaldata-values-loader.callbackFunction', etf, values.data.length, values.data[0])

    TFIMetaDataCtrl.read(etf.symbol).then( res => {
        //res = { lastDate: null}

        //console.log('res', res)
        let arr = values.data
            .filter(row=>( res.lastDate === null || new Date(row.date) > new Date(res.lastDate)) )    
            .map(row => ({ 
                symbol: etf.symbol, 
                date: new Date(row.date),
                close: row.close, //adjusted_close?
                open: row.open,
                high: row.high,
                low: row.low,
                adjusted_close: row.adjusted_close,
                volume: row.volume//,
//ok: row.adjusted_close === row.close
            }))
        
        //console.log('etf-eodhistoricaldata-values-loader.callbackFunction arr.length', arr.length)
        if (arr.length>0) {
//console.log(arr.filter(v => v.ok === false))
            //ETF full values
            ETFvalues.insertMany(arr, function (err, docs) { })
            //standard model (TFI values)
            let arr2 = arr.map(a => ({
                symbol: a.symbol,
                date: a.date,
                value: a.close
            }))
            TFIvalues.insertMany(arr2, function (err, docs) {
                if (err){ 
                    console.error(err);
                    TFIMetaDataCtrl.update(etf.symbol, {
                        status: 'ERROR',
                        errorMsg: err.toString().substring(0,100)
                    })
                } else {
                    //console.log("Analizy-values-loader. Multiple documents inserted to Collection", docs.length);
                    TFIMetaDataCtrl.update(etf.symbol, {
                        initDate: (res.initDate === null) ? arr2[0].date : res.initDate,
                        lastDate: arr2[arr2.length-1].date,
                        status: 'OK',
                        errorMsg: 'count: '+arr2.length
                    })
                }
            })
        } else {
            TFIMetaDataCtrl.update(etf.symbol, {
                status: 'OK',
                errorMsg: 'No new data'
            })
        }

    })    
}