const email = require("./email")
const Result = require('./models/result-model')

var status = {
    CONST_INTERVAL: 5*1000, //5 seconds
    CONST_MAX_RETRY: 6,
    items: [], 
    i: 0,
    addItem: function(name, status = false) {
        this.items.push({
            name: name,
            status: status
        });
    },
    getIndex: function(name) {
        let index = this.items.findIndex(i => i.name === name);
        if (index!==-1) {
            return index;
        } else {
            throw "Index of ["+name+"] not found in array";
        }
    },
    getInfo: function() {        
        return JSON.stringify(this.items, null, 3);  
    },  
    setStatus: function (name, value) {
        this.items[this.getIndex(name)].status = value;        
    },
    check: function() {
        console.log('checking...');
        //array.reduce(function(total, currentValue, currentIndex, arr), initialValue)
        return this.items.reduce((total, current) => total && current.status, true);         
    },
    checkingStatus: function() { 
        //https://stackoverflow.com/questions/16875767/difference-between-this-and-self-in-javascript
        var self = this;
    console.log('checkingStatus');
    // this.show();

        let status = this.check();
    console.log(">status=", status, '-', this.i, '/', this.CONST_MAX_RETRY);
        if (status === false) {
            if (this.i < this.CONST_MAX_RETRY) {
                setTimeout(function() { 
                    console.log(self.i); 
                    self.checkingStatus();    
                }, this.CONST_INTERVAL);
                this.i++;
            } else {
                console.log('NOT DONE');
                this.items.length = 0; //clear array
            }
        } else {
            console.log('OK'); 
            this.items.length = 0; //clear array
            Result.find().sort({symbol: 1, date: 1}).then(res => {
                console.log(res)
                email.sendEmail('[Funds]', '<div>'+JSON.stringify(res,' ',3)+'</div>')
            })            
            
        }
    }
};

module.exports = status;
