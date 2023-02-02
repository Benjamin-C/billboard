const http = require('http');
const fs = require('fs').promises;
var url  = require('url');

const hostname = '127.0.0.1';
const port = 3000;

var callbacks = new Map();
var id = 0;

function makePreset(text, color) {
    return {
        text: text,
        color: color
    };
}

presets = new Map();
presets.set("open", makePreset("Open", "green"))
presets.set("closed", makePreset("Closed", "red"))
presets.set("undefined", makePreset("!~UNDEF~!", "#FF00FF"))
presets.set("ben", makePreset("IT'S BEN TIME", "#FF8000"))

let status = presets.get("undefined")

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion() {
    readline.question('>', text => {
        parts = text.split(" ")
        cmd = parts[0]
        switch(cmd) {
        case "preset": {
            let ps = presets.get(parts[1]);
            sendUpdate(ps.text, ps.color);
        } break;
        case "set": {
            let color = [parts[1]];
            parts.splice(0, 2);
            sendUpdate(parts.join(" "), color);
        } break;
        case "reload": {
            reloadPages();
        } break;
        default: {
            console.log("You can't do that, try something else!");
        } break;
        }
        askQuestion();
    });
}

// Should probably close this sometime, but I don't
// readline.close();

askQuestion();

function sendUpdate(text, color) {
    callbacks.forEach(element => {
        element.res.setHeader("Content-Type", "text/plain");
        element.res.writeHead(200);
        status = {
            text: text,
            color: color
        }
        element.res.end(JSON.stringify(status));
        clearTimeout(element.timeout);
    });
    callbacks.clear();
    console.log("{" + color + "} " + text);
}

function reloadPages() {
    callbacks.forEach(element => {
        element.res.setHeader("Content-Type", "text/plain");
        element.res.writeHead(205);
        element.res.end("Reload now please!");
        clearTimeout(element.timeout);
    });
    callbacks.clear();
    console.log("Reloading pages");
}

function closeWaitingConnection(res, id) {
    res.setHeader("Content-Type", "text/plain");
    res.writeHead(100);
    res.end("Keep going! You got it!");
    callbacks.delete(id);
    console.log(callbacks);
}

const server = http.createServer((req, res) => {
    var url_parts = url.parse(req.url);
    // console.log(url_parts);
    console.log("Loading " + url_parts.pathname);
    switch(url_parts.pathname) {
        case "/": {
            fs.readFile(__dirname + "/client.html").then(contents => {
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(contents);
            });
        } break;
        case "/client.js": {
            fs.readFile(__dirname + "/client.js").then(contents => {
                res.setHeader("Content-Type", "text/javascript");
                res.writeHead(200);
                res.end(contents);
            });
        } break;
        case "/query": {
            let str = req.url;
            str = str.substring(str.indexOf("?") + 1);
            str = decodeURI(str)
            if(str.includes("first")) {
                res.end(JSON.stringify(status));
                console.log("First!")
            } else {
                let mid = id++;
                let cb = {
                    timeout: setTimeout(closeWaitingConnection, 30*1000, res, mid),
                    res: res,
                    id: mid
                }
                callbacks.set(mid, cb);
            }
            console.log("Got query request");
        } break;
        case "/control": {

            // get access to URLSearchParams object
            let str = req.url;
            str = str.substring(str.indexOf("?") + 1);
            str = decodeURI(str)

            let stuff = {
                text: "",
                color: ""
            }

            parts = str.split("&");
            parts.forEach(part => {
                ends = part.split("=")
                switch(ends[0]) {
                    case "text": {
                        stuff.text = ends[1];
                    } break;
                    case "color": {
                        if(ends[1].startsWith("0x")) {
                            stuff.color = "#" + ends[1].substring(2);
                        } else {
                            stuff.color = ends[1];
                        }
                    }
                }
            });

            sendUpdate(stuff.text, stuff.color);
            res.setHeader("Content-Type", "text/plain");
            res.writeHead(200);
            res.end("Done");
        } break;
        case "/favicon.ico": {
            // Explicitly state this returns a 404
        }
        default: {
            res.setHeader("Content-Type", "text/plain");
            res.writeHead(404);
            res.end("404 " + url_parts.pathname + " not found.");
        } break;
    }
    
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});