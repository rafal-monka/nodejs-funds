/*
 * Funds Node app
 */
require('dotenv').config();
const express = require("express")
const cors = require('cors')
const bodyParser = require("body-parser");
const path = require('path')
const initMongoDatabase = require('./config/mongo-database')
const mySQLDatabase = require("./config/mysql-database")
const wss = require('./wss')
const aol = require("./app/analizyonline-crawler.js")
const storage = require('./app/fund-storage')
const app = express();

app.use(cors())
app.use(bodyParser.json());// parse requests of content-type - application/json
app.use(bodyParser.urlencoded({ extended: true }));// parse requests of content-type - application/x-www-form-urlencoded

app.get("/home", (req, res) => {
    res.json({ message: "Welcome to Funds application." });
});

app.get("/perform", (req, res) => {
    aol.perform(req)
    res.json({ message: "aol.perform called. Wait for email." });
});

app.get("/perform/check", (req, res) => {
    storage.checkFundsAgaistTFIvalues()
    res.json({ message: "Perform CHECK called. Check out logs" });
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
var server = app.listen(PORT, () => {
    wss.init(server)
    console.log(`Server Funds is running on port ${PORT}.`);
});

//init Mongo database
initMongoDatabase()

//init mySQL
mySQLDatabase.sequelize.sync( /* { force: true } */ ) //!!! In development, you may need to drop existing tables and re-sync database.
.then( () => {
    console.log('Connected to mySQL database', process.env.DATABASE_MYSQL_DB)
}).catch(e => {
    console.log('Error connecting to mySQL database', process.env.DATABASE_MYSQL_DB, e.toString())
})



// mojefundusze.perform() 
// aol.perform()

//[eof]

//-----------------old
// const schedule = require('node-schedule')

// ###unused: mojefundusze.perform()

// ###unused: const mojefundusze = require("./app/mojefundusze-crawler.js")
// ###unused: const moneyValueLoader = require("./app/money-values-loader.js")
// ###unused: const money = require("./app/money-crawler.js")
// ###unused: const money2 = require("./app/money2-crawler.js")

// ###unused: const observations = require("./app/controllers/observations.js");
// ###unused: const status = require("./app/status.js");
// ###unused: const RoiController = require("./app/controllers/rois-controller.js")

//-----------------temp

// app.get("/api/run/:symbol", (req, res) => {    
//     console.log('/api/run/:symbol', req.params.symbol)
//     money2.run(new Date(), req.params.symbol)
//     res.json({ message: "TFI called." })
// });

// app.get("/api/queue/:symbol", (req, res) => {    
//     let queue = money2.getQueue(req.params.symbol)
//     res.json(queue)
// });

//schedule word reminder
// cronParams = "0 0 15-16 * * 1-5" //18:00 Mon-Fri
// console.log('schedule', new Date(), cronParams)

// var j = schedule.scheduleJob(cronParams, function(){ 
//     // mojefundusze.perform()
//     aol.perform()
// });

// testInv.forEach(item => {
//     status.addItem(item.symbol)
//     observations.load(item)
// })

// console.log(status.getInfo())
// setTimeout(function() { 
//     status.checkingStatus();    
// }, status.CONST_INTERVAL);

// mojefundusze.delete('SKA-OBL')
// mojefundusze.loadFundValues()
// mojefundusze.loadInvestment()

// moneyValueLoader.delete('TFI1')

// money2.run(new Date())
// money2.getCSV('TFI6771', new Date('2020-04-01'),new Date('2020-04-30'))
// moneyValueLoader.run(99999, new Date(), 'TFI4562')

// storage.store('NN-OBL', new Date('2020-09-17'), 347.38)
// storage.store('NN-OBL', new Date('2020-09-18'), 347.38)
// storage.store('PEK-OBL', new Date('2020-09-17'), 13.41)
// storage.store('PEK-OBL', new Date('2020-09-18'), 13.42)
// storage.store('QUE-DLK', new Date('2020-09-17'), 75.39)
// storage.store('QUE-DLK', new Date('2020-09-18'), 75.38)

// RoiController.calcFundROI('SKB-OBL', 0)
// return

// FUND STORAGE !!! --> REM when migrate
// money.importFund('SAN-OBL', 'TFI112', 2002, 2020, "2002-08-20", "2020-07-01")
// money.importFund('SAN-OBLP', 'TFI4562', 2010, 2020, "2010-11-16", "2020-07-01")
// money.importFund('NN-OBL', 'TFI6771', 1999, 2020, "1999-02-24", "2020-07-02")
// money.importFund('PEK-OBL', 'TFI8172', 2016, 2020, "2016-10-24", "2020-08-11")
// money.importFund('QUE-DLK', 'TFI5438', 2008, 2020, "2008-03-28", "2020-08-11")
// money.importFund('SAN-AKP', 'TFI1', 1998, 2020, "1998-04-02", "2020-08-11")
// money.importFund('SKB-SWZ', 'TFI4635', 2011, 2020, "2011-05-11", "2020-08-11")
// money.importFund('SKB-OBL', 'TFI66', 1999, 2020, "1999-04-14", "2020-08-11")
