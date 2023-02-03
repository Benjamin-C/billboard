// Wether to use HTTP or HTTPS. HTTP is not implemented yet
const useHTTPS = true

// Hash secrets
const crypto = require("crypto")

// Requiring in-built https for creating https server
if(useHTTPS) {
    var https = require("https");
} else {
    var http = require("http")
}
// The port to host the server on
const port = 3000;

// Express for handling GET and POST request
const express = require("express");
const app = express();

// Requiring file system to use local files
const fs = require("fs");

// Load key and certificate for SSL
if(useHTTPS) {
    var options = {
        key: fs.readFileSync("server_ben.key"),
        cert: fs.readFileSync("server_ben.cert"),
    };
}

// Parsing the form of body to take input from forms
const bodyParser = require("body-parser");
// Configuring express to use body-parser as middle-ware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// The current secret's hash
let mySecretHash = "";
fs.readFile(__dirname + "/secret.txt", 'utf8', function(err, data){
    mySecretHash = data;
    console.log("Loaded secret hash");
});

// Hash the secret, uses the salt "salt" if salt is not specified
function hashSecret(password, salt) {
    if(password === undefined) {
        return undefined;
    }
    if(salt === undefined) {
        salt = "salt";
    }
    return crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`); 
}

// Reads a file from the filesystem and returns it as the response to an HTTP request
function returnFile(res, name, type) {
    fs.readFile(__dirname + name, 'utf8', function(err, data){
        res.setHeader("Content-Type", type);
        res.writeHead(200);
        res.end(data);
    });
}

// Returns some text as the the response to an HTTP request 
function returnText(res, text) {
    res.setHeader("Content-Type", "text/plain");
    res.writeHead(200);
    res.end(text);
}

// Handle whitelisted files
app.get("/", function (req, res) { returnFile(res, "/client.html", "text/html"); });
app.get("/style.css", function (req, res) { returnFile(res, "/style.css", "text/css"); });
app.get("/client.js", function (req, res) { returnFile(res, "/client.js", "text/javascript"); });
app.get("/control.js", function (req, res) { returnFile(res, "/control.js", "text/javascript"); });
app.get("/control", function (req, res) { returnFile(res, "/control.html", "text/html"); });

// Get queried about the state of the billboards.
// Keeps connections open for 30 seconds, or until updates occur, whichever happens first
app.get("/query", function (req, res) {
    let str = req.url;
    str = str.substring(str.indexOf("?") + 1);
    str = decodeURI(str)
    if(str.includes("first")) {
        res.end(JSON.stringify(status));
        console.log("First!")
    } else {
        let mid = nextCallbackID++;
        let cb = {
            timeout: setTimeout(closeWaitingConnection, 30*1000, res, mid),
            res: res,
            id: mid
        }
        callbacks.set(mid, cb);
        console.log(callbacks.size)
    }
    console.log("Got query request");
});

// Handle control commands
app.post("/command", function (req, res) {
    console.log("Got form control commands")
    // Logging the form body, but removing secrets
    let secret = req.body.secret
    if(secret !== undefined && secret.length > 0) { req.body.secret = "[redacted]"; }
    let newsecret = req.body.newsecret
    if(newsecret !== undefined && newsecret.length > 0) { req.body.newsecret = "[redacted]"; }
    let confirmsecret = req.body.confirmsecret
    if(confirmsecret !== undefined && confirmsecret.length > 0) { req.body.confirmsecret = "[redacted]"; }
    console.log(req.body);

    // Check if the request is authorized
    if(hashSecret(secret) !== mySecretHash) {
        returnText(res, "Unauthorized");
        if(req.body.mode == "admin") {
            // If we were trying to do a secret change, log the hash of the attempted new secret
            // which can be placed into secret.txt to set the secret to that at the next boot
            console.log("An unauthorized attempt was made to change the secret");
            if(newsecret !== undefined) {
                console.log("The hash of the attempted new secret is");
                console.log(hashSecret(newsecret))
            }
        }
        return;
    }

    // Handle billboard reload requests
    if(req.body.reload !== undefined && req.body.reload.length > 0) {
        if(req.body.reload == "true") {
            reloadPages();
            returnText(res, "Reloaded other pages");
            return;
        }
    }

    // Handle all other commands
    if(req.body.mode !== undefined) {
        switch(req.body.mode) {
        case "preset": { // Load an existing preset
            let pst = presets.get(req.body.preset)
            if(pst !== undefined) {
                updateStatus(pst);
                sendUpdate();
                returnText(res, "Set preset \"" + req.body.preset + "\"");
            } else {
                returnText(res, "Invalid preset \"" + req.body.preset + "\"");
            }
        } break;
        case "manual": {
            let hasText    = req.body.text    !== undefined && req.body.text.length    > 0;
            let hasColor   = req.body.color   !== undefined && req.body.color.length   > 0;
            let updatedText = false;
            let updatedColor = false;
            if(hasText) {
                status.text = req.body.text;
                updatedText = true;
            }
            if(hasColor) {
                status.color = req.body.color;
                updatedColor = true;
            }
            sendUpdate();
            returnText(res, "Updated " + ((updatedText) ? "text " : "") + ((updatedText && updatedColor) ? "and " : "") + ((updatedColor) ? "color" : ""));
        } break;
        case "slideshow": {
            console.log("Set new slideshow")
            if(req.body.slideshow !== undefined) {
                status.url = req.body.slideshow;
            }
            if(req.body.slideshowtime !== undefined) {
                status.time = req.body.slideshowtime;
            }
            sendUpdate();
            returnText(res, "Updated slideshow");
        } break;
        case "tests": {
            if(req.body.message !== undefined && req.body.message.length > 0) {
                returnText(res, "You said " + req.body.message);
            } else {
                returnText(res, "No message specified");
            }
        } break;
        case "getpresets": {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify(Array.from(presets.keys())));
        } break;
        case "admin": {
            if(newsecret !== undefined && confirmsecret !== undefined) {
                let ns = newsecret;
                if(ns != confirmsecret) {
                    returnText(res, "Secrets do not match");
                    break;
                }
                if(ns.length < 8) {
                    returnText(res, "Secret must be at least 8 characters");
                    break;
                }
            } else {
                returnText(res, "You need to specify a new secret and confirm it");
                break;
            }
        
            let myNewSecretHash = hashSecret(newsecret);
        
            fs.writeFile(__dirname + "/secret.txt", myNewSecretHash, function(err) {
                if(err) {
                    returnText(res, "There was an error saving the secret");
                    console.log("Error saving secret");
                    console.log(err)
                } else {
                    mySecretHash = myNewSecretHash;
                    console.log("Secret updated");
                    returnText(res, "Secret changed");
                }
            });
        } break;
        default: {
            returnText(res, "No mode selected");
        }
        }
    }
});

// console.log(JSON.stringify(Object.fromEntries(value)))
let presets = new Map(Object.entries(JSON.parse(fs.readFileSync("presets.json"))))
let status = presets.get("undef")
  
// Creating https server by passing options and app object
if(useHTTPS) {
    https.createServer(options, app).listen(port, function (req, res) { console.log("Server started at port " + port); });
} else {
    app.listen(port, function (req, res) { console.log("Server started at port " + port); });
}
// Callbacks that are currently open
var callbacks = new Map();
var nextCallbackID = 0;

// Update the current status variable with what is contained in the newstatus variable keeping everything else
function updateStatus(newStatus) {
    if(newStatus.text !== undefined) {
        status.text = newStatus.text;
    }
    if(newStatus.color !== undefined) {
        status.color = newStatus.color;
    }
    if(newStatus.url !== undefined) {
        status.url = newStatus.url;
    }
    if(newStatus.time !== undefined) {
        status.time = newStatus.time;
    }
}

// Send updates to all clients
function sendUpdate() {
    callbacks.forEach(element => {
        element.res.setHeader("Content-Type", "text/plain");
        element.res.writeHead(200);
        element.res.end(JSON.stringify(status));
        clearTimeout(element.timeout);
    });
    callbacks.clear();
    console.log("Sent update");
}

// Ask all clients to reload
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

// End an existing connection so it doesn't time out and the client will ask again
function closeWaitingConnection(res, id) {
    res.setHeader("Content-Type", "text/plain");
    res.writeHead(100);
    res.end("Keep going! You got it!");
    callbacks.delete(id);
}