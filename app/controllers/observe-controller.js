var axios = require('axios')
var DomParser = require('dom-parser')
const email = require("../libs/email")

exports.observeKrugerrand = (req, res, next) => {
    console.log('observeKrugerrand')
    const url = 'https://mennicakapitalowa.pl/product-pol-7-moneta-zlota-Krugerrand-1oz-2021.html'
    let request = {
        url: url
    }
    getInformation(request).then(result => {
        let price = processInformation(result.data)
        let message = (price < 7100 ? 'BUY': 'WAIT')
        email.sendEmail(
            ' Funds (Observe Krugerrand) '+message+': '+price+' zł, date:'+new Date().toISOString(), 
            '<div><pre>'+price+'zł </pre></div>'
        ) 
        res.json(price)
    })
    
}

getInformation = (item) => {    
    console.log('getUrl', item.url);
    try {
        return axios({
            url: item.url,
            method: 'get',
            params: { }
        })
    } catch (error) {
        console.error(error);
    }
}

processInformation = (html) => {
    var parser = new DomParser();
    var dom = parser.parseFromString(html);
    
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