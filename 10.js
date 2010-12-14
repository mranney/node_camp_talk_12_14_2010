// Using Redis for stats and logging

var http = require("http"),
    fs = require("fs"),
    util = require("util"),
    client = require("redis").createClient(),
    server, favicon, start = Date.now();

favicon = fs.readFileSync("favicon.ico");

function log_request(req) {
    var ua = req.headers["user-agent"] || "";

    client.hincrby("url", req.url, 1);
    client.hincrby("ip", req.connection.remoteAddress, 1);
    if (ua) {
        client.hincrby("ua", ua, 1);
    }
    
    client.publish("log", (Date.now() - start) + ", " + 
        req.connection.remoteAddress + " " + 
        req.url + " " + ua);
}

function stats(res) {
    var ip, url, ua;

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    client.hgetall("ip", function (err, reply) {
        ip = reply;
    });
    client.hgetall("ua", function (err, reply) {
        ua = reply;
    });
    client.hgetall("url", function (err, reply) {
        url = reply;
        res.end(JSON.stringify({
            ip: ip,
            url: url,
            ua: ua
        }));
    })
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
    } else if (request.url === "/stats") {
        stats(response);
    } else {
        image_file(response);
    }
});

server.listen(9000);
