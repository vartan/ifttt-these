"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var IFTTT_Middleware = _interopRequire(require("./ifttt-action.js"));

var ifttt = new IFTTT_Middleware({
  username: "vartan",
  password: "testpw"
});
ifttt.$if(function () {
  return ifttt.state.test;
}).then(function () {
  console.log("triggered.");
});