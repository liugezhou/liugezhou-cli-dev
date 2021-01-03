'use strict';

module.exports = core;

// require: js/json/node
// .js -> module.exports/exports
// .json ->通过JSON.parse对此文件进行解析，并输出一个对象。
// .node -> 它是 C++的一个插件(AddOns),实现原理是通过 process.dlopen去打开一个C++插件：实际开发基本不用
// 如果用require去加载txt文件：require也支持其它所有的任何文件，会默认通过js引擎进行解析，即将txt当成js解析
const path = require('path')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const ptahExists = require('path-exists').sync
const commander = require('commander');
const pkg = require('../package.json')
const log = require('@liugezhou-cli-dev/log')
const init = require('@liugezhou-cli-dev/init')
const exec = require('@liugezhou-cli-dev/exec')
const constant = require('./constant');
const pathExists = require('path-exists');

let args;
let  program = new commander.Command();

async function core() {
    try{
        await prepare();
        registerCommand();
    }catch(e){
        log.error(e.message)
        if(process.env.LOG_LEVEL === 'verbose'){
            log.error(e)
        }
    }
   
}

function checkPkgVersion(){
    log.notice('cli',pkg.version);
}

function checkNodeVersion(){
    // 第一步，获取当前Node版本号
    const currentVersion = process.version;
    const lowestVersion = constant.LOWEST_NODE_VERSION;
    // 第二步，比较最低版本号
   if(!semver.lt(lowestVersion, currentVersion)){
        throw new Error(colors.red(`liugezhou-cli 需要安装 v${lowestVersion}以上版本的node.js`))
   }
}

function checkRoot(){
    const rootCheck = require('root-check')
    rootCheck();
}

function checkUserHome(){
    if(!userHome || !ptahExists(userHome)){
        throw new Error(colors.red('当前登录用户主目录不存在'))
    }
}

function checkInputArgs(){
    const minimist = require('minimist')
    args = minimist(process.argv.slice(2))
   checkArgs()
}

function checkArgs(){
    if(args.debug){
        process.env.LOG_LEVEL='verbose'
    }else{
        process.env.LOG_LEVEL='info'
    }
    log.level = process.env.LOG_LEVEL
}

function checkEnv(){
    const dotenv = require('dotenv')
    const dotenvPath = path.resolve(userHome,'.env')
    if(pathExists(dotenvPath)){
         dotenv.config({
            path: dotenvPath
        })
    }
    createDefaultConfig()
    log.verbose('环境变量',process.env.CLI_HOME_PATH)
}

function createDefaultConfig(){
    const cliConfig = {
        home:userHome
    }
    if(process.env.CLI_HOME){
        cliConfig['cliHome'] = path.join(userHome,process.env.CLI_HOME)
    }else{
        cliConfig['cliHome'] = path.join(userHome,constant.DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome
    return cliConfig;
}

async function  checkGlobalUpdate(){
    // 1 获取当前版本号和模块名
    const currentVersion = pkg.version
    const npmName = pkg.name
    // 2 调用npm API，获取所有的版本号
    const { getNpmSemverVersion } = require('@liugezhou-cli-dev/get-npm-info')
    // 3 提取所有版本号，比对那些版本号是大于当前版本号的
    const lastVersion = await getNpmSemverVersion(currentVersion,npmName)
    // 4 获取最新的版本号，提示用户更新到该版本
    if(lastVersion && semver.gt(lastVersion,currentVersion)){
        log.warn('更新提示:',colors.yellow(`请手动更新${npmName}，当前版本：${currentVersion},最新版本为：${lastVersion}
          更新命令为: npm install -g ${npmName}）`))
    }

}

async function prepare(){
    checkPkgVersion();
    checkNodeVersion() ;
    checkRoot();
    checkUserHome();
    // checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
}
function  registerCommand(){
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d,--debug','是否开启调试模式',false)
        .option('-tp, --targetPath <targetPath>','是否指定本地调试文件路径','')

    program
        .command('init [projectName]')
        .option('-f, --force','是否强制初始化项目')
        .action(exec)

     // 开启debug模式
    program.on('option:debug',function(){
        if(program.debug){
            process.env.LOG_LEVEL='verbose'
        }else{
            process.env.LOG_LEVEL='info'
        }
        log.level = process.env.LOG_LEVEL
        log.verbose('debug')
    })

    //指定targetPath
    program.on('option:targetPath',function(){
        process.env.CLI_TARGET_PATH = program.targetPath 
    })
    // 对未知命令监听
    program.on('command:*',function(obj){
        const avaliabeCommands = program.commands.map(cmd => cmd.name())
        console.log(colors.red('未知的命令：'+obj[0]))
        if(avaliabeCommands.length > 0){
            console.log(colors.red('可用命令为：'+avaliabeCommands.join(',')))
        }
    })

    program.parse(process.argv);

    if(program.args && program.args.length < 1) {
        program.outputHelp();
        console.log()
    }
}