'use strict';

const pkgDir = require('pkg-dir').sync;
const path = require('path');
const { isObject }  = require('@liugezhou-cli-dev/utils')
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
        this.storePath = options.storePath  
        //package的name
        this.PackageName=options.name
        // package的version
        this.packageVersion = options.version
    }

    // 判断当前Package是否存在
    exists(){

    }
    //安装Package
    install(){

    }
    //更新Package
    update(){

    }
    // 获取入口文件的路径
    getRootFilePath(){
        const dir = pkgDir(this.targetPath)
        console.log(dir)
        if(dir){
            const pkgFile = require(path.resolve(dir,'package.json'))
            if(pkgFile && pkgFile.main ){
                return path.resolve(dir, pkgFile.main)
            }
        }
        return null
    }
}

module.exports = Package