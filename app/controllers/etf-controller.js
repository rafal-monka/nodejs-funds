
//const http2 = require("http2")
//const zlib = require("zlib")
//const etfdb = require('etfdb-api') //https://www.npmjs.com/package/etfdb-api


const mySQLDatabase = require("./../../config/mysql-database")
const TFIValues = require('./../models/tfi-values-model')
const TimeSeries = mySQLDatabase.timeseries

const ETFEODLoader = require("../etf-eodhistoricaldata-values-loader.js")

exports.test = (req, res, next) => {
    let sample_etf = {symbol: 'SWDA.LSE'}

    res.json([{a: 100}, {a:101}])
    return
    ETFEODLoader.callFunction(sample_etf).then(result => {
        ETFEODLoader.callbackFunction(sample_etf, result)
        console.log('test', result.data.length, result.data[0])
        res.json(result.data)
    })    
}


//----------------------------------------------------------------OLD
const BASE_URL = "https://www.justetf.com"

exports.testOLD = (req, res, next) => {
    etfdb.listEtfs((perPage = 50), (page = 1), (sort = 'ytd'), (order = 'desc'))
    .then(result => {
        console.log('Total ETFs:', result.meta.total_records);
        result.data.forEach(etf => console.log(etf.symbol.text, etf.ytd));
        res.json(result)
    });
}


function justETF2(symbol) {
    let response = []
    let postbody = ''
    // let path = '/en/etf-profile.html?3-1.0-chartPanel-chart-content-dates-ptl_max&query=IE00B8FHGS14&groupField=index&from=search&isin=IE00B8FHGS14&_=1618846321664'
    return new Promise((resolve) => {
        const client = http2.connect(BASE_URL);
        const request = client.request({
            ":authority": "www.justetf.com",
            ":method": "POST",
            ":path": "/en/etf-profile.html?3-1.0-chartPanel-chart-content-dates-ptl_max&query=IE00B8FHGS14&groupField=index&from=search&isin=IE00B8FHGS14&_=1618846321672",
            ":scheme": "https",
            "content-length": Buffer.byteLength(postbody),
            "accept": "application/xml, text/xml, */*; q=0.01",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en,pl-PL;q=0.9,pl;q=0.8,en-US;q=0.7",
            // "cookie": "locale_=en; CookieConsent={stamp:%270M55PfOuI7lprkBcKiA1c6F5eSI1URGgNEmjmPmgNi3aCKmxDJ+gyQ==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cver:4%2Cutc:1618056899616%2Cregion:%27pl%27}; _ga=GA1.2.1347504654.1618056900; p=281163; pRef=HS1ETFSearch-DE; JSESSIONID=C66BAD3A41E1392383E4CAA37A568E09; _gid=GA1.2.1328627191.1618846275; AWSALB=HTL6mL5MRY5Beq7KwwOvJZpsxkrvN8cs1W2czuUSz9To9+pKcnKt9PRHgHKz2e6Jzg0Kvy079aM+x32nr2TK8Btex1No/B0KT9xjFPb+UzRY/QLnRlNAkjrKONoI; AWSALBCORS=HTL6mL5MRY5Beq7KwwOvJZpsxkrvN8cs1W2czuUSz9To9+pKcnKt9PRHgHKz2e6Jzg0Kvy079aM+x32nr2TK8Btex1No/B0KT9xjFPb+UzRY/QLnRlNAkjrKONoI",
            // "referer": "https://www.justetf.com/en/etf-profile.html?query=IE00B8FHGS14&groupField=index&from=search&isin=IE00B8FHGS14",
            "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36",
            "wicket-ajax": "true",
            "wicket-ajax-baseurl": "en/etf-profile.html?query=IE00B8FHGS14&amp;groupField=index&amp;from=search&amp;isin=IE00B8FHGS14",
            "wicket-focusedelementid": "id16e",
            "x-requested-with": "XMLHttpRequest"
        })

        request.on("response", (headers, flags) => {
            console.log(new Date(), "justETF #response", headers)
            for (const name in headers) {
                console.log(name)
            }
        });

        request.on("data", chunk => {
            // zlib.gunzip(response, function(err, dezipped) {
            //     console.log('dezipped (chunk)', dezipped)
            //     console.log('(chunk)', err)
            // })
            console.log(chunk)
            response.push(chunk)
        });

        request.on("end", () => {
            client.close()
            let buffer = Buffer.concat(response)
            zlib.gunzip(buffer, function(err, dezipped) {
                console.log('dezipped', dezipped, dezipped.toString())
                resolve(dezipped.toString())
                console.log(err)
            })            
        });

        request.end()
    })
}

function justETF_OLD(symbol) {
    let params = { }
    try {
        return axios.get(BASE_URL, {
            params: params
        })
    } catch (error) {
        console.error(error);
    }
}
