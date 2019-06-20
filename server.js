// init project
const evilscan = require('evilscan');
const request = require('request');
const express = require('express');
const app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

// listen for requests :)
const listener = app.listen('1337' || process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});

// make the found webcam urls available
function updateWebcamUrls() {
    app.get('/webcamurls', function (request, response) {
        response.send(webcamUrls);
    });
    setTimeout(updateWebcamUrls, 10 * 1000);
}
updateWebcamUrls();

const defaultPorts = '80,8080';
let webcamUrls = [];

// starte the scanner
async function startScanner() {
    console.log('scan started');
    webcamUrls = [];
    // example range: 93.210.176.0/24, 87.97.166.87
    // my range: 87.169.162.0/24
    // full range: 87.160.0.0 - 87.186.159.255
    for (var oct2 = 1; oct2 < 255; oct2++) {
        for (var oct3 = 1; oct3 < 255; oct3++) {
            const scanRange = '87.'+ oct2 +'.'+ oct3 +'.0/24';
            console.log('scan range: '+ scanRange)
            await scanner(scanRange, defaultPorts).catch(error => {
                console.warn(error);
            });
        }
    }
    // rescan in 30 mins
    setTimeout(startScanner, 6 * 60 * 60 * 1000);
}
startScanner();

// evilscanner promise
function scanner(ip, port) {
    return new Promise(function (resolve, reject) {
        let scanner = new evilscan({
            target: ip,
            port: port,
            status: 'O', // Timeout, Refused, Open, Unreachable
            timeout: 3000
        });

        scanner.on('result', function (data) {
            // try to connect with the service
            checkConnection(data);
        });

        scanner.on('done', function () {
            resolve();
        });

        scanner.on('error', function (err) {
            reject();
        });

        scanner.run();
    });
}

function checkConnection(result) {
    const ip = result.ip;
    const port = result.port;
    
    // try connection
    request('http://' + ip + ':' + port + '/', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('webserver found: http://' + ip + ':' + port + '/');
            console.log('server header: '+ (response.headers.server || 'no entry'));
            // check header for ip webcam
            if ((response.headers.server || '').toLowerCase().indexOf('ip webcam') >= 0) {
                console.log('ip webcam found!');
                console.log('http://' + ip + ':' + port + '/video');
                // save url in results
                webcamUrls.push('http://' + ip + ':' + port + '/video');
            }
        }
    });
}
