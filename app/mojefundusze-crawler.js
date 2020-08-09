var axios = require('axios');
var DomParser = require('dom-parser');
var Launcher = require("./launcher.js");
const storage = require('./fund-storage')
const email = require("./email")

const BASE_URL = "https://mojefundusze.pl/Fundusze/Inwestycyjne/";

//https://investors.pl/fundusze-inwestycyjne/
//https://santandertfi.pl/fundusze/santander-fio/santander-obligacji-skarbowych.html
//https://santandertfi.pl/fundusze/santander-prestiz-sfio/santander-prestiz-obligacji-skarbowych.html
//https://www.nntfi.pl/fundusze-inwestycyjne/fundusze-obligacji/nn-obligacji?unitsCategoryId=A&dateFrom=02.07.2020&dateTo=31.07.2020


exports.loadInvestment = () => {
    let recs = [        
        { symbol: 'NN-OBL', dateStart: '2020-08-05', capital: 60000.0 },        
        { symbol: 'NN-OBL', dateStart: '2020-07-02', capital: 100000.0 },
        { symbol: 'SAN-OBL', dateStart: '2020-06-25', capital: 1000.0 },
        { symbol: 'SAN-OBL', dateStart: '2020-06-30', capital: 100000.0 },
        { symbol: 'SAN-OBLP', dateStart: '2020-06-30', capital: 100000.0 },
        { symbol: 'SAN-AKP', dateStart: '2020-06-25', capital: 1000.0 },
        { symbol: 'PEK-OBL', dateStart: '2020-08-05', capital: 200000.0 },  
        { symbol: 'SKA-OBL', dateStart: '2020-08-05', capital: 20000.0 },
        { symbol: 'SKA-SWZ', dateStart: '2020-08-05', capital: 20000.0 }
    ]
    recs.forEach(item => storage.storeInvestment(item) )
}

exports.delete = (symbol) => {
    storage.delete(symbol)
}

exports.loadFundValues = () => {
    let samples = [

        { symbol: 'NN-OBL', date: '2020-07-01', value: 345.33 },
        { symbol: 'NN-OBL', date: '2020-07-02', value: 345.96 },
        { symbol: 'NN-OBL', date: '2020-07-03', value: 346.32 },
        { symbol: 'NN-OBL', date: '2020-07-06', value: 346.10 },
        { symbol: 'NN-OBL', date: '2020-07-07', value: 345.74 },
        { symbol: 'NN-OBL', date: '2020-07-08', value: 345.95 },
        { symbol: 'NN-OBL', date: '2020-07-09', value: 345.65 },
        { symbol: 'NN-OBL', date: '2020-07-10', value: 345.75 },
        { symbol: 'NN-OBL', date: '2020-07-13', value: 345.14 },
        { symbol: 'NN-OBL', date: '2020-07-14', value: 345.11 },
        { symbol: 'NN-OBL', date: '2020-07-15', value: 345.06 },
        { symbol: 'NN-OBL', date: '2020-07-16', value: 345.42 },
        { symbol: 'NN-OBL', date: '2020-07-17', value: 345.52 },
        { symbol: 'NN-OBL', date: '2020-07-20', value: 345.37 },
        { symbol: 'NN-OBL', date: '2020-07-21', value: 345.69 },
        { symbol: 'NN-OBL', date: '2020-07-22', value: 345.94 },
        { symbol: 'NN-OBL', date: '2020-07-23', value: 345.75 },
        { symbol: 'NN-OBL', date: '2020-07-24', value: 345.56 },
        { symbol: 'NN-OBL', date: '2020-07-27', value: 345.77 },
        { symbol: 'NN-OBL', date: '2020-07-28', value: 346.03 },
        { symbol: 'NN-OBL', date: '2020-07-29', value: 346.19 },
        { symbol: 'NN-OBL', date: '2020-07-30', value: 346.58 },
        { symbol: 'NN-OBL', date: '2020-07-31', value: 346.88 },
        { symbol: 'NN-OBL', date: '2020-08-03', value: 346.65 },
        { symbol: 'NN-OBL', date: '2020-08-04', value: 347.01 },
        { symbol: 'NN-OBL', date: '2020-08-05', value: 346.72 },
        { symbol: 'NN-OBL', date: '2020-08-06', value: 346.93 },

        { symbol: 'SAN-OBL', date: '2020-08-06', value: 23.75 },
        { symbol: 'SAN-OBL', date: '2020-08-05', value: 23.74 },
        { symbol: 'SAN-OBL', date: '2020-08-04', value: 23.78 },
        { symbol: 'SAN-OBL', date: '2020-08-03', value: 23.74 },
        { symbol: 'SAN-OBL', date: '2020-07-31', value: 23.76 },
        { symbol: 'SAN-OBL', date: '2020-07-30', value: 23.75 },
        { symbol: 'SAN-OBL', date: '2020-07-29', value: 23.69 },
        { symbol: 'SAN-OBL', date: '2020-07-28', value: 23.67 },
        { symbol: 'SAN-OBL', date: '2020-07-27', value: 23.64 },
        { symbol: 'SAN-OBL', date: '2020-07-24', value: 23.62 },
        { symbol: 'SAN-OBL', date: '2020-07-23', value: 23.63 },
        { symbol: 'SAN-OBL', date: '2020-07-22', value: 23.67 },
        { symbol: 'SAN-OBL', date: '2020-07-21', value: 23.66 },
        { symbol: 'SAN-OBL', date: '2020-07-20', value: 23.63 },
        { symbol: 'SAN-OBL', date: '2020-07-17', value: 23.65 },
        { symbol: 'SAN-OBL', date: '2020-07-16', value: 23.64 },
        { symbol: 'SAN-OBL', date: '2020-07-15', value: 23.60 },
        { symbol: 'SAN-OBL', date: '2020-07-14', value: 23.59 },
        { symbol: 'SAN-OBL', date: '2020-07-13', value: 23.56 },
        { symbol: 'SAN-OBL', date: '2020-07-10', value: 23.65 },
        { symbol: 'SAN-OBL', date: '2020-07-09', value: 23.62 },
        { symbol: 'SAN-OBL', date: '2020-07-08', value: 23.64 },
        { symbol: 'SAN-OBL', date: '2020-07-07', value: 23.60 },
        { symbol: 'SAN-OBL', date: '2020-07-06', value: 23.60 },
        { symbol: 'SAN-OBL', date: '2020-07-03', value: 23.63 },
        { symbol: 'SAN-OBL', date: '2020-07-02', value: 23.60 },
        { symbol: 'SAN-OBL', date: '2020-07-01', value: 23.53 },
        { symbol: 'SAN-OBL', date: '2020-06-30', value: 23.57 },

        { symbol: 'SAN-OBL', date: '2020-06-29', value: 23.50 },
        { symbol: 'SAN-OBL', date: '2020-06-26', value: 23.54 },
        { symbol: 'SAN-OBL', date: '2020-06-25', value: 23.56 },

        { symbol: 'SAN-OBLP', date: '2020-08-06', value: 1513.08 },
        { symbol: 'SAN-OBLP', date: '2020-08-05', value: 1512.38 },
        { symbol: 'SAN-OBLP', date: '2020-08-04', value: 1514.64 },
        { symbol: 'SAN-OBLP', date: '2020-08-03', value: 1511.95 },
        { symbol: 'SAN-OBLP', date: '2020-07-31', value: 1513.21 },
        { symbol: 'SAN-OBLP', date: '2020-07-30', value: 1513.03 },
        { symbol: 'SAN-OBLP', date: '2020-07-29', value: 1508.79 },
        { symbol: 'SAN-OBLP', date: '2020-07-28', value: 1507.86 },
        { symbol: 'SAN-OBLP', date: '2020-07-27', value: 1505.58 },
        { symbol: 'SAN-OBLP', date: '2020-07-24', value: 1504.43 },
        { symbol: 'SAN-OBLP', date: '2020-07-23', value: 1505.21 },
        { symbol: 'SAN-OBLP', date: '2020-07-22', value: 1507.42 },
        { symbol: 'SAN-OBLP', date: '2020-07-21', value: 1506.66 },
        { symbol: 'SAN-OBLP', date: '2020-07-20', value: 1504.86 },
        { symbol: 'SAN-OBLP', date: '2020-07-17', value: 1506.52 },
        { symbol: 'SAN-OBLP', date: '2020-07-16', value: 1505.42 },
        { symbol: 'SAN-OBLP', date: '2020-07-15', value: 1503.26 },
        { symbol: 'SAN-OBLP', date: '2020-07-14', value: 1502.04 },
        { symbol: 'SAN-OBLP', date: '2020-07-13', value: 1500.65 },
        { symbol: 'SAN-OBLP', date: '2020-07-10', value: 1505.89 },
        { symbol: 'SAN-OBLP', date: '2020-07-09', value: 1504.42 },
        { symbol: 'SAN-OBLP', date: '2020-07-08', value: 1505.43 },
        { symbol: 'SAN-OBLP', date: '2020-07-07', value: 1502.62 },
        { symbol: 'SAN-OBLP', date: '2020-07-06', value: 1502.92 },
        { symbol: 'SAN-OBLP', date: '2020-07-03', value: 1504.79 },
        { symbol: 'SAN-OBLP', date: '2020-07-02', value: 1503.02 },
        { symbol: 'SAN-OBLP', date: '2020-07-01', value: 1498.16 },
        { symbol: 'SAN-OBLP', date: '2020-06-30', value: 1500.86 },
                

        { symbol: 'SAN-AKP', date: '2020-08-06', value:  29.01}, 
        { symbol: 'SAN-AKP', date: '2020-08-05', value:  29.26}, 
        { symbol: 'SAN-AKP', date: '2020-08-04', value:  28.97}, 
        { symbol: 'SAN-AKP', date: '2020-08-03', value:  28.81}, 
        { symbol: 'SAN-AKP', date: '2020-07-31', value:  28.29}, 
        { symbol: 'SAN-AKP', date: '2020-07-30', value:  28.19}, 
        { symbol: 'SAN-AKP', date: '2020-07-29', value:  29.11}, 
        { symbol: 'SAN-AKP', date: '2020-07-28', value:  29.13}, 
        { symbol: 'SAN-AKP', date: '2020-07-27', value:  29.19}, 
        { symbol: 'SAN-AKP', date: '2020-07-24', value:  29.02}, 
        { symbol: 'SAN-AKP', date: '2020-07-23', value:  29.20}, 
        { symbol: 'SAN-AKP', date: '2020-07-22', value:  29.29}, 
        { symbol: 'SAN-AKP', date: '2020-07-21', value:  29.53}, 
        { symbol: 'SAN-AKP', date: '2020-07-20', value:  29.42}, 
        { symbol: 'SAN-AKP', date: '2020-07-17', value:  28.85}, 
        { symbol: 'SAN-AKP', date: '2020-07-16', value:  28.89}, 
        { symbol: 'SAN-AKP', date: '2020-07-15', value:  28.87}, 
        { symbol: 'SAN-AKP', date: '2020-07-14', value:  28.58}, 
        { symbol: 'SAN-AKP', date: '2020-07-13', value:  28.89}, 
        { symbol: 'SAN-AKP', date: '2020-07-10', value:  28.86}, 
        { symbol: 'SAN-AKP', date: '2020-07-09', value:  28.79}, 
        { symbol: 'SAN-AKP', date: '2020-07-08', value:  28.74}, 
        { symbol: 'SAN-AKP', date: '2020-07-07', value:  28.86}, 
        { symbol: 'SAN-AKP', date: '2020-07-06', value:  29.14}, 
        { symbol: 'SAN-AKP', date: '2020-07-03', value:  28.87}, 
        { symbol: 'SAN-AKP', date: '2020-07-02', value:  28.93}, 
        { symbol: 'SAN-AKP', date: '2020-07-01', value:  28.42}, 
        { symbol: 'SAN-AKP', date: '2020-06-30', value:  28.21}, 
        { symbol: 'SAN-AKP', date: '2020-06-29', value:  28.34}, 
        { symbol: 'SAN-AKP', date: '2020-06-26', value:  28.20}, 
        { symbol: 'SAN-AKP', date: '2020-06-25', value:  28.67},
        
        {symbol: 'SKA-SWZ', date: '2020-08-06', value: 221.05},
        {symbol: 'SKA-SWZ', date: '2020-08-05', value: 224.22},
        {symbol: 'SKA-SWZ', date: '2020-08-04', value: 225.05},
        {symbol: 'SKA-SWZ', date: '2020-08-03', value: 223.68},
        {symbol: 'SKA-SWZ', date: '2020-07-31', value: 216.98},
        {symbol: 'SKA-SWZ', date: '2020-07-30', value: 214.97},
        {symbol: 'SKA-SWZ', date: '2020-07-29', value: 213.81},
        {symbol: 'SKA-SWZ', date: '2020-07-28', value: 205.67},
        {symbol: 'SKA-SWZ', date: '2020-07-27', value: 206.91},
        {symbol: 'SKA-SWZ', date: '2020-07-24', value: 202.79},
        {symbol: 'SKA-SWZ', date: '2020-07-23', value: 203.28},
        {symbol: 'SKA-SWZ', date: '2020-07-22', value: 209.1},
        {symbol: 'SKA-SWZ', date: '2020-07-21', value: 208.8},
        {symbol: 'SKA-SWZ', date: '2020-07-20', value: 213.36},
        {symbol: 'SKA-SWZ', date: '2020-07-17', value: 201.66},
        {symbol: 'SKA-SWZ', date: '2020-07-16', value: 199.16},
        {symbol: 'SKA-SWZ', date: '2020-07-15', value: 202.38},
        {symbol: 'SKA-SWZ', date: '2020-07-14', value: 202.93},
        {symbol: 'SKA-SWZ', date: '2020-07-13', value: 198.65},
        {symbol: 'SKA-SWZ', date: '2020-07-10', value: 213.31},
        {symbol: 'SKA-SWZ', date: '2020-07-09', value: 215.76},
        {symbol: 'SKA-SWZ', date: '2020-07-08', value: 212.26},
        {symbol: 'SKA-SWZ', date: '2020-07-07', value: 204.34},
        {symbol: 'SKA-SWZ', date: '2020-07-06', value: 203.36},
        {symbol: 'SKA-SWZ', date: '2020-07-03', value: 202.52},
        {symbol: 'SKA-SWZ', date: '2020-07-02', value: 202.61},
        {symbol: 'SKA-SWZ', date: '2020-07-01', value: 202.13},
        {symbol: 'SKA-SWZ', date: '2020-06-30', value: 195.47},
        {symbol: 'SKA-SWZ', date: '2020-06-29', value: 191.2},
        {symbol: 'SKA-SWZ', date: '2020-06-26', value: 194.13},
        {symbol: 'SKA-SWZ', date: '2020-06-25', value: 195.57},        

    ]
    samples.forEach(item => storage.store(item.symbol, new Date(item.date), item.value) )
}

exports.perform = async () => {
    let dictionary = await storage.getDictionary()
    console.log(dictionary)
    // return 
    let pad = new Launcher(
        7, 
        dictionary, 
        //callFunction,
        getFund,
        //callbackFunction,
        parseFund,
        //finalCallBack
        (param) => {         
            let arr = []
            //store
            param.forEach(el => {                               
                //temp
                arr.push({
                    symbol: el.item.symbol, 
                    date: new Date(el.output.date), 
                    value: el.output.value
                })

                storage.store(el.item.symbol, new Date(el.output.date), el.output.value)                
            })

            //call calculation
            //calculate(arr) 
            email.sendEmail('Funds '+new Date(), '<a href="https://funds-apps.apps.ca-central-1.starter.openshift-online.com">Look</a>')
                       
            
        } 
    );
    pad.run();
}


getFund = (item) => {    
    console.log('getFund', item.code);
    try {
        return axios({
            url: BASE_URL+item.code,
            methog: 'get',
            params: { }
        })
    } catch (error) {
        console.log('###Error: getFund');
        console.error(error);
    }
}


parseFund = (item, html) => {  
    var parser = new DomParser();
    var dom = parser.parseFromString(html.data);
    
    let result = {}; 
	try {
        result = {
            title: dom.getElementsByTagName('title')[0].innerHTML,
            value: 1*dom.getElementsByTagName('h1')[1].innerHTML.replace('PLN','').replace(' ','').replace(',','.'),
            date: dom.getElementsByTagName('h3')[0].getElementsByTagName('strong')[0].innerHTML
        }
        return result;        
	} catch (e) {
        console.error('###Error. parseFund');
        console.error(item);        
        console.log(e);
		//console.log(html);
		return result;
	}
}


//-------------------------------------------------------
calculateOLD = async (arr) => {
    let investments = [ 
        {
            symbol: 'NN-OBL',
            startDate: '2020-07-02',  
            startValue: 345.96, 
            capital: 100000.0
        },
        {
            symbol: 'NN-OBL',
            startDate: '2020-08-08',  
            startValue: 0.0, 
            capital: 60000.0
        },
        {
            symbol: 'SKB-OBL',
            startDate: new Date('2020-08-09'),                 
            startValue: 0.0, 
            capital: 20000.0
        },
        {
            symbol: 'SKB-SWZ',
            startDate: new Date('2020-08-09'),
            startValue: 0.0, 
            capital: 20000.0
        },
        {
            symbol: 'SAN-OBL',
            startDate: new Date('2020-06-30'), 
            startValue: 23.57, 
            capital: 100000.0
        },
        {
            symbol: 'SAN-OBLP',
            startDate: new Date('2020-06-30'),  
            startValue: 1500.86, 
            capital: 100000.0
        },
        {
            symbol: 'SAN-AKP',                
            startDate: new Date('2020-06-25'), 
            startValue: 0.0, 
            capital: 1000.0
        },
        {
            symbol: 'PEK-OBL',                
            startDate: new Date('2020-08-10'), 
            startValue: 0.0,
            capital: 200000.0
        }
    ]

    let fundsValues = await storage.getFundsValues()

    email.sendEmail('[Funds]', '<div>'+JSON.stringify(arr,' ',3)+'</div>' +  '<div>'+JSON.stringify(fundsValues,' ',3)+'</div>')
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