const url = require('url')
const WebSocket = require('ws');

const TFIMetaDataCtrl = require('./app/controllers/tfi-controller.js')
const AnalyseTrendsCtrl = require('./app/controllers/analyse-trends-controller')
const CalculateStatsCtrl = require('./app/controllers/calculate-stats-controller')
const RobotCtrl = require('./app/controllers/robot-controller')

var wss //web socket server

//Return array of all wss clients
getWssClients = () => {
    return [...wss.clients]
}

//Notify specified wss client 
notifyClient = (wssClientID, msg) => {
    getWssClients()
    //.filter(client => client.clientInfo.wssClientID === wssClientID && client.clientInfo.gameid === gameid )
    .forEach(client => {
        client.send( JSON.stringify(msg) ); 
    })
}

exports.init = (server) => {
    console.log('Starting WSS server')
    wss = new WebSocket.Server(/*{ noServer: true }*/{server : server});
    wss.on('connection', function connection(ws, request) {
        //let authToken = url.parse(request.url,true).query.token 
        let wssClientID = request.headers['sec-websocket-key'] 
        ws.wssClientID = wssClientID
        let response = { 
            event: 'CONNECTION',
            payload: 'CONNECTED'
        } 
        notifyClient(wssClientID, response)

        ws.on('close', function message(code, msg) {
            let response = { 
                event: 'CONNECTION',
                payload: 'DISCONNECTED'
            }    
            notifyClient(wssClientID, response)       
        })
            
        ws.on('message', function message(obj) {
            let msg = JSON.parse(obj)
            let response
            let symbols = msg.value
            switch (msg.action) {

                case 'LOADVALUE-INIT':
                    TFIMetaDataCtrl._launchLoadValues(wssClientID, new Date(), symbols) 
                    break

                case 'CALCLR-INIT':
                    AnalyseTrendsCtrl.calcLRFunds(wssClientID, symbols)                     
                    break

                case 'CALCSTAT-INIT':
                    CalculateStatsCtrl._launchCalcStats(wssClientID, symbols)                     
                    break

                case 'ROBOT-S-PICK-INIT':
                    RobotCtrl._launchPickOccasion(wssClientID, symbols, 'S', null) //SIMULATION                 
                    break
                    
                case 'ROBOT-R-PICK-INIT':
                    RobotCtrl._launchPickOccasion(wssClientID, symbols, 'R', null) //REAL                   
                    break                    

                case 'TAG-INIT':
                    TFIMetaDataCtrl._launchTag(wssClientID, symbols.symbols, symbols.tag)                   
                    break 
                    
                case 'TEST':
                    let msg = JSON.parse(obj)
                    response = { 
                        event: 'TEST',
                        payload: 'RE: '+msg.value.toUpperCase()
                    } 
                    notifyClient(wssClientID, response)    
                    break

                default:
                    break
            }                
        });
    });   
}

exports.notifyClient = notifyClient

//----------------------------------------------------temp
//exports.getWssClients = getWssClients

