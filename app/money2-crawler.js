var axios = require('axios')
const qs = require('querystring')
const csv = require('csv-parse') //https://csv.js.org/parse/
const storage = require('./fund-storage')
var Launcher = require("./launcher.js")
const { resolve } = require('path')
var moment = require('moment')
const TFI = require('./money2/TFI')
const TFIMetaData = require('./money2/metadata')
const { resolveCname } = require('dns')
const TFIvalues = require('./models/tfi-values-model')

const BASE_URL = "https://www.money.pl/fundusze/archiwum/fundusze/"

const MIN_DATE = new Date("2010-01-01")
const DIRECTION_RIGHT = 1
const DIRECTION_LEFT = -1

let currentDate
let queue = []
let queueChecks = []

getYYYYMMDD = (date) => {
    return date.toISOString().substring(0,10)
}

getFirstDayOfMonth = (date, direction) => {  
    date = date.toISOString().substr(0,10) 
    let ret = moment(date).add(direction, 'months').utcOffset('+0000').startOf('month').toDate()
//console.log('getFirstDayOfMonth', direction, date, ' =>', ret)
    return ret
}

getLastDayOfMonth = (date, direction) => {
    date = date.toISOString().substr(0,10)
    let ret = moment(date).add(direction, 'months').utcOffset('+0000').endOf('month').toDate()
//console.log('getLastDayOfMonth', direction, date, ' =>', ret)    // date = new Date(date)
    return ret
}

setNewFrame = async (tfi, currentDate, frame) => {
//console.log(tfi.symbol, 'setNewFrame, current frame', frame)
         
    let firstDayOfMonth = getFirstDayOfMonth(frame.dateTo, frame.direction)
    let lastDayOfMonth = getLastDayOfMonth(frame.dateTo, frame.direction) 
    
    let minDate = (frame.direction === DIRECTION_LEFT) ? (MIN_DATE > firstDayOfMonth ? MIN_DATE : firstDayOfMonth) : firstDayOfMonth    
    let maxDate = (frame.direction === DIRECTION_RIGHT) ? (currentDate < lastDayOfMonth ? currentDate : lastDayOfMonth) : lastDayOfMonth    
    let ret

    if (minDate <= maxDate) {
        ret = {
            dateFrom: minDate,
            dateTo: maxDate,
            direction: frame.direction
        }
        await TFIMetaData.update(tfi.symbol, {
            frameDateFrom: ret.dateFrom,
            frameDateTo: ret.dateTo,
            updated_at: new Date()
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
console.log(symbol, 'SAVING', /*queue[symbol].count, queue[symbol].recs.length*/)
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
console.log(symbol, 'insertMany', count)
    await TFIvalues.insertMany(recArr, function (err, docs) {
        if (err){ 
            console.error(err);
        } else {
            console.log("Multiple documents inserted to Collection", docs.length);
        }
    });
    

// console.log(symbol, 'Canceling...')
    clearTimeout(queueChecks[symbol])    

    if (initDate !== null && lastDate !== null) {
        await TFIMetaData.update(symbol, {
            initDate: initDate,
            lastDate: lastDate,
            frameDateFrom: null, 
            frameDateTo: null,
            direction: null,
            status: 'OK',
            updated_at: new Date()
        })   
    } else {
        await TFIMetaData.update(symbol, {  
            frameDateFrom: null, 
            frameDateTo: null,
            direction: null,                      
            status: 'OK',
            updated_at: new Date()
        }) 
    }
    resolve('RESOLVED-'+symbol)
}

processFrame = async (tfi, frame, cacheDates, records, resolve) => {
    // console.log(tfi.symbol, 'processFrame', frame)

    let newFrame
    switch (frame.direction) {
        case DIRECTION_LEFT:
            if ((records.length === 0 && cacheDates.potentialInitDate !== null) || (frame.dateFrom.getTime() === MIN_DATE.getTime())) {
                finish(tfi.symbol, resolve, cacheDates.potentialInitDate, cacheDates.potentialLastDate)              
            } else {
                //@@@save & set new window frame
                let lastDate = new Date(records[0][0])
                if (lastDate > cacheDates.potentialLastDate || cacheDates.potentialLastDate === null) {
                    cacheDates.potentialLastDate = lastDate
                }
                newFrame = await setNewFrame(tfi, this.currentDate, frame)

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
                            processFrame(tfi, newFrame, cacheDates, records, resolve)
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
                    await TFIMetaData.update(tfi.symbol, {
                        lastDate: lastDate,
                        updated_at: new Date()
                    })
                }
                //@@@save & set new window frame
                newFrame = await setNewFrame(tfi, this.currentDate, frame)

                if (newFrame.dateFrom !== null && newFrame.dateTo !== null) {
                    this.getCSV(tfi.symbol, newFrame.dateFrom, newFrame.dateTo, 
                        (records) => processFrame(tfi, newFrame, cacheDates, records, resolve)
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

callFunction = async (tfi) => {
    console.log(tfi.symbol, 'callFunction')

    let res = await TFIMetaData.read(tfi.symbol)
    
    this.currentDate = this.currentDate > new Date() ? new Date() : this.currentDate
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

    //new TFIMetaData record
    if (res === null) {
        frame.dateFrom = getFirstDayOfMonth(this.currentDate, 0)
        frame.dateTo = this.currentDate
        frame.direction = DIRECTION_LEFT
        console.log(tfi.symbol, 'TFIMetaData.create')
        await TFIMetaData.create(tfi.symbol, tfi.name, null, null, frame.dateFrom, frame.dateTo)
    } else {  
        if (res.lastDate  !== null) {
            cacheDates.actualLastDate = res.lastDate
        }                         
        if (res.frameDateFrom !== null && res.frameDateTo !== null) {                
            frame.dateFrom = res.frameDateFrom 
            frame.dateTo = res.frameDateTo
            frame.direction = res.direction
// console.log(tfi.symbol, 'frame already set', frame)
        } else {
            //if initDate is set, scan "right" from lastDate
            if (res.initDate !== null && res.lastDate !== null) {
                frame.dateFrom = moment(res.lastDate).add(1, 'days').toDate()
                let lastDayOfMonth = getLastDayOfMonth(res.lastDate, 0)
                frame.dateTo = (this.currentDate < lastDayOfMonth ? this.currentDate : lastDayOfMonth) 
                frame.direction = DIRECTION_RIGHT                
//console.log(tfi.symbol, 'DIRECTION_RIGHT', frame)        
            //if initDate is NOT set, scan "left" from currentDate
            } else {
                frame.dateFrom = getFirstDayOfMonth(this.currentDate, 0)
                frame.dateTo = this.currentDate
                frame.direction = DIRECTION_LEFT
            }

// console.log(tfi.symbol, 'setting frame', frame)
            if (frame.dateFrom < frame.dateTo) await TFIMetaData.update(tfi.symbol, {
                frameDateFrom: frame.dateFrom, 
                frameDateTo: frame.dateTo,
                direction: frame.direction,
                status: 'PENDING',
                updated_at: new Date() 
            })
        }                
    }               

    //console.log('await processFrame(tfi, frame, cacheDates)...')
    //await processFrame(tfi, frame, cacheDates)

    //console.log('ENDED')
    let self = this
    return new Promise(async function(resolve, reject) {
        //resolve('TEST')
        //return
        // try {
            if (frame.dateFrom <= frame.dateTo) {
                self.getCSV(tfi.symbol, frame.dateFrom, frame.dateTo, 
                    (recs) => processFrame(tfi, frame, cacheDates, recs, resolve)
                )
                
                if (queueChecks[tfi.symbol] === undefined) queueChecks[tfi.symbol] = []    
                queueChecks[tfi.symbol] = setInterval( ()=> {
                    console.log(tfi.symbol, 'Checking...', queue[tfi.symbol].length)
                }, 1000)

            } else {
                reject(tfi.symbol+' Rejected. Invalid dates '+frame.dateFrom, frame.dateTo)
            }
        // } catch (e) {
        //     console.log('PROMISE EXCEPTION', e)
        // }
    })//@@@???.catch(e => { console.log('PROMISE EXCEPTION2', e) })
}

exports.run = (currentDate, symbol) => {
    this.currentDate = new Date(currentDate)
    let pad = new Launcher(
        2, 
        TFI.getList(symbol),//.slice(0,1), 
        //callFunction,
        callFunction,
        //callbackFunction,
        (item, value)=> {
            console.log('Launcher callbackFunction', item, value)
        },
        //finalCallBack
        (param) => {         
            console.log('final', param)                                                         
        } 
    );
    pad.run();    
}

exports.getCSV = async (symbol, dateFrom, dateTo, callback) => {
    dateFrom = getYYYYMMDD(dateFrom)
    dateTo = getYYYYMMDD(dateTo)
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

    //let self = this
    try {
        let res = await axios.post( BASE_URL, qs.stringify(requestBody), config)//.then(res => {
        if (res.data.substring(0,9) === '<!DOCTYPE') {
            callback([])
        }
        let input = res.data.replace('\nLiczba wierszy ograniczona do 50','')
        //console.log('res', input)
        csv( input, {
            from_line: 3,
            skisp_lines_with_error: true,
            delimiter: ','
        } , function(err, records){
            if (err) {
                console.log(symbol, dateFrom, dateTo, 'csv.ERROR', err.toString().substring(0,200))
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
            //records.forEach(rec => console.log(rec[0], 1*rec[1].replace(',','.')) )
            //return //@@@
            // records.forEach(rec => {
            //     try {
            //         //console.log(symbol, new Date(rec[0]), rec[1])
            //         storage.store(symbol, new Date(rec[0]), 1*rec[1].replace(',','.'))
            //     } catch (e) {
            //         console.log('Error', symbol, rec, e.toString())
            //         //rejectCallback(e)
            //     }                 
            // })
            // console.log('getCSV', 'Storing...', symbol, symbol, dateFrom, DateTo)
            //resolveCallback()
        })
    //})
    } catch (e) {
        throw new Error('HTTP ERROR')        
    }
}

exports.getQueue = (symbol) => {
    //console.log('queue[symbol].length', queue[symbol].length)
    let out = []
    Object.getOwnPropertyNames(queue).map((item, index) => {
        if (index>0) {
            out.push({
                symbol: item, 
                count: queue[item].length
            })
        }
    })
    return out
}


