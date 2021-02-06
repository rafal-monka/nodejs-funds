var axios = require('axios')
var DomParser = require('dom-parser');

getPage = (url) => {    
    console.log('getPage', url);
    try {
        return axios({
            url: url,
            methog: 'get',
            params: { }
        })
    } catch (error) {
        console.log('###Error: getPage');
        console.error(error);
    }
}

exports.getIndicators = (req, res, next) => {  
    getPage('https://money.cnn.com/data/fear-and-greed/')
        .then(result => {
            let value = parsePage(result.data)
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<!doctype html><html lang="en"><body>'
                     +'<p>'+value.date+'</p>'
                     +'<p>'+value.info+'</p>'
                     +'<img src="'+value.image+'">'
                     +'</body></html>')
            res.end()
        })
}



parsePage = (html) => {  
    //console.log('parsePage');
    //console.log(html.data);
	var parser = new DomParser();
    var dom = parser.parseFromString(html);

    let result = {} 

    try {
        let needleChart = dom.getElementById('needleChart')
    // console.log(tmp);       
        let style = needleChart.getAttribute('style');
        var regex = new RegExp("\;(.*?)\&", "i");
        result.image = style.match(regex)[1]

        result.info = needleChart.innerHTML

        let needleAsOfDate = dom.getElementById('needleAsOfDate')
        result.date = needleAsOfDate.innerHTML

    } catch (e) {       
        console.error('Error. Can not find needleChart', e);
    }

    // //img src    
    
    // try {
    //     let imgs = dom.getElementsByTagName("img");  
    //     imgs.forEach( img => {
    //         let err = 0;
    //         try {
    //             let s1 = img.getAttribute('src');
    //             if (s1.substring(0,2) === 'f_' || s1.substring(0,3) === 'jh_') result.src = s1;
    //         } catch (e) {
    //             err = 1;
    //         }
    //         try {
    //             let s2 = img.getAttribute('SRC');
    //             if (s2.substring(0,2) === 'f_' || s1.substring(0,3) === 'jh_') result.src = s2;
    //         } catch (e) {
    //             err = 2;
    //         }      
    //         //###???  
    //         // if (err > 0 && result.src == '') {
    //         //     console.error(item);
    //         //     console.error('###Error. src/SRC',err, result.src == '');
    //         // }    
    //     })
    // } catch (e) {
    //     console.error(item);        
    //     console.error('###Error. Can not find img',result.title);
    // } 

    return result;
}