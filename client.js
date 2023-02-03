// https://www.geeksforgeeks.org/how-to-create-https-server-with-node-js/

let i = 0

const openOBJ = {
    text: 'Open',
    color: "green",
};
const closedOBJ = {
    text: 'Closed',
    color: "red",
};
const undefOBJ = {
    text: 'Undefined',
    color: "magenta",
};
let options = [openOBJ, closedOBJ, undefOBJ]

let first = true;

let onTimeOut = false;

let slidetime = 30;
let slideurl = "";

function doHTTPQuery() {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if(xmlHttp.readyState == 4) {
            switch(xmlHttp.status) {
            case 200: {
                console.log("Got " + xmlHttp.responseText);
                let stuff = JSON.parse(xmlHttp.responseText);
                if(stuff.text !== undefined) {
                    document.getElementById("status").innerHTML = stuff.text;
                }
                if(stuff.color !== undefined) {
                    document.getElementById("status").style.backgroundColor = stuff.color;
                }
                let specifiedSlides = false
                if(stuff.url !== undefined) {
                    slideurl = stuff.url.substring(0, (stuff.url+"?").indexOf("?"));
                    specifiedSlides = true;
                    "https://docs.google.com/presentation/d/e/2PACX-1vQW-Lm85oecExAQiwELQTzh71xCnSUP7uxgSFhEyeLz2HX_fx_imgwClatnkDhIAhqJ5lp9FDqyk_xM/embed?start=true&loop=true&delayms=10000&rm=minimal"
                }
                if(stuff.time !== undefined) {
                    slidetime = stuff.time
                    specifiedSlides = true;
                }
                if(specifiedSlides) {
                    // document.getElementById('slideframe').contentWindow.location.reload();
                    let newSrc = slideurl + "?start=true&loop=true&delayms=" + slidetime + "000&rm=minimal"
                    console.log(newSrc)
                    if(document.getElementById("slideframe").src != newSrc) {
                        document.getElementById("slideframe").src = newSrc;
                        console.log("Updated iframe")
                    } else {
                        console.log("No change to slide URL");
                    }
                }
                console.log("Did something I think? Maybe?");
            } break;
            case 205: {
                location.reload();
            } break;
            case 100: {
                console.log("nothing");
            } break;
            case 0: {
                // nothing, don't do anything!
            } break;
            default: {
                console.log("Error on HTTP response " + xmlHttp.status);
                if(!this.ontimeout) {
                    setTimeout(() => {onTimeout = truel; doHTTPQuery();}, 10000) // wait 10 seconds before trying again
                } else {
                    console.log("On timeout, not retrying");
                }
            }
            }
            if(!this.ontimeout) {
                doHTTPQuery();
            }
        }
    }

    let commandURL = location.href;
    commandURL = commandURL.substring(0, commandURL.lastIndexOf("/")) + "/query";
    xmlHttp.open("GET", commandURL + ((first) ? "?first" : ""), true); // true for asynchronous 
    first = false
    xmlHttp.send(null);
}

window.onload = (event) =>{
    console.log('Page Loaded');
    // setInterval(nextStep, 3000);
    doHTTPQuery();
};