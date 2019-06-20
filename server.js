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

// make the found webcam urls avaiable
function updateWebcamUrls() {
    app.get('/webcamurls', function (request, response) {
        response.send(webcamUrls);
    });
    setTimeout(updateWebcamUrls, 10 * 1000);
}
updateWebcamUrls();

const defaultPort = '80,8080';
let webcamUrls = [];
function startScanner() {
    console.log('scan started');
    // example range: 93.210.176.0/24, 87.97.166.87
    // my range: 87.169.162.0/24
    // full range: 87.160.0.0 - 87.186.159.255
    scanner('87.169.0.0/16', defaultPort).then(result => {
        webcamUrls = [];
        console.log('webserver found: http://' + result.ip + ':' + result.port + '/');
        // try connection
        request('http://' + result.ip + ':' + result.port + '/', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log('server: '+ (response.headers.server || 'no entry'));
                // check header for ip webcam
                if ((response.headers.server || '').toLowerCase().indexOf('ip webcam') >= 0) {
                    console.log('webcam found!');
                    console.log('http://' + result.ip + ':' + result.port + '/video');
                    // save url in results
                    webcamUrls.push('http://' + result.ip + ':' + result.port + '/video');
                }
            }
        });
    }).catch(error => {
        console.warn(error);
    })
    // rescan in 30 mins
    setTimeout(startScanner, 30 * 60 * 1000);
}
startScanner();

// evilscanner promise
function scanner(ip, port) {
    return new Promise(function (resolve, reject) {
        let scanner = new evilscan({
            target: ip,
            port: port,
            status: 'O', // Timeout, Refused, Open, Unreachable
            timeout: 5000,
            concurrency: 10,
            banner: true
        });

        scanner.on('result', function (data) {
            // fired when item is matching options
            resolve(data);
        });

        scanner.on('done', function () {
            console.log('range scanned');
        });

        scanner.on('error', function (err) {
            reject();
        });

        scanner.run();
    });
}
