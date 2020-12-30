'use strict';

const log = require('@liugezhou-cli-dev/log')
const Package = require("@liugezhou-cli-dev/package")

const SETTINGS = {
   init:'@liugezhou-cli-dev/init'
}
function exec() {
   let targetPath = process.env.CLI_TARGET_PATH
   const homePath = process.env.CLI_HOME_PATH
   const cmdObj = arguments[arguments.length - 1]
   const cmdName = cmdObj.name
   const packageName = SETTINGS[cmdName]
   const packageVersion = 'latest'

   if(!targetPath){
      // 生成缓存路径
      targetPath = ' '
   }
   const pkg = new Package({
      targetPath,
      name:packageName,
      version:packageVersion
   });
   console.log('result:',pkg.getRootFilePath())
   // 1. targetPath -> modulePath
   // 2. modulePath -> Package(npm模块)
   // 3. Package.getRootFile(获取入口文件)
   // 4. Package.update / Package.install

   // 封装--复用
}

module.exports = exec;

