const Server = require('./Server');

//Can use for cookies or API keys
var permissions = {
    "12345" : READ + WRITE + UPDATE + DELETE,
    "54321" : READ
};

new Server.RESTdbServer(permissions).start();
//http://127.0.0.1:8081/?key=12345&query=SELECT%20*%20FROM%20users;
