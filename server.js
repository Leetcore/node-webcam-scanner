// init project
const request = require('request');
const express = require('express');
const { parse } = require('node-html-parser');
const fs = require('fs');

const app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

// listen for requests :)
const listener = app.listen(process.env.PORT || '1337', function () {
    console.log('Your app is listening on port ' + listener.address().port);
});

// make the found webcam urls available
app.get('/webcamurls', function (request, response) {
    response.send(webcamUrls);
});

let webcamUrls = [];

// starte the scanner
async function startScanner() {
    console.log('scan started');

    webcamUrls = [];

    require('fs').readFileSync('found.txt').toString().split('\n').forEach(function (line) {
        if (line.length > 0) {
            webcamUrls.push(line);
        } 
    });

    var ip = require('fs').readFileSync('status.txt').toString();
    var oct1start = 1;
    var oct2start = 1;
    var oct3start = 1;
    var oct4start = 1;
    try {
        var ip_split = ip.split('.');
        oct1start = ip_split[0];
        oct2start = ip_split[1];
        oct3start = ip_split[2];
        oct4start = ip_split[3];
        console.log('resume ip scan');
    } catch (error) {
        console.warn('last ip read error');
    }

    // example range: 93.210.176.0/24, 87.97.166.87
    // my range: 87.169.162.0/24
    // full range: 87.160.0.0 - 87.186.159.255

    // IPv4 scan
    // const scanRange = '0.0.0.0/32';
    // console.log('scan range: '+ scanRange)
    // await scanner(scanRange, defaultPorts).catch(error => {
    //     console.warn(error);
    // });

    for (var oct1 = oct1start; oct1 < 253; oct1++) {
        for (var oct2 = oct2start; oct2 < 253; oct2++) {
            for (var oct3 = oct3start; oct3 < 253; oct3++) {
                for (var oct4 = oct4start; oct4 < 253; oct4++) {
                    const ip = oct1+'.'+oct2+'.'+oct3+'.'+oct4;
                    if (oct4 % 10 == 0) {
                        await checkConnection(ip, 80).catch(error => {
                            // nothing
                        });
                    } else {
                        checkConnection(ip, 80).catch(error => {
                            // nothing
                        });
                    }
                    checkConnection(ip, 8080).catch(error => {
                        // nothing
                    });
                    checkConnection(ip, 8081).catch(error => {
                        // nothing
                    });
                    require('fs').writeFile('status.txt', ip, function(error) {
                        if (error) {
                            console.log('Write error');
                        }
                    });
                }
                oct4start = 1
            }
            oct3start = 1
        }
        oct2start = 1
    }

    // restart scan
    oct1start = 1;
    oct2start = 1;
    oct3start = 1;
    oct4start = 1;
    setTimeout(startScanner, 120 * 60 * 1000);
}
startScanner();

function checkConnection(ip, port) {
    return new Promise(function(resolve, reject) {
        // try connection
        console.log('try '+ ip);
        request({
            url: 'http://' + ip + ':' + port + '/',
            timeout: 1500
        }, function (error, response) {
            if (error) {
                reject();
            }

            if (!error && response.statusCode == 200) {
                const document = parse(response.body);
                const output = [];
    
                const title = document.querySelector('title');
                const inputform = document.querySelectorAll('input[type="password"]');
    
                output.push('webserver found: http://' + ip + ':' + port + '/ ');
                output.push('server header: '+ (response.headers.server || 'no entry'));
                output.push('title: '+ title);
                if (inputform) {
                    output.push('login: true!');
                }
    
                const fullmessage = output.join(', ');
    
                console.log(fullmessage);

                // write ip in file
                fs.appendFile('log.txt', fullmessage + '\n', function (err) {
                    if (err) throw err;
                });
    
                // check header for ip webcam
                if ((response.headers.server || '').toLowerCase().indexOf('ip webcam') >= 0) {
                    const videoUrl = 'http://' + ip + ':' + port + '/video';
                    console.log('>>> ip webcam found! :' + url);
    
                    // list with "webcam urls"
                    fs.appendFile('found.txt', videoUrl + '\n', function (err) {
                        if (err) throw err;
                    });
    
                    // save url in results
                    webcamUrls.push(videoUrl);
                }
            }
            resolve();
        });
    });
}
