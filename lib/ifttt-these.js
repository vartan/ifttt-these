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
      var app = express();
      app.set("port", settings.port || process.env.PORT || 1337);
      app.use(webhook(function (data, done) {
        if (data.username === settings.username && data.password === settings.password) {
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
      var server = app.listen(app.get("port"), function () {});
    }
  }

  _inherits(IFTTT_These, _EventEmitter);

  _createClass(IFTTT_These, {
    ifThis: {
      value: function ifThis(bool) {
        var _this = this;

        return new Promise(function (resolve) {
          function onChange() {
            if (bool()) {
              resolve();
            }
          }
          _this.on("change", onChange);
          _this.on("action", onChange);
        });
      }
    },
    softTrigger: {
      value: function softTrigger(action) {
        var _this = this;

        if (!(action instanceof Array)) {
          action = [action];
        }
        action.forEach(function (item) {
          _this.attention[item] = true;
        });
        this.emit("action");
        action.forEach(function (item) {
          _this.attention[item] = false;
        });
      }
    },
    setState: {
      value: function setState(state) {
        var itemChanged = false;
        for (var key in state) {
          if (!this.state.hasOwnProperty(key) || this.state[key] !== state[key]) {
            itemChanged = true;
            this.state[key] = state[key];
            this.attention[key] = true;
          } else {
            delete state[key];
          }
        }
        if (itemChanged) {
          this.emit("change", state);
          for (var key in state) {
            this.attention[key] = false;
          }
        }
      }
    },
    trigger: {
      value: function trigger(eventName, argsFunction) {
        var _this = this;
        return function () {
          return new Promise(function (resolve, reject) {
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
              path: "/trigger/" + eventName + "/with/key/" + _this.key,
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
                resolve(s);
              });
            });
            req.on("error", function () {
              reject();
            });
            var bodyString = JSON.stringify(bodyObj);
            req.write(bodyString);
            req.end();
          });
        };
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