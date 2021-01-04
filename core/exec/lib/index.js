'use strict';

const path = require('path')
const log = require('@liugezhou-cli-dev/log')
const Package = require("@liugezhou-cli-dev/package")

const SETTINGS = {
   init: '@imooc-cli/init'
}
const CATCH_DIR = 'dependencies'

async function exec() {
   let targetPath = process.env.CLI_TARGET_PATH
   const homePath = process.env.CLI_HOME_PATH
   let storeDir ='';
   let pkg;
   log.verbose('targetPath', targetPath);
   log.verbose('homePath', homePath);
   const cmdObj = arguments[arguments.length - 1];
   const cmdName = cmdObj.name(); 
   const packageName = SETTINGS[cmdName];
   const packageVersion = 'latest';
   if(!targetPath){
      // 生成缓存路径
      targetPath = path.resolve(homePath,CATCH_DIR);
      storeDir = path.resolve(targetPath,'node_modules')
       pkg = new Package({
         targetPath,
         storeDir,
         packageName,
         packageVersion
      });
      if(await pkg.exists()){
         // 更新package
         console.log('更新package')
         await pkg.update();
      }else{
         // 安装package
         await pkg.install();
      }
   }else{
      pkg = new Package({
         targetPath,
         packageName,
         packageVersion
      });
      const rootFile = pkg.getRootFilePath()
      if(rootFile){
         //在当前进程中调用--> 要改造成在node的子进程中调用
         require(rootFile).call(null,Array.from(arguments));
      }
   }
  
   // 1. targetPath -> modulePath
   // 2. modulePath -> Package(npm模块)
   // 3. Package.getRootFile(获取入口文件)
   // 4. Package.update / Package.install

   // 封装--复用
}

module.exports = exec;

