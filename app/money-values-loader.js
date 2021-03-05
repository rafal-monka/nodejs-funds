const axios = require('axios')
const qs = require('querystring')
const csv = require('csv-parse') //https://csv.js.org/parse/
const { resolve } = require('path')
const moment = require('moment')

const utils = require("./utils.js")
// const Launcher = require("./launcher.js")
// const TFI = require('./money2/TFI')
const TFIMetaDataCtrl = require('./controllers/tfi-controller')
const TFIvalues = require('./models/tfi-values-model')
const { rejects } = require('assert')

const BASE_URL = "https://www.money.pl/fundusze/archiwum/fundusze/"

const CONST_ARCHEO_DATE = new Date("1920-01-01")// new Date("2020-01-01")

const MIN_DATE = new Date("2000-01-01")
const DIRECTION_RIGHT = 1
const DIRECTION_LEFT = -1

let currentDateGlobal
let queue = []

exports.delete = (symbol) => {
    console.log('delete', symbol)
    TFIvalues.deleteMany({symbol: symbol}, function(err, result) {} )  
}

setNewFrame = async (tfi, currentDate, frame) => {
//console.log(tfi.symbol, 'setNewFrame, current frame', frame)
         
    let firstDayOfMonth = utils.getFirstDayOfMonth(frame.dateTo, frame.direction)
    let lastDayOfMonth = utils.getLastDayOfMonth(frame.dateTo, frame.direction) 
    
    let minDate = (frame.direction === DIRECTION_LEFT) ? (MIN_DATE > firstDayOfMonth ? MIN_DATE : firstDayOfMonth) : firstDayOfMonth    
    let maxDate = (frame.direction === DIRECTION_RIGHT) ? (currentDate < lastDayOfMonth ? currentDate : lastDayOfMonth) : lastDayOfMonth    
    let ret

    if (minDate <= maxDate) {
        ret = {
            dateFrom: minDate,
            dateTo: maxDate,
            direction: frame.direction
        }
        await TFIMetaDataCtrl.update(tfi.symbol, {
            frameDateFrom: ret.dateFrom,
            frameDateTo: ret.dateTo,
            status: 'RUNNING'
        })
    } else {
        ret = {
            dateFrom: null,
            dateTo: null,
            direction: null
        }
    }
//console.log(tfi.symbol, 'setNewFrame, new frame', ret)
    return ret
}

finish = async (symbol, resolve, initDate = null, lastDate = null) => {
console.log(symbol, 'finish()', /*queue[symbol].count, queue[symbol].recs.length*/)
    let recArr = []
    let count = 0
    queue[symbol].forEach(item => {
        item.recs.forEach(rec => {
            count++
            recArr.push({
                symbol: symbol,
                date: new Date(rec[0]),
                value: 1*(rec[1].replace(',','.').replace(' ',''))
            })
        })
    })
    queue[symbol].length = 0
    delete queue[symbol]

    resolve({
        symbol: symbol,
        initDate: initDate,
        lastDate: lastDate,
        count: count,
        records: recArr
    })
}

processFrame = async (tfi, frame, cacheDates, records, resolve, reject) => {
    // console.log(tfi.symbol, 'processFrame', frame)
    // console.log(tfi.symbol, 'records.length', records.length, cacheDates.potentialInitDate)
    
    let newFrame
    switch (frame.direction) {
        case DIRECTION_LEFT:
            if (records.length === 0 || frame.dateFrom.getTime() === MIN_DATE.getTime()) {
                if (cacheDates.potentialInitDate !== null) {
                    finish(tfi.symbol, resolve, cacheDates.potentialInitDate, cacheDates.potentialLastDate)              
                } else {
                    //###???
                    finish(tfi.symbol, resolve, CONST_ARCHEO_DATE, CONST_ARCHEO_DATE) //###???
                }
            } else {
                let lastDate = new Date(records[0][0])
                if (lastDate > cacheDates.potentialLastDate || cacheDates.potentialLastDate === null) {
                    cacheDates.potentialLastDate = lastDate
                }
                newFrame = await setNewFrame(tfi, currentDateGlobal, frame)

                if (newFrame.dateFrom !== null && newFrame.dateTo !== null) {
                    this.getCSV(tfi.symbol, newFrame.dateFrom, newFrame.dateTo, 
                        (records) => {
                            if (records.length > 0) {
                                cacheDates.potentialInitDate = new Date(records[records.length-1][0])
                                let lastDate = new Date(records[0][0])
                                if (lastDate > cacheDates.potentialLastDate || cacheDates.potentialLastDate === null) {
                                    cacheDates.potentialLastDate = lastDate
                                }
                            }
                            //console.log('cacheDates.potentialInitDate', cacheDates.potentialInitDate)
                            processFrame(tfi, newFrame, cacheDates, records, resolve, reject),
                            reject
                        }
                    )
                }
            }
            break

        case DIRECTION_RIGHT:
            if (records.length > 0) {
                //console.log(tfi.symbol, 'records[records.length-1]', records[records.length-1])
                let firstDate = new Date(records[records.length-1][0])
                let lastDate = new Date(records[0][0])
                if (firstDate < cacheDates.potentialInitDate || cacheDates.potentialInitDate === null) cacheDates.potentialInitDate = firstDate
                if (lastDate > cacheDates.actualLastDate || cacheDates.actualLastDate === null) {
                    cacheDates.actualLastDate = lastDate
                    await TFIMetaDataCtrl.update(tfi.symbol, {
                        lastDate: lastDate
                    })
                }
                //@@@save & set new window frame
                newFrame = await setNewFrame(tfi, currentDateGlobal, frame)

                if (newFrame.dateFrom !== null && newFrame.dateTo !== null) {
                    this.getCSV(tfi.symbol, newFrame.dateFrom, newFrame.dateTo, 
                        (records) => processFrame(tfi, newFrame, cacheDates, records, resolve, reject),
                        reject
                    )
                } else { //???@@@ czy na pewno ten warunek ??? do OK
                    finish(tfi.symbol, resolve)                   
                }
            } else {
                finish(tfi.symbol, resolve)   
            }
            break
    }    
}

// exports.run = (wssClientID, currentDate, symbols) => {
//     this.currentDate = currentDate
//     let pad = new Launcher(
//         5, 
//         TFI.getList(symbols),//.slice(0,1), 
//         //callFunction,
//         callFunction,
//         //callbackFunction,
//         callbackFunction,
//         //catchFunction
//         (error, item)=> {
//             console.log('money-values-loader - Launcher catchFunction', error.toString().substring(0,100), item)
//             TFIMetaDataCtrl.update(item.symbol, {                        
//                 status: 'ERROR',
//                 errorMsg: error.toString().substring(0,100)
//             })
//         },
//         //finalCallBack
//         (param) => {         
//             console.log('final', param)                                                         
//         } 
//     );
//     pad.run();    
// }

exports.callFunction = async (tfi) => {
    console.log(tfi.symbol, 'money-values-loader.callFunction')
    let res = await TFIMetaDataCtrl.read(tfi.symbol)
    
    currentDateGlobal = (currentDateGlobal > new Date() || currentDateGlobal === undefined) ? new Date() : currentDateGlobal
    // console.log(tfi.symbol, 'currentDateGlobal', currentDateGlobal)    
    let frame = {
        dateFrom: null,
        dateTo: null,
        direction: null
    }
    let cacheDates = {}
    cacheDates = {
        potentialInitDate: null,
        potentialLastDate: null,
        actualLastDate: null
    }

    // console.log(tfi.symbol, 'callFunction, res', res)

    //new TFIMetaData record
    if (res === null) {
        console.log(tfi.symbol, '[1]')        
        frame.dateFrom = utils.getFirstDayOfMonth(currentDateGlobal, 0)
        frame.dateTo = currentDateGlobal
        frame.direction = DIRECTION_LEFT
        await TFIMetaDataCtrl.create('MONEY', tfi.symbol, tfi.name, null, null, frame.dateFrom, frame.dateTo)
    } else {  
        console.log(tfi.symbol, '[2]')
        if (res.lastDate  !== null) {
            console.log(tfi.symbol, '[3]')
            cacheDates.actualLastDate = res.lastDate
        }   
console.log('[2-3] res', res.frameDateFrom, res.frameDateTo)                      
        if (res.frameDateFrom !== null && res.frameDateTo !== null && res.frameDateFrom.getFullYear() !== 1970) {                
            frame.dateFrom = res.frameDateFrom 
            frame.dateTo = res.frameDateTo
            frame.direction = res.direction
            console.log(tfi.symbol, '[4] frame=', frame)
            await TFIMetaDataCtrl.update(tfi.symbol, {
                status: 'RUNNING',
                errorMsg: ''
            })
// console.log(tfi.symbol, 'frame already set', frame)
        } else {
            console.log(tfi.symbol, '[5]')
            //if initDate is set, scan "right" from lastDate
            if (res.initDate !== null && res.lastDate !== null) {
                console.log(tfi.symbol, '[6]')
                frame.dateFrom = moment(res.lastDate).add(1, 'days').toDate()
                if (frame.dateFrom > currentDateGlobal) frame.dateFrom = currentDateGlobal
                let lastDayOfMonth = utils.getLastDayOfMonth(res.lastDate, 0)

                //bypass for money.pl error - "Błąd: Data początkowa musi być mniejsza od końcowej"
                if (frame.dateFrom.toISOString().substr(0,10) === lastDayOfMonth.toISOString().substr(0,10)) { 
                    frame.dateFrom = moment(frame.dateFrom).add(-1, 'days').toDate()  
                }
                console.log(tfi.symbol, '[6.1]', currentDateGlobal, lastDayOfMonth)
                frame.dateTo = (currentDateGlobal < lastDayOfMonth ? currentDateGlobal : lastDayOfMonth) 

                frame.direction = DIRECTION_RIGHT                
//console.log(tfi.symbol, 'DIRECTION_RIGHT', frame)        
            //if initDate is NOT set, scan "left" from currentDate
            } else {
                console.log(tfi.symbol, '[7]')
                frame.dateFrom = utils.getFirstDayOfMonth(currentDateGlobal, 0)
                frame.dateTo = currentDateGlobal
                frame.direction = DIRECTION_LEFT
            }

// console.log(tfi.symbol, 'setting frame', frame)
            if (frame.dateFrom < frame.dateTo) await TFIMetaDataCtrl.update(tfi.symbol, {
                frameDateFrom: frame.dateFrom, 
                frameDateTo: frame.dateTo,
                direction: frame.direction,
                status: 'RUNNING',
                errorMsg: ''
            })
        }                
    }               
    console.log(tfi.symbol, '[8]')

    let self = this
    return new Promise(async function(resolve, reject) {
        try {
            if (frame.dateFrom <= frame.dateTo) { //###???
                self.getCSV(tfi.symbol, frame.dateFrom, frame.dateTo, 
                    (recs) => processFrame(tfi, frame, cacheDates, recs, resolve, reject),
                    reject
                )            
            } else {
                console.log(tfi.symbol, 'Rejected. Invalid dates ', frame.dateFrom, frame.dateTo)
                reject('Promise is rejested. Invalid dates '+frame.dateFrom+' '+frame.dateTo)
            }
        } catch (e) {
            console.log(tfi.symbol, 'PROMISE EXCEPTION', e)
            reject('Promise is rejested'+e.toString())
        }
    })    
}

exports.callbackFunction = /*async*/ (item, value)=> {
    //console.log(item.symbol, 'callbackFunction', item)
    //console.log('value.records', value.records)
    //return 'OK'
    //console.log(item.symbol, 'insertMany [value.count]',  value.count)
        /*await*/ TFIvalues.insertMany(value.records, function (err, docs) {
            if (err){ 
                console.error(err);
            } else {
                //console.log("Multiple documents inserted to Collection", docs.length);
            }
        });              

    if (value.initDate !== null && value.lastDate !== null) {
        /*await*/ TFIMetaDataCtrl.update(value.symbol, {
            initDate: value.initDate,
            lastDate: value.lastDate,
            frameDateFrom: null, 
            frameDateTo: null,
            direction: null,
            status: 'OK'
        })   
    } else {
        /*await*/ TFIMetaDataCtrl.update(value.symbol, {  
            frameDateFrom: null, 
            frameDateTo: null,
            direction: null,                      
            status: 'OK'
        }) 
    }    
}

exports.getCSV = async (symbol, dateFrom, dateTo, callback, reject) => {
    try {
        dateFrom = utils.getYYYYMMDD(dateFrom)
        dateTo = utils.getYYYYMMDD(dateTo)
        console.log(symbol, 'getCSV', dateFrom, dateTo)
        const config = {
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
        const requestBody = {
            od: dateFrom,
            do: dateTo,
            symbol: symbol,
            format: 'csv'
        }
        
        if (queue[symbol] === undefined) queue[symbol] = []    

        let res = await axios.post( BASE_URL, qs.stringify(requestBody), config)        
        if (res.data.substring(0,9) === '<!DOCTYPE') {
            callback([])
        }
        let input = res.data.replace('\nLiczba wierszy ograniczona do 50','')

// let input = "wiersz1\nwierz2\n2010-01-01,1.01\n2010-01-02,2.02\n2010-01-03,3.03"
        //console.log('res', input)
        csv( input, {
            from_line: 3,
            skisp_lines_with_error: true,
            delimiter: ','
        } , function(err, records){
            if (err) {
                console.log(symbol, dateFrom, dateTo, 'CSV Error:', err.toString().substring(0,200))
                reject('CSV Error: '+err.toString())
            } else {
    // console.log(symbol, 'records', records.length, 'CALLING callback()...')
                if (records.length > 0) queue[symbol].push({
                    dF: dateFrom, 
                    dT: dateTo, 
                    count: records.length,
                    recs: records
                })
                callback(records)
            }
        })
    } catch (e) {
        console.log(symbol, 'Exception in getCSV.', e.toString())
        reject('Exception in getCSV. '+e.toString())        
    }
}


// --------------------------------------- temp

// exports.getQueue = (symbol) => {
//     //console.log('queue[symbol].length', queue[symbol].length)
//     let out = []
//     Object.getOwnPropertyNames(queue).map((item, index) => {
//         if (index>0) {
//             out.push({
//                 symbol: item, 
//                 count: queue[item].length
//             })
//         }
//     })
//     return out
// }


// if (queueChecks[tfi.symbol] === undefined) queueChecks[tfi.symbol] = []    
// queueChecks[tfi.symbol] = setInterval( ()=> {
//     console.log(tfi.symbol, 'Checking...', queue[tfi.symbol].length)
// }, 1000)

// let finalResult = []
// let queueChecks = []

// testProcessFrame = async (symbol, from, to, records, resolve, reject) => {
//     console.log(symbol, 'testProcessFrame', records)

//     if (finalResult[symbol] === undefined) finalResult[symbol] = 0
//     finalResult[symbol]++
    
//     from = from - 1
//     if (from > 0) { 
//         this.testGetCSV(symbol, from, to,  
//             (records) => testProcessFrame(symbol, from, to, records, resolve, reject),
//             reject
//         )
//     } else {
//         resolve(finalResult[symbol])
//     }
// }

// exports.testGetCSV = async (symbol, from, to, callback, reject) => {
//     console.log(symbol, 'testGetCSV (from)', from )

//     try {
//         //throw new Error('TEST-ERROR-IN-PROMISE (in testGetCSV)')

//         console.log('1-axios.post')
//         const config = {
//             headers: {
//             'Content-Type': 'application/x-www-form-urlencoded'
//             }
//         }
//         const requestBody = {fake: true}        
//         //let input = await axios.post( BASE_URL, qs.stringify(requestBody), config)
//         let input = "wiersz1\nwierz2\n1,2,3"

//         csv( input, {
//             from_line: 3,
//             skisp_lines_with_error: true,
//             delimiter: ','
//         }, function(err, records){
//             if (err) {
//                 console.log('CSV. ERROR', err.toString())
//                 reject('Exception in csv (err). Promise is rejested'+err.toString())
//             } else {
//                 console.log('records', records)
//                 //resolve('OK')
//                 callback(records)
//             }
//         })
//     } catch (e) {
//         console.log('Exception in testGetCSV.', e.toString())
//         reject('REJECTED. Exception in testGetCSV'+e.toString())
//     } 
// }

// cf = (item) => {
// console.log('cf(item)', item)
//     let from = Math.round(Math.random() * 5) 
//     let to = null
//     let self = this
//     //throw new Error('TEST-ERROR-BEFORE-PROMISE')
//     return new Promise(async function(resolve, reject) {
//         try {
//             //throw new Error('TEST-ERROR-IN-PROMISE')
//             //money.pl HTTP call

//             self.testGetCSV(item, from, to,  
//                 (recs) => testProcessFrame(item, from, to, recs, resolve, reject),
//                 reject
//             )

            
//         } catch (e) {
//             reject('Exception in Promise. Promise is rejested'+e.toString())
//         }
//     })
// }

// exports.testRUN = () => {
// console.log('testRUN')
//     let pad = new Launcher(
//         3, 
//         ['A','B','C','D','E','F','G'],//.slice(0,1), 
//         //callFunction,
//         cf,
//         //callbackFunction,
//         (item, value)=> {
//             console.log('Launcher callbackFunction', item, value)
//             return value
//         },
//         //catchFunction
//         (e, item)=> {
//             console.log('Launcher catchFunction', e, item)
//         },
//         //finalCallback
//         (param) => {         
//             console.log('Launcher finalCallBack', param)                                                         
//         } 
//     );
//     setTimeout( () => {
//         pad.run() 
//     }, 2000)

//     //basic execution
//     if (false) try {
//         if (true) cf()
//             .then(value => {
//                 console.log('test.value', value)
//             })
//             .catch(e => {
//                 console.log('test.cf.catch', e.toString())
//             })
//     } catch (e) {
//         console.log('test.try.catch', e.toString())
//     } 
// }

