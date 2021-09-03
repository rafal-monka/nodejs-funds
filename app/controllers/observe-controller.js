var axios = require('axios')
//const puppeteer = require('puppeteer')
const fs = require('fs')
var DomParser = require('dom-parser')
const email = require("../libs/email")
const Launcher = require("../libs/launcher.js")

exports.observeKrugerrand = (req, res, next) => {
    console.log('observeKrugerrand')

    getKrugerrandInformation().then(result => {
        let price = processKrugerrandInformation(result.data)
        let message = (price < 7100 ? 'BUY': 'WAIT')
        email.sendEmail(
            ' Funds (Observe Krugerrand) '+message+': '+price+' zł, date:'+new Date().toISOString(), 
            '<div><pre>'+price+'zł </pre></div>'
        ) 
        res.json(price)
    })
    
}

exports.observeAll = (req, res, next) => {
    console.log('observeAll')

    let pad = new Launcher(
        5,
        [
            {
                name: 'Krugerrand', 
                f: ()=>getKrugerrandInformation(), 
                cf: (v)=>processKrugerrandInformation(v)
            },
            {
                name: 'iShares Core MSCI EM P/E Ratio', 
                f: ()=>getiSharesCoreMSCIEM_PE_Information(), 
                cf: (v)=>processiSharesCoreMSCIEM_PE_Information(v)
            }
        ],
        //callFunction,
        async (item) => {
            console.log('observeAll callFunction', item)     
            return new Promise(function(resolve, reject) {
                try {    
                    item.f()
                        .then(result => {
                            resolve( result )
                        })
                        .catch(e => {
                            reject(e.toString())
                        }) 
                } catch (e) {
                    console.log(item, 'PROMISE EXCEPTION', e)
                    reject('Promise is rejested'+e.toString())
                }
            })      
            
        },
        //callbackFunction,
        (item, value)=> {
            console.log('observeAll Launcher callbackFunction', item)
            //console.log(item, value)
            return item.cf(value)
        },
        //catchFunction
        (error, item)=> {
            console.log('observeAll catchFunction', error, item)
        },
        //finalCallBack
        (param) => {         
            console.log('observeAll final')    
            email.sendEmail(
                ' Funds (ObserveAll)', 
                '<div><pre>'+JSON.stringify(param,' ',1)+'</pre></div>'
            )                                                                  
        } 
    );
    pad.run();
    res.status(200).json('observeAll started')
}

getKrugerrandInformation = () => {    
    const url = 'https://mennicakapitalowa.pl/product-pol-7-moneta-zlota-Krugerrand-1oz-2021.html'

    console.log('getUrl', url);
    try {
        return axios({
            url: url,
            method: 'get',
            params: { }
        })
    } catch (error) {
        console.error(error);
    }
}

processKrugerrandInformation = (html) => {
    var parser = new DomParser();
    var dom = parser.parseFromString(html.data);
    
    let result = null 
	try {
        let projector_price_value = dom.getElementById('projector_price_value')
        result = projector_price_value.innerHTML.replace(' ','').replace(' zł','').replace(',','.')
        console.log(result)
        return result
    } catch (e) {
        console.error(e);        
		return result;
	}
}


getiSharesCoreMSCIEM_PE_Information = () => {    
    const url = 'https://www.ishares.com/uk/individual/en/products/264659/'
/*
    return new Promise(async function(resolve, reject) {
        try {
            const browser = await puppeteer.launch({
                headless: true, 
                executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
                //ignoreDefaultArgs: ['--disable-extensions']
            });
            const page = await browser.newPage();
            await page.goto(url);
            const html = await page.content(); // serialized HTML of page DOM.
            await browser.close();
            resolve(html);
        } catch (e) {
            reject('SOMETHING WRONG '+e)
        }
    })
*/
    
    console.log('getUrl', url);
    try {
        return axios({
            url: url,
            method: 'get',
            params: { }
        })
    } catch (error) {
        console.error(error);
    }
    
}

processiSharesCoreMSCIEM_PE_Information = (html) => {
    var parser = new DomParser();
    var dom = parser.parseFromString(html.data);
    
    //fs.writeFileSync('download/isharesEMIM.html', html);

    let result = null 
	try {
        let priceEarnings = dom.getElementsByClassName('col-priceEarnings')
        result = priceEarnings
        console.log(result)
        return result
    } catch (e) {
        console.error(e);        
		return result;
	}
}


/*
_observeKrugerrand = () => {
    console.log('_observeKrugerrand catchFunction')
    return new Promise(function(resolve, reject) {
        try {    
            getKrugerrandInformation()
                .then(result => {
                    console.log('_observeKrugerrand result')
                    resolve( result )
                })
                .catch(e => {
                    reject(e.toString())
                }) 
        } catch (e) {
            console.log(item, 'PROMISE EXCEPTION', e)
            reject('Promise is rejested'+e.toString())
        }
    })
}
*/
