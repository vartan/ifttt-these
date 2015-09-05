#ifttt-these

This package is middleware for IFTTT, allowing custom triggers and actions. 

This package is under development, but should work as-is. If you have any suggestions on better terminologies/function names, please let me know!

# Installing ifttt-these
Run `npm install ifttt-these`

# Initialize ifttt-these

Username and password are required for receiving triggers from the ifttt server; a key from the Maker channel is required for sending an action to the server.

    var IFTTT_These = require("ifttt-these");
    var ifttt = new IFTTT_These({
      username: "username",
      password: "password", 
      key:      "makerkey"
    });

# Create custom trigger middleware
Messages are received through the wordpress post action. There are two types of messages that we can receive. 
##Receiving
1. State changes - A state change will have the contents of the post as JSON. The internal state variable will be updated with the values from the JSON. Each top-level variable in the object will be triggered (see below).
2. receiving triggers - Any string that is not JSON is treated as a trigger, which is a one-time shot.

##Example


For this example, I want to to get a phone call if I am late for work. Most of the work is going to be on the IFTTT side of things:

1. I set a date/time event for every weekday at 6:45, to do a wordpress post. The content for the post will be "TimeToLeave".
2. I set up a few events which keep track of where I am; for this example, I have two location events. When I leave home, I send `{location:"unknown"}`, and when I get home, send `{location: home}`.
3. I have a final event, when I send the trigger "Call", I trigger a phone call which will speak the first argument.


This is all of the code I need for the middleware.

    ifttt.ifThisThen(
      function() { return ifttt.wasTriggered("TimeToLeave") && ifttt.state.location !== "home"; },
      function() { 
        ifttt.trigger("Call", ["Wake up you're late for work."]) 
    });

##Functions

###softTrigger(string)

    /**
     * Software trigger
     * @param  {String} action name of the trigger
     */
    

##ifThis(bool()) 

    /**
     * One-time if-this
     * @param  {function} bool Function which will evaluate true for a trigger.
     * @returns {Promise} Promise
     */

##ifThisThen(bool(), callback())
    /**
     * Set up a condition for trigger
     * @param  {function} bool Function which will evaluate true for a trigger.
     */
##wasTriggered(string)

    /**
     * Was Triggered
     * @param  {String} name Name of item to check if triggered
     * @return {bool}      true if the item was triggered.
     */
  
##setState(Object)
    /**
     * Set internal state
     * @param {Object} state State variables to modify.
     */


##trigger(eventName, argsFunction)

    /**
     * Send a trigger to the ifttt server 
     * @param  string eventName       the name of the trigger which will be 
     *                                specified by the Maker channel
     * @param  function argsFunction  function which will return an array of up to 
     *                                3 booleans, which will be maker values.
     * @return Promise              
     */
