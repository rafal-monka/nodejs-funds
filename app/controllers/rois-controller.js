const Roi = require('./../models/rois-model')
const Funds = require('./../models/funds-model')
const Investments = require('./../models/investments-model')

exports.getAll = (req, res, next) => {  
    Roi.find({ /*symbol: "PEK-OBL",*/ date: {$gt: new Date(req.params.datemin)}}) 
        .then(function (result) {
            let arr = []
            result.forEach(item => {
                //console.log('arr[item.symbol]', item.symbol, arr[item.symbol])
                if (arr[item.symbol] === undefined) arr[item.symbol] = {symbol: item.symbol, data: []}
                arr[item.symbol].data.push([
                    new Date(item.date).getTime(),
                    item.value,
                    item.roi24,
                    item.roi18,                    
                    item.roi12,
                    item.roi9,
                    item.roi6,
                    item.roi3,
                    item.roi2,                                        
                    item.roi1                  
                ])
            }) 
            //console.log(arr)   

            let out = []
            Object.getOwnPropertyNames(arr).map((item, index) => {
                if (index>0) {
                    let ordered = arr[item].data.sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                    out.push({
                        symbol: arr[item].symbol, 
                        data: ordered
                    })
                }   
            })
            //console.log(JSON.stringify(out))
            //console.log(out)
            // arr.forEach(item )
            res.status(200).json(out)            
        })
        .catch (next) 
}

const saveROI = (symbol, date, value, rois) => {    
    Roi.find( {symbol: symbol, date: date}, function (err, docs) {
        if (docs.length===0) {
            let roi = new Roi({    
                symbol: symbol, 
                date: date,
                value: value,
                roi24: rois[0].v,
                roi18: rois[1].v,
                roi12: rois[2].v,
                roi9: rois[3].v,
                roi6: rois[4].v,
                roi3: rois[5].v,
                roi2: rois[6].v,
                roi1: rois[7].v 
            })
            roi.save().then(res => {
                //console.log('Saved ROI', symbol, date, res)
            }).catch(e => {
                console.log('Error saving ROI', symbol, date, roi, e)
            })
        } else {
            if (value === docs[0].value 
                && rois[0].v === docs[0].roi24 
                && rois[1].v === docs[0].roi18 
                && rois[2].v === docs[0].roi12 
                && rois[3].v === docs[0].roi9 
                && rois[4].v === docs[0].roi6 
                && rois[5].v === docs[0].roi3 
                && rois[6].v === docs[0].roi2 
                && rois[7].v === docs[0].roi1) {
                console.log('OK ROI values are the same.', symbol, date/*, ' \nROIS='+JSON.stringify(rois)+' \nDOCS='+docs[0]*/)
            } else {
                console.log('ERROR different ROI values. Fund '+symbol+' for date '+date.toISOString().substr(0,10)+' VALUE='+value+' <> DOCS.VALUE='+docs[0].value+' \nROIS='+JSON.stringify(rois)+' \nDOCS='+docs[0])
            }
        }
    })
}

exports.delete = (req, res) => {
    console.log('req.params.symbol', req.params.symbol)
    Roi.deleteMany( {symbol: req.params.symbol}, function (err, docs) {
        console.log('Deleted', req.params.symbol)
        res.json('Deleted '+req.params.symbol)
    })
}

exports.calcFundROI = (symbol, endOnPosition) => {
    console.log('calcFundROI', symbol)
    const MONTH = 21
    let periods = [24, 18, 12, 9, 6, 3, 2, 1]

    return new Promise(function(resolve, reject) {
        Funds
        .find({symbol: symbol})
        .sort({date: 1}) 
        .then(function (funds) {  
            try {          
                let arr = []
                let i = funds.length-1
                let last = endOnPosition === 1 ? funds.length-1 : 0

                while (i >= last) {
console.log(i)
                    let rois = []
                    periods.forEach(period => {
                        let delta = period * MONTH
                        rois.push( 
                            (i-delta >= 0) ? {
                                v: Math.round(100 * (funds[i].value - funds[i-delta].value) / funds[i-delta].value * 100) / 100, 
                                d: funds[i-delta].date
                            } : {
                                v: null,
                                d: null
                            }
                        )                 
                    })              
                    arr.push({
                        fund: funds[i], 
                        rois: rois                
                    })
                    i-- 
                }

                arr = arr.sort((a,b) => a.fund.date-b.fund.date).filter(
                    item => item.rois.reduce((total, item) => total + (item.v === null? 0 : 1), 0) > 0
                )

//  console.log('arr[0][last]', arr[0], arr[arr.length-1])
                //storage                
                arr.forEach(item=>saveROI(item.fund.symbol, item.fund.date, item.fund.value, item.rois))

                resolve(arr)
            } catch (e) {
                reject(e)
            }
        })
    
    })
    
}

exports.calc = (req, res, next) => {
    console.log('req.params.symbol', req.params.symbol)   
     
    this.calcFundROI(req.params.symbol, 0).then(arr => {

        res.json({ 
            message: "ROI Calc called."+req.params.symbol, 
            length: arr.length,
            first: arr[0], 
            last: arr[arr.length-1] 

        });

    }).catch(next)
};

exports.calcRoi4All = (endOnPosition) => {
    let self = this
    Investments.find({}) 
        .then(function (result) {
            //res.json(  )
            [...new Set(result.map(inv => inv.symbol))]
            .forEach(symbol => self.calcFundROI(symbol, endOnPosition)
                .then(arr => {
                    console.log('then', symbol)
                })
                .catch(err => {
                    console.log('calcRoi4All/calcFundROI', err)
                })
            )
        })
        .catch(err => {
            console.log('calcRoi4All/Investments.find', err)
        })
}

exports.calcAll = (req, res, next) => {
        this.calcRoi4All(0)
        res.json({ 
            message: "ROI Calc called for All"
        })
}

exports.getAllPURE_OLD = (req, res, next) => {  
    Roi.find({}) 
        .then(function (result) {
            res.status(200).json(result)
        })
        .catch (next) 
}

/*
    let a = [  
        {
            symbol: 'NN-OBL',
            date: "2020-08-03", 
            value: 10
        },
        {
            symbol: 'NN-OBL',
            date: "2020-08-02", 
            value: 11
        },
        {
            symbol: 'NN-OBL',
            date: "2020-08-01", 
            value: 12
        },
        {
            symbol: 'PEK-OBL',
            date: "2020-08-02", 
            value: 10.5
        },
        {
            symbol: 'PEK-OBL',
            date: "2020-08-01", 
            value: 9.5
        },
        {
            symbol: 'PEK-OBL',
            date: "2020-08-03", 
            value: 8.5
        }
    ]
    a.forEach(item=>{    
        let roi = new Roi({    
            symbol: item.symbol, 
            date: new Date(item.date),
            value: item.value,
            // roi24: 24.0,
            // roi18: 18.0,
            // roi12: 12.0,
            // roi9: 9.0,
            // roi6: 6.0,
            // roi3: 3.0,
            // roi1: 1.0
        })
        roi.save().then(res => {
            console.log('Saved ROI', res)
        }).catch(e => {
            console.log('Error saving ROI', e)
        })
    })
*/