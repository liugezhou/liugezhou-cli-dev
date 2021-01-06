'use strict';

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const fse = require('fs-extra')

const Command = require('@liugezhou-cli-dev/command');
const log = require('@liugezhou-cli-dev/log')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

class InitCommand extends Command{
    init(){
        this.projectName = this._argv[0] || '';
        this.force = !!this._cmd.force
        log.verbose('projectName',this.projectName)
        log.verbose('force',this.force)
    }
    async exec(){
        try {
        // 1.准备阶段
        const ret = await this.prepare()
        if(ret){
        // 2.下载模版

        //3.安装模板
        }
        
        } catch (error) {
            log.error(error.message)
        }
        
    } 
    async prepare(){
        const localPath = process.cwd()
        //1.判断当前目录是否为空
        if( !this.isDirEmpty(localPath)){
            let ifContinue = false
            if(!this.force){
                // 询问是否创建
                ifContinue=(await inquirer.prompt([{
                    type: 'confirm',
                    name:'ifContinue',
                    message:'当前文件夹不为空，是否继续创建项目？'
                }])) .ifContinue
                if(!ifContinue){
                    return;
                }
            }
            //2.是否启动强制更新
            if(ifContinue || this.force){
                // 清空前给用户做二次确认
                const  { confirmDelete } = await inquirer.prompt([{
                    type: 'confirm',
                    name:'confirmDelete',
                    default:false,
                    message:'是否确认清空当前目录下的文件？'
                }])
                if(confirmDelete){
                    fse.emptyDirSync(localPath)
                }
            }
        }
        return this.getProjectInfo()
       
    }

    async getProjectInfo(){
        //1.选取创建项目或组件
        const projectInfo = {}
        const {type} = await inquirer.prompt({
            type:'list',
            name:'type',
            default:TYPE_PROJECT,
            message:'请选择初始化类型',
            choices:[
                { name: '项目',value:TYPE_PROJECT},
                { name: '组件',vaule:TYPE_COMPONENT},
            ]
        })
        if(type === TYPE_PROJECT){
        //2.获取项目的基本信息
        const o = await inquirer.prompt([{
            type:'input',
            name:'projectName',
            default:'',
            message:'请输入项目名称',
            validate:function(v){
                // 规则一：输入的首字符为英文字符
                // 规则二：尾字符必须为英文或数字
                // 规则三：字符仅允许-和_两种
                return /^$/.test(v)
            },
            filter:function(v){
                return v
            },
        },{
            type:'input',
            name:'projectVersion',
            default:'',
            message:'请输入项目版本号',
            validate:function(v){
                return typeof v === 'string'
            },
            filter:function(v){
                return v
            },
        }])
            console.log(o)
        }else if (type === TYPE_COMPONENT){

        }

        return projectInfo
        //return (项目的基本信息：Object)
    }

    isDirEmpty(localPath){
        let fileList = fs.readdirSync(localPath)
        // 文件过滤逻辑
        fileList = fileList.filter(file => (
            !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
          ));
        return !fileList || fileList.length <= 0
    }
}

function init(argv) {
    // console.log('Entry',projectName,cmdObj.force,process.env.CLI_TARGET_PATH)
    return new InitCommand(argv)
}

module.exports.InitCommand = InitCommand;
module.exports = init;