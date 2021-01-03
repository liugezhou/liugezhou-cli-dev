'use strict';

const pkgDir = require('pkg-dir').sync;
const path = require('path');
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;
const fse = require('fs-extra');
const { isObject }  = require('@liugezhou-cli-dev/utils');
const formatPath  = require('@liugezhou-cli-dev/format-path');
const {getDefaultRegistry,getNpmLatestVersion}  = require('@liugezhou-cli-dev/get-npm-info');
class Package  {
    constructor(options){
        if( !options){
            throw new Error('Package类的options参数不能为空！')
        }
        if( !isObject(options) ){
            throw new Error('Package类的options参数必须为对象！')
        }
        //package的目标路径
        this.targetPath = options.targetPath;
        //package的缓存路径
        this.storeDir = options.storeDir ; 
        //package的name
        this.packageName=options.packageName;
        // package的version
        this.packageVersion = options.packageVersion;
        // package的缓存目录前缀
        this.chacheFilePathPrefix = this.packageName.replace('/', '_')
    }

    async prepare(){
        if(this.storeDir && !pathExists(this.storeDir)){
            fse.mkdirpSync(this.storeDir)
        }
        if(this.packageVersion ==='latest'){
            this.packageVersion = await getNpmLatestVersion(this.packageName);
        }
    }

    get chacheFilePath() {
        return path.resolve(this.storeDir,`_${this.chacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
    }

    getSpecificChacheFilePath(packageVersion){
        return path.resolve(this.storeDir,`_${this.chacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
    }
    // 判断当前Package是否存在
    async exists(){
        if(this.storeDir){
            await this.prepare()
            return pathExists(this.chacheFilePath);
        }else{
            return pathExists(this.targetPath);
        }
    }
    //安装Package
    async install(){
        await this.prepare()
        return npminstall({
                root:this.targetPath,
                storeDir:this.storeDir,
                registry:getDefaultRegistry(),
                pkgs:[{
                        name:this.PackageName,
                        version:this.packageVersion
                        }
                ]
            })
    }
    //更新Package
    async update(){
        await this.prepare();
        //获取最新的npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName);
        // 查询最新版本号对应的路径是否存在
        const latestFilePath = this.getSpecificChacheFilePath(latestPackageVersion)
        // 如果不存在，则直接安装最新版本
        if(!pathExists(latestFilePath)){
            await npminstall({
                root:this.targetPath,
                storeDir:this.storeDir,
                registry:getDefaultRegistry(),
                pkgs:[{
                        name:this.PackageName,
                        version:latestPackageVersion
                        }
                ]
            })
            this.packageVersion = latestPackageVersion
        }
        return latestFilePath;
    }
    // 获取入口文件的路径
    getRootFilePath(){
        function _getRootFile(targetPath){
        // 1.获取package.json所在目录
        const dir = pkgDir(targetPath)
        if(dir){
            //2.读取package.json
            const pkgFile = require(path.resolve(dir,'package.json'))
            //3. 寻找main/lib
            if(pkgFile && pkgFile.main ){
                //4.路径的兼容(macOS/windows)
                return formatPath(path.resolve(dir, pkgFile.main))
            }
        }
        return null
        }
        if(this.storeDir){
            return _getRootFile(this.chacheFilePath);
        }else{
            return _getRootFile(this.targetPath);
        }
    }
}

module.exports = Package