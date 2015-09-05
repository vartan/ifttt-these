#ifttt-these

This package is middleware for IFTTT, allowing custom triggers and actions.

##Example Usage

### Initialize ifttt-these

Username and password are required for receiving triggers from the ifttt server; a key from the Maker channel is required for sending an action to the server.

    var ifttt = new IFTTT_These({
      username: "username",
      password: "password", 
      key:      "makerkey"
    });

### Create custom trigger middleware
Messages are received through the wordpress post action. There are two types of messages that we can receive. 

1. State changes - A state change will have the contents of the post as JSON. The internal state variable will be updated with the values from the JSON. Each top-level variable in the object will be triggered (see below).
2. Triggers. Any string that is not JSON is treated as a trigger, is a one-time shot.

####Example


For this example, I want to to get a phone call if I am late for work. Most of the work is going to be on the IFTTT side of things:

1. I set a date/time event for every weekday at 6:45, to do a wordpress post. The content for the post will be "TimeToLeave".
2. I set up a few events which keep track of where I am; for this example, I have two location events. When I leave home, I send `{location:"unknown"}`, and when I get home, send `{location: home}`.
3. I have a final event, when I send the trigger "Call", I trigger a phone call which will speak the first argument.


This is all of the code I need for the middleware.

    ifttt.ifThisThen(
      () => ifttt.wasTriggered("TimeToLeave") && ifttt.state.location !== "home",
      () => { ifttt.trigger("Call", ["Wake up you're late for work."]) }
    );

