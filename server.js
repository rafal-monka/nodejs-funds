/*
 * Funds Node app
 */
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");

// const mongodb = require("./app/mongodb.js");
const initDatabase = require('./config/database')
const schedule = require('node-schedule')

// const storage = require("./app/storage.js");

const mojefundusze = require("./app/mojefundusze-crawler.js");

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

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server Crawler is running on port ${PORT}.`);
});

//init database
initDatabase()

//run
mojefundusze.calculate() 

//schedule word reminder
cronParams = "0 33 17 * * MON-FRI"; //every day 17
console.log('schedule', cronParams)

var j = schedule.scheduleJob(cronParams, function(){ 
    mojefundusze.calculate()
});

  

