module.exports = (sequelize, Sequelize) => {
    const TimeSeries = sequelize.define("timeseries", {        
      symbol: {
        type: Sequelize.STRING(10)
      },
      cat: {
        type: Sequelize.STRING(8)
      },
      date: {
        type: Sequelize.DATEONLY
      },
      value: {
        type: Sequelize.DECIMAL(10, 2)
      },
      comment: {
        type: Sequelize.STRING
      }
    });
     
    return TimeSeries;
  };