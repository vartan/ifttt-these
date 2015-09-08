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
      // action only mode
    } else {
      // start "wordpress" trigger server
      var app = express();
      app.set('port', settings.port || process.env.PORT || 1337);


      // use ifttt-webhook to simulate a wordpress server
      app.use(webhook((data, done) => {
        // verify username and password
        if(data.username === settings.username && data.password === settings.password) {

          // remove username and password from data so it isn't accidentally leaked
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

      // start server
      var server = app.listen(app.get('port'), function() {
      });
    }
  }



  /**
   * One-time if-this
   * @param  function bool Function which will evaluate true for a trigger.
   * @returns {Promise} Promise
   */
  ifThis(bool) {
    var ifttt = this;
    return new Promise((resolve) => {
      function onChange() {
        if(bool()) {
          resolve();
          ifttt.removeListener("change", onChange);
          ifttt.removeListener("action", onChange);
        }
      }
      this.on("change",  onChange);
      this.on("action",  onChange);
    });
  }

  /**
   * Set up a condition for trigger
   * @param  function bool Function which will evaluate true for a trigger.
   */
  ifThisThen(bool, callback) {
    var ifttt = this;
      function onChange() {
        if(bool()) {
          callback();
        }
      }
      this.on("change",  onChange);
      this.on("action",  onChange);
  }

  /**
   * Software trigger
   * @param  {String} action name of the trigger
   */
  softTrigger(action) {
    if(!(action instanceof Array)) {
      action = [action];
    }
    action.forEach((item) => {
      this.attention[item] = true;
    });
    this.emit("action");
    this.attention = {}
  }

  /**
   * Was Triggered
   * @param  {String} name Name of item to check if triggered
   * @return {bool}      true if the item was triggered.
   */
  wasTriggered(name) {
    return this.attention.hasOwnProperty(name) && this.attention[name];

  }

  /**
   * Set internal state
   * @param {Object} state State variables to modify.
   */
  setState(state) {
    let itemChanged = false;
    for(let key in state) {
      const TRIGGER_ONLY_ON_CHANGE = false;
      if(!TRIGGER_ONLY_ON_CHANGE || !this.state.hasOwnProperty(key) || this.state[key] !== state[key]) {
        itemChanged = true;
        this.state[key] = state[key];
        this.attention[key] = true;
      } else {
        // only keep the items which have changed to emit the action.
        delete state[key];
      }
    }
    if(itemChanged) {
      this.emit("change", state);
      this.attention = {}
    }
  }

  /**
   * Promise to send a trigger to the ifttt server 
   * @param  string eventName       the name of the trigger which will be 
   *                                specified by the Maker channel
   * @param  function argsFunction  function which will return an array of up to 
   *                                3 booleans, which will be maker values.
   * @return Promise              
   */
  triggerPromise(eventName, argsFunction) {
    var ifttt = this;
    return function() {
      return new Promise((resolve, reject) => {
        ifttt.trigger(eventName,argsFunction, resolve, reject);
      });
    };
  } 
  /**
   * Send a trigger to the ifttt server 
   * @param  string eventName       the name of the trigger which will be 
   *                                specified by the Maker channel
   * @param  function argsFunction  function which will return an array of up to 
   *                                3 booleans, which will be maker values.
   */
  trigger(eventName, argsFunction, callback, err) {
    var bodyObj = {};
    if(argsFunction)  {
      var args = argsFunction();
      args.forEach((val, i) => {bodyObj["value"+(i+1)] = val;});
    }
    var options = {
      hostname: 'maker.ifttt.com',
      port: 80,
      path: "/trigger/"+eventName+"/with/key/"+this.key,
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
      req.on('close', () => {
        if(callback) {
         callback(s);
        }
      });
    });
    req.on('error', (e) => {
      if(err) {
        err(e);
      }
    });
    var bodyString = JSON.stringify(bodyObj);
    req.write(bodyString);
    req.end();

  } 
  kill() {
    this.destructor(); 
  }
  destructor() {

  }
}
