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
const pkg = require('../package.json')
const log = require('@liugezhou-cli-dev/log')
const constant = require('./constant');
const pathExists = require('path-exists');
let args,config;

function core() {
    try{
        checkPkgVersion();
        checkNodeVersion() ;
        checkRoot();
        checkUserHome();
        checkInputArgs();
        checkEnv();
    }catch(e){
        log.error(e.message)
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