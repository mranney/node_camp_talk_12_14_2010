// Using Redis for stats - demo.ranney.com

var http = require("http"),
    fs = require("fs"),
    util = require("util"),
    client = require("redis").createClient(),
    server, favicon;

favicon = fs.readFileSync("favicon.ico");

function log_request(req) {
    var ua = req.headers["user-agent"] || "";

    client.hincrby("url", req.url, 1);
    client.hincrby("ip", req.connection.remoteAddress, 1);
    if (ua) {
        client.hincrby("ua", ua, 1);
    }
}

function serve_icon(res, buf) {
    res.writeHead(200, {
        "Content-Type": "image/x-icon"
    });
    res.end(buf);
}

function image_file(res) {
    res.writeHead(200, {
        "Content-Type": "image/jpeg"
    });

    fs.createReadStream("anchor.jpg").pipe(res);
}

server = http.createServer(function (request, response) {
    log_request(request);

    if (request.url === "/favicon.ico") {
        serve_icon(response, favicon);
    } else {
        image_file(response);
    }
});

server.listen(9000);  // demo.ranney.com
