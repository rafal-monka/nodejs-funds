exports.createPivotTable = (arr) => {
    let pivotArr = [[]]
    let pivotArrFilled = [[]]
    let uniqueX = [...new Set(arr.sort( (a, b) => a[0] > b[0] ? 1 : -1).map(item => item[0]))]
    let uniqueY = [...new Set(arr.sort( (a, b) => a[1] > b[1] ? 1 : -1).map(item => item[1]))]
    // console.log(uniqueX)
    // console.log(uniqueY)

    //init empty arrays
    uniqueY.forEach((y, yi) => {
        pivotArr[y] = []
        pivotArrFilled[yi] = []
        uniqueX.forEach((x, xi) => {
            pivotArr[y][x] = null
            pivotArrFilled[yi][xi] = {}/*, null*/
        })
    })
    arr.forEach(el => {
        let x = el[0]
        let y = el[1]
        pivotArr[y][x] = el[2]
    })

        //fill with "original" values
    uniqueY.forEach((y, yi) => {
        uniqueX.forEach((x, xi) => {
            let ux = uniqueX[xi]
            let uy = uniqueY[yi]
            pivotArrFilled[yi][xi].x = x
            pivotArrFilled[yi][xi].y = y
            pivotArrFilled[yi][xi].v = pivotArr[y][x]
  //console.log(xi, yi, x, y, pivotArr[x][y], pivotArr[ux][uy])
        })
    })

    let pivotArrPlain = pivotArrFilled.map(row => {
        return row.map(cell => cell.v)
    })
    
    return {
      uniqueX: uniqueX,
      uniqueY: uniqueY,
      pivotArrPlain: pivotArrPlain,
      pivotArrFilled: pivotArrFilled
    }
}