// nodejs module
const fs = require('fs');
const path = require('path');

// custom module
//const logger = require('./logger');

const toStoragePath = function (rootPath, storage) {
    let temp = ( storage + ".json").split('/');
    let tempPath = path.join(rootPath, 'data');
    for (let item of temp) {
        tempPath = path.join(tempPath, item);
    }
    return tempPath;
};

const isAvailableStorage = function (storagePath) {
    return new Promise((resolve, reject) => {
        fs.stat(storagePath, (err, result) => {
            if (err) {
                if (err.code === 'ENOENT') resolve(false); else reject(err);
            }
            else resolve(true);
        });
    });
}

module.exports = class {
    rootPath;
    constructor(rootPath) {
        this.rootPath = rootPath;
    }

    get = async (storage) => {
        let storagePath = toStoragePath(this.rootPath, storage);
        if (!(await isAvailableStorage(storagePath))) {
            //this.L.error('Unavailable Path'); // 뭐야 파일 없어도 이걸로 뜨는데? 이게 정상임
            //process.exit();
            return {};
        }
        if (!storagePath.endsWith('.json')) {
            //this.L.error('NOT JSON');
            return {};
        }
        try {
            delete require.cache[require.resolve(storagePath)];
            return require(storagePath);
        } catch (e) {
            //this.L.error(e);
            throw e;
        }
    }

    set = async (storage, SetObject) => {
        let storagePath = toStoragePath(this.rootPath, storage);
        if (!(await isAvailableStorage(storagePath))) return ''; //return this.L.error('ERR_CODE.STRUNEXIST');
        let text = JSON.stringify(SetObject);
        fs.unlink(storagePath, (err) => {
            if (err) throw err;
            else fs.writeFile(storagePath, text, (err) => {
                if (err) throw err;
                //this.L.info('Set');
            });
        });
        return Error.NONE;
    }

    append = async (storage, appendObject) => {
        let storagePath = toStoragePath(this.rootPath, storage);
        if (!(await isAvailableStorage(storagePath))) return ''; //return this.L.error('ERR_CODE.STRUNEXIST');
        let tempObject = get(storage);
        tempObject = Object.assign(tempObject, appendObject);
        set(storage, tempObject);
        return Error.NONE;
    }

    create = async (storage) => {
        let storagePath = toStoragePath(this.rootPath, storage);
        if (await isAvailableStorage(storagePath)) return ''; //return this.L.error('ERR_CODE.STRCREATED');
        else {
            if (storage.indexOf('\\') !== -1 || storage.indexOf('/') !== -1) return;
            let emptyObject = {};
            fs.writeFile(storagePath, emptyObject.toString(), (err) => {
                // if (err) return console.log(ERR_CODE.STRCREATEFAIL));
                if (err) throw err;
                //this.L.info('Created');
            });
        }
        return Error.NONE;
    }

    remove = async (storage) => {
        let storagePath = toStoragePath(this.rootPath, storage);
        if (!(await isAvailableStorage(storagePath))) return ''; //return this.L.error('ERR_CODE.STRUNEXIST');
        else fs.unlink(storagePath, (err) => {
            if (err) throw err;
            //this.L.info('Deleted');
        });
        return Error.NONE;
    }
}