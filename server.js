/*
 * Funds Node app
 */
require('dotenv').config();
const express = require("express")
const cors = require('cors')
const bodyParser = require("body-parser");
const path = require('path')
const initDatabase = require('./config/database')
const schedule = require('node-schedule')

const mojefundusze = require("./app/mojefundusze-crawler.js");
const money = require("./app/money-crawler.js");
// ###unused: const observations = require("./app/controllers/observations.js");
// ###unused: const status = require("./app/status.js");

const app = express();

app.use(cors())
app.use(bodyParser.json());// parse requests of content-type - application/json
app.use(bodyParser.urlencoded({ extended: true }));// parse requests of content-type - application/x-www-form-urlencoded

app.get("/home", (req, res) => {
    res.json({ message: "Welcome to Funds application." });
});

//make default URL for SPA
const buildLocation = 'public'; //include public folder with SPA app
app.use(express.static(path.join(__dirname, buildLocation)));

//#https://blog.fullstacktraining.com/404-after-refreshing-the-browser-for-angular-vue-js-app/
app.use("/*", (req, res, next) => {
    if (!req.originalUrl.includes(buildLocation) && !req.originalUrl.includes('/api/') && !req.originalUrl.includes('/login') && !req.originalUrl.includes('/logout') ) {    
        res.sendFile(`${__dirname}/${buildLocation}/index.html`);
    } else {
        next();
    }
});

//App API endpoints
app.use("/api", require('./app/routes/'))

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server Crawler is running on port ${PORT}.`);
});

//init database
initDatabase()

// money.import("2020-06-01", "2020-08-06")
// return 
// mojefundusze.delete('SKA-OBL')
// mojefundusze.loadFundValues()
// mojefundusze.loadInvestment()

// testInv.forEach(item => {
//     status.addItem(item.symbol)
//     observations.load(item)
// })

// console.log(status.getInfo())
// setTimeout(function() { 
//     status.checkingStatus();    
// }, status.CONST_INTERVAL);

//run 
mojefundusze.perform() 


//schedule word reminder
cronParams = "0 30 13-16 * * 1-6"; //every 3pm - 8pm :30 MON-SAT
console.log('schedule', new Date(), cronParams)

var j = schedule.scheduleJob(cronParams, function(){ 
    mojefundusze.perform()
});

//[eof]