// nodejs module
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const colors = require('colors');

// 스토리지 관리
const checkDIR = async folder => { // 폴더 있는지 확인하고 없으면 생성
    if (fs.existsSync(folder)) {
        return {result: "Success", code: "Exist"};
    } else {
        try {
            fs.mkdirSync(folder);
            return {result: "Success", code: "Created"};
        } catch (e) {
            return {result: "Fail", code: e.toString()};
        }
    }
}

const checkFile = async DIR => { // 파일 있는지 확인하고 없으면 생성
    try {
        fs.statSync(DIR);
        return {result: "Success", code: "Exist"};
    } catch (err) {
        if (err.code === 'ENOENT') {
            try {
                fs.writeFileSync(DIR, '\n', 'utf8');
                return {result: "Success", code: "Created"};
            } catch (e) {
                return {result: "Fail", code: e.toString()};
            }
        } else {
            return {result: "Fail", code: err.toString()};
        }
    }
}

// 로그 저장
const saveLog = async (root, config, destination, message) => {
    try {
        destination = destination.split('(', 1)[0];
    } catch {
        //
    }

    let fileList = config.log.list;
    let filename;
    switch (destination) {
        case "Installer":
            filename = fileList.installer;
            break;
        case "Monitor":
            filename = fileList.monitor;
            break;
        case "sysInf":
            filename = fileList.sysInf;
            break;
        case "Core":
            filename = fileList.core;
            break;
        case "Configurator":
            filename = fileList.configurator;
            break;
        default:
            filename = fileList.unknown;
            break;
    }

    await fs.appendFile(path.join(root, config.log.save_fd, filename), `${message}\n`, err => {
        if (err) throw err;
    });
}

// 외부 함수
module.exports = class {
    root;
    config;
    destination;
    constructor(root, destination, config) {
        this.root = root;
        this.destination = destination;
        this.config = config;
    }
    async checkFile (folder, filename) { // Configurator Only : 파일 있는지 확인
        try {
            let stats = fs.statSync(path.join(this.root, folder, filename));
            return {result: "Success", code: "Exist", size: stats.size};
        } catch (err) {
            if (err.code === 'ENOENT') {
                return {result: "Success", code: "ENOENT", size: '0'};
            } else {
                return {result: "Fail", code: err.toString(), size: '0'};
            }
        }
    }
    async delFile (folder, filename) { // Configurator Only : 파일 삭제
        try {
            fs.unlinkSync(path.join(this.root, folder, filename));
            return {result: "Success", code: "Success"};
        } catch (err) {
            return {result: "Fail", code: err.toString()};
        }
    }
    async init() {
        let res1 = await checkDIR(path.join(this.root, this.config.log.save_fd));
        if (res1.result === "Fail") {
            return false;
        }

        let res2 = true;
        for (let [key, target] of Object.entries(this.config.log.list)) {
             let completed = await checkFile(path.join(this.root, this.config.log.save_fd, target), target);
             if (completed.result === "Fail") {
                 res2 = false;
             }
        }
        return res2;
    }
    getHeader(color) {
        return color ? colors.green(`<${moment().format('YYYY-MM-DD || HH:mm:ss')}>`) : `<${moment().format('YYYY-MM-DD || HH:mm:ss')}>`;
    }
    async log(message) {
        const content = `${this.getHeader(true)} [LOG] ${this.destination} >> `;
        process.stdout.write(content);
        console.log(message.replace(/[^\x00-\x7F]/g, ""));
        await saveLog(this.root, this.config, this.destination, this.getHeader(false)+` [LOG] ${this.destination} >> `+message).catch(e => {
            throw e;
        });
    }
    async info(message) {
        const header = `${this.getHeader(true)} ${colors.cyan(`[INFO] ${this.destination} >>`)}`;
        const content = colors.cyan(` ${message}`);
        await console.log((header + content).replace(/[^\x00-\x7F]/g, ""));
        await saveLog(this.root, this.config, this.destination, this.getHeader(false)+` [INFO] ${this.destination} >> `+message).catch(e => {
            throw e;
        });
    }
    async warn(message) {
        const header = `${this.getHeader(true)} ${colors.yellow(`[WARN] ${this.destination} >>`)}`;
        const content = colors.yellow(` ${message}`);
        console.log((header + content).replace(/[^\x00-\x7F]/g, ""));
        await saveLog(this.root, this.config, this.destination, this.getHeader(false)+` [WARN] ${this.destination} >> `+message).catch(e => {
            throw e;
        });
    }
    async error(message) {
        const header = `${this.getHeader(true)} ${colors.red(`[ERROR] ${this.destination} >>`)}`;
        const content = colors.red(` ${message}`);
        console.log((header + content).replace(/[^\x00-\x7F]/g, ""));
        await saveLog(this.root, this.config, this.destination, this.getHeader(false)+` [ERROR] ${this.destination} >> `+message).catch(e => {
            throw e;
        });
    }
}