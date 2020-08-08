/*
 * Funds Node app
 */
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");

// const mongodb = require("./app/mongodb.js");
const initDatabase = require('./config/database')
const schedule = require('node-schedule')


const mojefundusze = require("./app/mojefundusze-crawler.js");
const observations = require("./app/controllers/observations.js");
const status = require("./app/status.js");
    // const db = require("./app/models");

    //@@@development = true; production = false
    // db.sequelize.sync(  { force: false }  ); //!!! In development, you may need to drop existing tables and re-sync database.


const app = express();

// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "Welcome to Funds application." });
});

//App API endpoints
app.use("/api", require('./app/routes/'))

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server Crawler is running on port ${PORT}.`);
});

//init database
initDatabase()

//mojefundusze.dictionary()

//mojefundusze.loadFundValues()
//mojefundusze.loadInvestment()

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
cronParams = "0 15 18 * * MON-FRI"; //every weekday 18:15
console.log('schedule', cronParams)

var j = schedule.scheduleJob(cronParams, function(){ 
    mojefundusze.perform()
});

  

