'use strict';

module.exports = core;

// require: js/json/node
// .js -> module.exports/exports
// .json ->通过JSON.parse对此文件进行解析，并输出一个对象。
// .node -> 它是 C++的一个插件(AddOns),实现原理是通过 process.dlopen去打开一个C++插件：实际开发基本不用
// 如果用require去加载txt文件：require也支持其它所有的任何文件，会默认通过js引擎进行解析，即将txt当成js解析
const pkg = require('../package.json');
const log = require('@liugezhou-cli-dev/log')
function core() {
    checkPkgVersion();
}
function checkPkgVersion(){
    log.notice('cli',pkg.version);
}
