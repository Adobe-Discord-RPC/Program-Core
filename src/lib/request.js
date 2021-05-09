const request = require('request');

module.exports.getBuffer = function (URL) {
    return new Promise((resolve, reject) => {
        let options = {
            url: URL,
            method: 'get',
            encoding: null,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36'
            }
        };
        request(options, function (err, res, body) {
            if (err && res.statusCode !== 200) reject(err);
            resolve(body);
        });

    });
}

module.exports.getJson = function (URL) {
    return new Promise((resolve, reject) => {
        let options = {
            url: URL,
            method: 'get',
            encoding: 'utf-8',
            json: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'content-type': 'application/x-www-form-urlencoded'
            }
        };
        request(options, function (err, res, body) {
            if (err && res.statusCode !== 200) reject(err);
            resolve(body);
        });

    });
}