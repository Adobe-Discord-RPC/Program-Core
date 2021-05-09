// here is core
const version = "4.0-pre1";
const release_date = "2021-05-09";

// npm modules
const ejs = require('ejs');
const wait = require('waait');
const RPC = require('discord-rpc');
const ejsLint = require('ejs-lint');
const socketCL = require('socket.io-client');

// custom modules
const ps = require('./lib/core/ps');
const storage = require('./lib/localStorage');
const logger = require('./lib/logger');
const regedit = require('./lib/reg');

// variables
const PID = process.pid;
let regList, str, config, L, externalIO_Client; // 전역변수
let RPCInfo_Official, RPCInfo_Official_About, RPCInfo_Official_List; // 전역변수...이길 원했지만 안되는듯
let processNFms = 60000, rpcUPDATEms = 60000;

// global functions
/*const sleep = ms => {
    let start = new Date().getTime();
    while (new Date().getTime() < start + ms);
}*/ // 2021-01-15 성능 너무 먹어서 waait로 대체
const checkByName = async name => {
    let Info = await ps.lookUpPromise({command: name}); // process.pid, process.command (bin)
    if (isEmpty(Info)) {
        return {"result": "Fail", "Code": "ProcessNotfound(Info_1)", "Info": {}};
    }
    return {"result": "Success", "Code": "Success", "Info": {"PID": Info[0].pid, "bin": Info[0].command}};
}

const getTitleByPid = async pid => {
        let Info = undefined;
        try {
            Info = await ps.getTitlePromise(`(Get-Process -id ${pid} -ErrorAction SilentlyContinue).MainWindowTitle`);
            console.log(Info)
        } catch (err) {
            await L.error(err.stack || err);
            return {"result": "Fail", "Code": "UnexpectedError", "Info": {}};
        }
        if (Info === '') return {"result": "Fail", "Code": "ReturnedNone", "Info": {"Title": Info}};
        else return {"result": "Success", "Code": "Success", "Info": {"Title": Info}};
}
const isEmpty = obj => {
    for (let key in obj) if (obj.hasOwnProperty(key)) return false;
    return true;
}
const exit = async () => {
    await L.info('CP Exit.');
    process.exit(0);
}

/* DiscordRPC */
const client = new RPC.Client({transport: 'ipc'});

const update = async (details, state, startTimestamp, largeImg, smallImg) => {
    try {
        let res = await client.setActivity({
            details,
            state,
            startTimestamp,
            largeImageKey: largeImg.Key,
            largeImageText: largeImg.Text,
            smallImageKey: smallImg.Key,
            smallImageText: smallImg.Text,
            instance: false
        }, PID);
        return {"result": "Success", "Code": "Success", "Info": res};
    } catch (err) {
        return {"result": "Fail", "Code": err.toString(), "Info": {}}
    }
}

const destroy = async () => {
    client.clearActivity(PID).then(async () => {
        await L.info('RPC Destroyed');
        await exit();
    }).catch(async err => {
        await L.error("An unknown error occurred when Destroying RPC.");
        await L.error("Please restart your Discord to disconnect RPC.");
        await L.error(err.toString());
        await exit();
    });
}

const applyPlugin = async (Title, PGInfoReturned, PRTitle, WinTitle) => {
    try {
        /* 20210120 TODO :
         * 시간 없어서 자잘한 문제 나중에 처리
         * 불러올 모듈 코드 내에 정의로 일단 대처
         */
        let bin = PGInfoReturned.Info.bin.split(PRTitle)[1];
        //console.log(await ejsLint(Title, {bin, Title: PGInfoReturned.Info.Title}));
        return ejs.render(Title, {bin, Title: WinTitle});
    } catch (err) {
        await L.error("An unknown error occurred in applyPlugin()");
        await L.error(err.toString());
        return 'ERROR';
    }
}

const onConnected = async (startTimestamp, ProgramInfo, PGInfoReturned) => { // ProgramInfo가 설정 JSON임!!!
    let Loop = true;
    while (Loop) { // 2021-01-15 메모리 사용량 관계로 루프문으로 변경. 메모리 증가하는건 프로세스 죽이지 않는 이상 못막는듯
        try {
            WinTitle = await getTitleByPid(PGInfoReturned.Info.PID);
        } catch (err) {
            Loop = false;
            await L.error("An unknown error occurred when Checking Process.");
            await L.error(err.toString());
            await destroy();
        }

        if (Loop) {
            details = await applyPlugin(ProgramInfo.details, PGInfoReturned, ProgramInfo.PRTitle, WinTitle);
            state = await applyPlugin(ProgramInfo.state, PGInfoReturned, ProgramInfo.PRTitle, WinTitle);

            // 2021-03-11 RPC 텍스트 128자 제한 반영
            if (details.length > 120) details = details.slice(0, 120);
            if (state.length > 120) state = state.slice(0, 120);

            rpcRes = await update(details, state, startTimestamp, ProgramInfo.image.largeImg, ProgramInfo.image.smallImg);
            if (rpcRes.result !== "Success") {
                Loop = false;
                await L.error("An unknown error occurred when updating RPC.");
                await L.error(`CODE : ${rpcRes.Code}`);
                await destroy();
            } else {
                await L.log(`RPC Return : ${JSON.stringify(rpcRes.Info)}`);
                delete details;
                delete state;
                delete rpcRes;
                delete WinTitle;
                await wait(rpcUPDATEms); //sleep(5000);
                //continue;
            }
        }
    }
}

const discordLogin = async (ProgramInfo, PGInfo) => { // This is only a function because it makes it easier to retry
    let startTimestamp = new Date();
    await L.info(`Connecting to Discord with Client ${ProgramInfo.appID}...`);
    client.login({clientId: `${ProgramInfo.appID}`}).then(async () => {
        await L.info(`Connected to Discord with User ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
        externalIO_Client.send({
            type: 'connected_notification',
            info: {
                userInfo: `${client.user.username}#${client.user.discriminator}`,
                title: ProgramInfo.PRTitle,
                img_Url: `https://cdn.discordapp.com/avatars/${client.user.id}/${client.user.avatar}`
            }
        });
        onConnected(startTimestamp, ProgramInfo, PGInfo).catch(async err => {
            await L.error("An unknown error occurred in onConnected()");
            await L.error(err.toString());
            await destroy();
        });
    }).catch(async err => {
        if (err.toString() === "Error: Could not connect") {
            await L.error("Failed to connect to Discord. Is your Discord client open?");
            await L.error(err.toString());
            await exit();
        } else if (err.toString() === "Error: RPC_CONNECTION_TIMEOUT") {
            await L.error("Failed to connect to RPC. Please, restart your Discord.");
            await L.error(err.toString());
            await exit();
        } else {
            await L.error("An unknown error occurred when connecting to Discord.");
            await L.error(err.toString());
            await exit();
        }
    });
}

const onStarted = async () => {
    // Init
    regList = await regedit.list('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Adobe_Discord_RPC_NodePort');
    str = new storage(regList.InstallLocation.value);

    config = await str.get('Settings');
    L = new logger(regList.InstallLocation.value, `Core(${PID})`, config);

    // Logger Init
    let res = await L.init();
    if (!res) process.exit(1);

    /* Monitor <-> internal process (Core) */
    externalIO_Client = socketCL.io(`ws://localhost:${config.ws.Internal}`);
    externalIO_Client.on('connect_error', async () => {
        externalIO_Client.close();
        await L.error('Cannot connect to Monitor');
        await exit();
    });
    externalIO_Client.on('connect', async () => {
        RPCInfo_Official = await str.get('RPCInfo_Official');
        RPCInfo_Official_About = RPCInfo_Official[0];
        RPCInfo_Official_List = RPCInfo_Official[1];

        /* Program INIT */
        if (config.mode !== "Dev" && config.mode !== "Pub") {await L.error("Unknown setting value : mode."); await exit();}
        processNFms = config.reloadTick[config.mode].processNF; // 프로그램 미발견 시, 다시 시도하기까지의 쿨타임
        rpcUPDATEms = config.reloadTick[config.mode].updateRPC; // RPC 적용 이후 갱신 주기
        process.setMaxListeners(Infinity); // 2021-01-15 포기함...^^
        await L.info('[Core INFO]');
        await wait(3);
        await L.info(`Release : v${version} (${release_date})`);
        await L.info(`Runtime : ${process.version}`);
        await L.info(`PID : ${PID}`);
        await L.info(`PPID : ${process.ppid}`);
        await L.info(`Mode : ${config.mode}`);
        await L.info(`Delay : NF -> ${processNFms}ms, UD -> ${rpcUPDATEms}ms`);
        await wait(3);
        await L.log('');

        await init();
    });
}

const init = async () => {
    await L.info('[Core INIT]');
    let now_list = '';
    let out = false;
    let PGInfo = '';
    let loop = true;
    while (loop) { // 2021-01-20 대체 왜 init() 호출을 해놨던거지.. while로 변경
        for (const item of RPCInfo_Official_List) {
            for (const PGname of item.name) {
                await checkByName(PGname).then((list) => { // TODO 쉘 작업때문에 밀림현상 나중에 개선
                    if (list.result === "Success") {
                        PGInfo = list;
                        now_list = item;
                        out = true;
                    }
                });
                if (out) break;
            }
            if (out) break;
        }
        if (out) {
            loop = false;
            discordLogin(now_list, PGInfo);
            break;
        } else {
            await L.info('Process Not Found');
            await wait(3);
            await L.info(`Retry After ${processNFms}ms..`);
            await wait(processNFms) //sleep(processNFms);
            //continue;
        }
    }
}

onStarted();