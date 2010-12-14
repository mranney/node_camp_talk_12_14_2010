// Chat Server With Redis Sauce

var http = require("http"),
    fs = require("fs"),
    util = require("util"),
    redis = require("redis"), client,
    ws = require("websocket-server"),
    http_server, ws_server, favicon, client_js, client_html, start = Date.now(),
    clients = {};

favicon = fs.readFileSync("favicon.ico");
client_js = fs.readFileSync("chat_client.js");
client_html = fs.readFileSync("chat_client.html");

redis_client = redis.createClient();

function log_request(req) {
    var ua = req.headers["user-agent"] || "";

    redis_client.hincrby("url", req.url, 1);
    redis_client.hincrby("ip", req.connection.remoteAddress, 1);
    if (ua) {
        redis_client.hincrby("ua", ua, 1);
    }
    redis_client.publish("log", (Date.now() - start) + ", " + 
        req.connection.remoteAddress + " " + 
        req.url + " " + ua);
}

function serve_buffer(res, buf, type) {
    res.writeHead(200, {
        "Content-Type": type
    });
    res.end(buf);
}

function stats(res) {
    var ip, url, ua;

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    redis_client.hgetall("ip", function (err, reply) {
        ip = reply;
    });
    redis_client.hgetall("ua", function (err, reply) {
        ua = reply;
    });
    redis_client.hgetall("url", function (err, reply) {
        url = reply;
        res.end(JSON.stringify({
            ip: ip,
            url: url,
            ua: ua
        }));
    })
}

function image_file(res) {
    res.writeHead(200, {
        "Content-Type": "image/jpeg"
    });

    fs.createReadStream("anchor.jpg").pipe(res);
}

http_server = http.createServer(function (request, response) {
    log_request(request);

    if (request.url === "/favicon.ico") {
        serve_buffer(response, favicon, "image/x-icon");
    } else if (request.url === "/") {
        serve_buffer(response, client_html, "text/html");
    } else if (request.url === "/client.js") {
        serve_buffer(response, client_js, "application/javascript");
    } else if (request.url === "/stats") {
        stats(response);
    } else {
        image_file(response);
    }
});

function new_ws_client(conn) {
    var addr = conn._socket.remoteAddress + ":" + conn._socket.remotePort;

    redis_client.zadd("presence", Date.now(), addr);
    redis_client.publish("presence update", addr + " connected");
    
    conn.on("close", function () {
        closed_ws_client(addr);
    });
    
    conn.on("message", function (msg) {
        var obj = JSON.parse(msg);
        if (obj.op === "partial") {
            ws_server.broadcast(JSON.stringify({
                op: obj.op,
                text: obj.text,
                id: addr
            }));
        } else if (obj.op === "text message") {
            redis_client.lpush("messages_" + addr, obj.text);
            ws_server.broadcast(JSON.stringify({
                op: obj.op,
                text: obj.text,
                id: addr
            }));
        }
    });

    clients[addr] = true;
    ws_server.broadcast(JSON.stringify({
        op: "connected",
        id: addr
    }));
    
    Object.keys(clients).forEach(function (item) {
        conn.write(JSON.stringify({
            op: "connected",
            id: item
        }));
    });
}

function closed_ws_client(addr) {
    redis_client.zrem("presence", addr);
    redis_client.publish("presence update", addr + " disconnected");

    ws_server.broadcast(JSON.stringify({
        op: "disconnected",
        id: addr
    }));

    delete clients[addr];
}

ws_server = ws.createServer({
    server: http_server
});

ws_server.on("connection", new_ws_client);
ws_server.listen(4000);
