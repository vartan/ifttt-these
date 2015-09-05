import IFTTT_Middleware from "./ifttt-action.js";

var ifttt = new IFTTT_Middleware({
  username: "vartan",
  password: "testpw"
});
ifttt.$if(()=>ifttt.state.test).then(() => {
  console.log("triggered.");
})

