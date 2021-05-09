const path = require('path');
const regedit = require('regedit');
regedit.setExternalVBSLocation(path.join('C:', 'adrpc_vbs')); // pkg로 빌드하는 경우 필수항목

module.exports.list = function (keys) { // 짜피 받아올 key 한개임;;
    return new Promise((resolve, reject) => {
        regedit.list(keys, (err, result) => {
            if (err) reject(err);
            else resolve(result[keys].values);
        });
    });
};
