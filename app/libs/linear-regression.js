const CONST_ONE_DAY = 24*60*60*1000

//#input array [ [time1, value1], [time2, value2], ... [timeN, valueN]]
exports.calcLR = (inputArr) => {
    // console.log('[calcLR]', inputArr[0]);
    // try {
        let avg = {
            x: Math.round(inputArr.reduce((total, item) => total+item[0], 0) / inputArr.length * 100) / 100,
            y: Math.round(inputArr.reduce((total, item) => total+item[1], 0) / inputArr.length * 100) / 100
        }
        let sumCounter = inputArr.reduce((total, item) => total + (item[0] - avg.x)*(item[1] - avg.y), 0)
        let sumDenominator = inputArr.reduce((total, item) => total + Math.pow( (item[0] - avg.x), 2), 0)
        let a = sumCounter / sumDenominator
        let lr = {
            a: a,
            b: avg.y - a * avg.x
        } 
        
        //first x (datetime)
        lr.x0 = inputArr[0][0]
        
        //last x (datetime)
        lr.xn = inputArr[inputArr.length-1][0]
        
        //first y (value)
        lr.y0 = Math.round((lr.a * inputArr[0][0] + lr.b) * 100) / 100
        
        //last y (value)
        lr.yn = Math.round((lr.a * inputArr[inputArr.length-1][0] + lr.b) * 100) / 100
        
        //difference between last and first x in millisecs
        lr.dx = inputArr[inputArr.length-1][0] - inputArr[0][0]

        //difference between last and first x in days
        lr.dx2 = (inputArr[inputArr.length-1][0] - inputArr[0][0]) / CONST_ONE_DAY
        // console.log('[fatLR][3]')
        return lr
    // } catch (e) {
    //    console.log('Error in fatLR', inputArr, e.toString())
    //    return {a: 0, b: 0}
    // }    
}