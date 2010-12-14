// Talking to Redis from node

var client = require("redis").createClient();
    
client.set("some key", "A value with Unicode: ☕");
client.get("some key", function (err, reply) {
    // a wise user also checks for errors
    console.log("Reply: " + reply);
});

client.hmset("hash key", "prop1", "val1", "prop2", "val2");
client.hgetall("hash key", function (err, res) {
    console.log("Val: " + JSON.stringify(res));
});
