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

exports.getLastDayOfPreviousMonth = (date) => {
    date = new Date(date)
    return new Date(new Date(date.getFullYear(), date.getMonth(), 1).getTime()-24*60*60*1000)
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

exports.json2Table = function(json, alignArr, colorCol) {
    let cols = Object.keys(json[0]);
  
  
    //Map over columns, make headers,join into string
    let headerRow = `<td>Nr</td>`+cols
      .map(col => `<th>${col}</th>`)
      .join("");
  
    //map over array of json objs, for each row(obj) map over column values,
    //and return a td with the value of that object for its column
    //take that array of tds and join them
    //then return a row of the tds
    //finally join all the rows together
    let rows = json
      .map((row, ri) => {
        let tds = `<td>${ri+1}</td>`+cols.map((col, ci) => `<td style="text-align: ${alignArr[ci]===0?'left':'right'}">${row[col]}</td>`).join("");
        return `<tr style="color: ${row[colorCol]<0?'red':row[colorCol]===0?'black':'green'}">${tds}</tr>`;
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

exports.getQuarter = (date) => {
    var month = date.getMonth() + 1;
    return (Math.ceil(month / 3));
}

exports.createPivotTable = (arr) => {
    let pivotArr = [[]]
    let pivotArrFilled = [[]]
    let uniqueX = [...new Set(arr.sort( (a, b) => a[0] > b[0] ? 1 : -1).map(item => item[0]))]
    let uniqueY = [...new Set(arr.sort( (a, b) => a[1] > b[1] ? 1 : -1).map(item => item[1]))]
    // console.log(uniqueX)
    // console.log(uniqueY)

    //init empty arrays
    uniqueX.forEach((x, xi) => {
        pivotArr[x] = []
        pivotArrFilled[xi] = []
        uniqueY.forEach((y, yi) => {
            pivotArr[x][y] = null
            pivotArrFilled[xi][yi] = {}/*, null*/
        })
    })
    arr.forEach(el => {
        let x = el[0]
        let y = el[1]
        pivotArr[x][y] = el[2]
    })

        //fill with "original" values
    uniqueX.forEach((x, xi) => {
        uniqueY.forEach((y, yi) => {
            let ux = uniqueX[xi]
            let uy = uniqueY[yi]
            pivotArrFilled[xi][yi].x = x
            pivotArrFilled[xi][yi].y = y
            pivotArrFilled[xi][yi].v = pivotArr[x][y]
  //console.log(xi, yi, x, y, pivotArr[x][y], pivotArr[ux][uy])
        })
    })
    
    return {
      uniqueX: uniqueX,
      uniqueY: uniqueY,
      pivotArrFilled: pivotArrFilled
    }
}