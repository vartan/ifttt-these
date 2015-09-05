// jshint esnext:true
import express from "express";
import webhook from "express-ifttt-webhook";
import {EventEmitter} from 'events';
import http from "http";
//import ON_DEATH from "death";

// TODO: mutex to avoid race conditions

export default class IFTTT_These extends EventEmitter {

  constructor(settings) {
    // Ensure that the state is saved upon exit
    //ON_DEATH(this.destructor);

    // set variables, w/ defaults
    this.stateFile = settings.stateFile || "state.json";
    this.key = settings.key || "ERROR_NO_KEY";
    /** @type {Object} List of objects which currently are being fired */
    //TODO: should this just be replaced with array arguments?
    this.attention = {};
    /** @type {Object} List of current state */
    this.state = {};

    super();
    if(settings.username === undefined || settings.password === undefined) {

    } else {
      var app = express();
      app.set('port', settings.port || process.env.PORT || 1337);
      app.use(webhook((data, done) => {
        if(data.username === settings.username && data.password === settings.password) {
          delete data.username;
          delete data.password;

          this.emit("data", data);
          switch(data.title) {
            case "state": {
              this.setState(data.description);
              break;
            }
            case "action": {
              console.log("received action");
              this.softTrigger(data.description);
            }
          }


        } else {
          this.emit("error", {name: "Invalid Password", data: data});
        }
        done();
      }));
      var server = app.listen(app.get('port'), function() {
      });
    }
  }
  ifThis(bool) {

    return new Promise((resolve) => {
      function onChange() {
        if(bool()) {
          resolve();
        }
      }
      this.on("change",  onChange);
      this.on("action",  onChange);
    });
  }
  softTrigger(action) {
    if(!(action instanceof Array)) {
      action = [action];
    }
    action.forEach((item) => {
      this.attention[item] = true;
    });
    this.emit("action");
    action.forEach((item) => {
      this.attention[item] = false;
    });   
  }
  setState(state) {
    let itemChanged = false;
    for(let key in state) {
      if(!this.state.hasOwnProperty(key) || this.state[key] !== state[key]) {
        itemChanged = true;
        this.state[key] = state[key];
        this.attention[key] = true;
      } else {
        delete state[key];
      }
    }
    if(itemChanged) {
      this.emit("change", state);
      for(let key in state) {
        this.attention[key] = false;
      }

    }
  }
  trigger(eventName, argsFunction) {
    var _this = this;
    return function() {
      return new Promise((resolve, reject) => {
        var bodyObj = {};
        if(argsFunction)  {
          var args = argsFunction();
          args.forEach((val, i) => {bodyObj["value"+(i+1)] = val;});
        }
        var options = {
          hostname: 'maker.ifttt.com',
          port: 80,
          path: "/trigger/"+eventName+"/with/key/"+_this.key,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        };
        var req = http.request(options, (res) => {
          var s = "";
          res.on('data', (d)=>{
            s += d.toString('utf8');
          });
          req.on('close', () => {resolve(s);});
        });
        req.on('error', () => {
          reject();
        });
        var bodyString = JSON.stringify(bodyObj);
        req.write(bodyString);
        req.end();
      });
    };
  } 
  kill() {
    this.destructor(); 
  }
  destructor() {

  }
}
