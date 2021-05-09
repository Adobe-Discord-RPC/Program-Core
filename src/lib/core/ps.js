const psNode = require('ps-node');
const PowerShell = require("powershell");

module.exports.lookUpPromise = function (query) {
    return new Promise((resolve, reject) => {
        psNode.lookup(query, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

module.exports.getTitlePromise = function (query) {
    return new Promise((resolve, reject) => {
        let ps = new PowerShell(query);

        // Handle process errors (e.g. powershell not found)
        ps.on("error", err => {
            reject(err);
        });

        // Stdout
        ps.on("output", data => { // data is result
            resolve(data);
        });

        // Stderr
        ps.on("error-output", data => {
            reject(data);
        });
    });
};
