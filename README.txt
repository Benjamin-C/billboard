Ben's Billboard Software!

The base server is built on https://www.geeksforgeeks.org/how-to-create-https-server-with-node-js/
Slideshows are hosted by Google Slides
The rest has been written by Ben

To set up (on Linux, but similar methods should work on other OSes):
If you want the nodejs server to handle https, you will need to generate certificates by running
$ openssl req -nodes -new -x509 -keyout server.key -out server.cert
and changing the 

To use: Run 

Presets are stored in presets.json, and are loaded only at server boot