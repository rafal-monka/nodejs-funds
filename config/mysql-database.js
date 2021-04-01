const Sequelize = require("sequelize");

const dbConfig = {
    HOST: process.env.DATABASE_MYSQL_HOST,
    options: {
        port: process.env.DATABASE_MYSQL_PORT
    },
    USER: process.env.DATABASE_MYSQL_USER,
    PASSWORD: process.env.DATABASE_MYSQL_PWD,
    DB: process.env.DATABASE_MYSQL_DB,
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: dbConfig.options.port,
  dialect: dbConfig.dialect,
  operatorsAliases: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  },
  // disable logging; default: console.log
  logging: false
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// db.tutorials = require("./tutorial.model.js")(sequelize, Sequelize);
db.timeseries = require("./../app/models/timeseries.model.js")(sequelize, Sequelize);

module.exports = db;