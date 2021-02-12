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

exports.json2Table = function(json, alignArr) {
    let cols = Object.keys(json[0]);
  
  
    //Map over columns, make headers,join into string
    let headerRow = cols
      .map(col => `<th>${col}</th>`)
      .join("");
  
    //map over array of json objs, for each row(obj) map over column values,
    //and return a td with the value of that object for its column
    //take that array of tds and join them
    //then return a row of the tds
    //finally join all the rows together
    let rows = json
      .map(row => {
        let tds = cols.map(col => `<td>${row[col]}</td>`).join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
  
    //build the table
    const table = `
      <table border=1>
          <thead>
              <tr>${headerRow}</tr>
          </thead>
          <tbody>
              ${rows}
          </tbody>
      </table>`;
  
    return table;
  }