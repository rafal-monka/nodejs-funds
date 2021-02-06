var moment = require('moment')

exports.removeExtensionFromFile = (file) => {
    return file.split('.').slice(0, -1).join('.').toString()
}

exports.getYYYYMMDD = (date) => {
    return date.toISOString().substring(0,10)
}

exports.getFirstDayOfMonth = (date, direction) => {  
    date = date.toISOString().substr(0,10) 
    let ret = moment(date).add(direction, 'months').utcOffset('+0000').startOf('month').toDate()
//console.log('getFirstDayOfMonth', direction, date, ' =>', ret)
    return ret
}

exports.getLastDayOfMonth = (date, direction) => {
console.log('getLastDayOfMonth, date=', date)    
    date = new Date(date.toISOString().substr(0,10))
    //let ret = new Date(date.getFullYear(), date.getMonth()+1, 0)//
    let ret = moment(date).add(direction, 'months').utcOffset('+0000').endOf('month').toDate()
console.log('getLastDayOfMonth', direction, date, ' =>', ret)    // date = new Date(date)
    return ret
}

exports.getDaysArray = function(s,e) {for(var a=[],d=new Date(s);d<=e;d.setDate(d.getDate()+1)){ a.push(new Date(d));}return a;};
