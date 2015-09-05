"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

// jshint esnext:true

var express = _interopRequire(require("express"));

var webhook = _interopRequire(require("express-ifttt-webhook"));

var EventEmitter = require("events").EventEmitter;

var http = _interopRequire(require("http"));

//import ON_DEATH from "death";

// TODO: mutex to avoid race conditions

var IFTTT_These = (function (_EventEmitter) {
  function IFTTT_These(settings) {
    var _this = this;

    _classCallCheck(this, IFTTT_These);

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

    _get(Object.getPrototypeOf(IFTTT_These.prototype), "constructor", this).call(this);
    if (settings.username === undefined || settings.password === undefined) {} else {
      // start "wordpress" trigger server
      var app = express();
      app.set("port", settings.port || process.env.PORT || 1337);

      // use ifttt-webhook to simulate a wordpress server
      app.use(webhook(function (data, done) {
        // verify username and password
        if (data.username === settings.username && data.password === settings.password) {

          // remove username and password from data so it isn't accidentally leaked
          delete data.username;
          delete data.password;

          _this.emit("data", data);
          switch (data.title) {
            case "state":
              {
                _this.setState(data.description);
                break;
              }
            case "action":
              {
                console.log("received action");
                _this.softTrigger(data.description);
              }
          }
        } else {
          _this.emit("error", { name: "Invalid Password", data: data });
        }
        done();
      }));

      // start server
      var server = app.listen(app.get("port"), function () {});
    }
  }

  _inherits(IFTTT_These, _EventEmitter);

  _createClass(IFTTT_These, {
    ifThis: {

      /**
       * One-time if-this
       * @param  function bool Function which will evaluate true for a trigger.
       * @returns {Promise} Promise
       */

      value: function ifThis(bool) {
        var _this = this;

        var ifttt = this;
        return new Promise(function (resolve) {
          function onChange() {
            if (bool()) {
              resolve();
              ifttt.removeListener("change", onChange);
              ifttt.removeListener("action", onChange);
            }
          }
          _this.on("change", onChange);
          _this.on("action", onChange);
        });
      }
    },
    ifThisThen: {

      /**
       * Set up a condition for trigger
       * @param  function bool Function which will evaluate true for a trigger.
       */

      value: function ifThisThen(bool, callback) {
        var ifttt = this;
        function onChange() {
          if (bool()) {
            callback();
          }
        }
        this.on("change", onChange);
        this.on("action", onChange);
      }
    },
    softTrigger: {

      /**
       * Software trigger
       * @param  {String} action name of the trigger
       */

      value: function softTrigger(action) {
        var _this = this;

        if (!(action instanceof Array)) {
          action = [action];
        }
        action.forEach(function (item) {
          _this.attention[item] = true;
        });
        this.emit("action");
        this.attention = {};
      }
    },
    wasTriggered: {

      /**
       * Was Triggered
       * @param  {String} name Name of item to check if triggered
       * @return {bool}      true if the item was triggered.
       */

      value: function wasTriggered(name) {
        return this.attention.hasOwnProperty(name) && this.attention[name];
      }
    },
    setState: {

      /**
       * Set internal state
       * @param {Object} state State variables to modify.
       */

      value: function setState(state) {
        var itemChanged = false;
        for (var key in state) {
          if (!this.state.hasOwnProperty(key) || this.state[key] !== state[key]) {
            itemChanged = true;
            this.state[key] = state[key];
            this.attention[key] = true;
          } else {
            // only keep the items which have changed to emit the action.
            delete state[key];
          }
        }
        if (itemChanged) {
          this.emit("change", state);
          this.attention = {};
        }
      }
    },
    triggerPromise: {

      /**
       * Promise to send a trigger to the ifttt server 
       * @param  string eventName       the name of the trigger which will be 
       *                                specified by the Maker channel
       * @param  function argsFunction  function which will return an array of up to 
       *                                3 booleans, which will be maker values.
       * @return Promise              
       */

      value: function triggerPromise(eventName, argsFunction) {
        var ifttt = this;
        return function () {
          return new Promise(function (resolve, reject) {
            ifttt.trigger(eventName, argsFunction, resolve, reject);
          });
        };
      }
    },
    trigger: {
      /**
       * Send a trigger to the ifttt server 
       * @param  string eventName       the name of the trigger which will be 
       *                                specified by the Maker channel
       * @param  function argsFunction  function which will return an array of up to 
       *                                3 booleans, which will be maker values.
       */

      value: function trigger(eventName, argsFunction, callback, err) {
        var bodyObj = {};
        if (argsFunction) {
          var args = argsFunction();
          args.forEach(function (val, i) {
            bodyObj["value" + (i + 1)] = val;
          });
        }
        var options = {
          hostname: "maker.ifttt.com",
          port: 80,
          path: "/trigger/" + eventName + "/with/key/" + this.key,
          method: "POST",
          headers: {
            "Content-Type": "application/json" }
        };
        var req = http.request(options, function (res) {
          var s = "";
          res.on("data", function (d) {
            s += d.toString("utf8");
          });
          req.on("close", function () {
            if (callback) {
              callback(s);
            }
          });
        });
        req.on("error", function (e) {
          if (err) {
            err(e);
          }
        });
        var bodyString = JSON.stringify(bodyObj);
        req.write(bodyString);
        req.end();
      }
    },
    kill: {
      value: function kill() {
        this.destructor();
      }
    },
    destructor: {
      value: function destructor() {}
    }
  });

  return IFTTT_These;
})(EventEmitter);

module.exports = IFTTT_These;

// action only mode