'use strict';

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const fse = require('fs-extra')
const semver = require('semver')
const userHome = require('user-home')

const Command = require('@liugezhou-cli-dev/command');
const Package = require('@liugezhou-cli-dev/package');
const { spinnerStart, sleep } = require('@liugezhou-cli-dev/utils')
const log = require('@liugezhou-cli-dev/log')
const getProjectTemplate = require('./getProjectTemplate')

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
            const projectInfo = await this.prepare()
            if(projectInfo){
            // 2.下载模版
                this.projectInfo = projectInfo
                await this.downloadTemplate()
                log.verbose('projectInfo',projectInfo)
            //3.安装模板
            }
        } catch (error) {
            log.error(error.message)
        }
        
    } 

    async downloadTemplate(){
        // 前置工作：通过项目模板API获取模板信息
        // 1.1通过egg.js搭建一套后端系统
        // 1.2通过npm存储项目模板
        // 1.3将项目模板信息存储到mongodb数据库中
        // 1.4通过egg.js获取mongodb中的数据并且通过api返回
        const { projectTemplate } = this.projectInfo
        const templateInfo = this.template.find(item => item.npmName === projectTemplate)
        const targetPath = path.resolve(userHome,'.liugezhou-cli-dev','template')
        const storeDir=path.resolve(userHome,'.liugezhou-cli-dev','template','node_modules')
        const { npmName, version } = templateInfo
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName:npmName,
            packageVersion:version
        })
        if(!await templateNpm.exists()){
            const spinner = spinnerStart('正在下载模板...')
            await sleep()
            try {
                await templateNpm.install()
                log.success('下载模板成功！')
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true)
            }
        }else{
            const spinner = spinnerStart('正在更新模板...')
            await sleep()
            try {
                await templateNpm.update()
                log.success('更新模板成功！')
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true)
            }
        }
    }

    async prepare(){
        //0.判断项目模板是否存在
        const template = await getProjectTemplate()
        if(!template || template.length === 0){
            throw new Error('项目模板不存在！')
        }
        this.template = template
        //1.判断当前目录是否为空
        const localPath = process.cwd()
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
        let projectInfo = {}
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
        const project = await inquirer.prompt([{
            type:'input',
            name:'projectName',
            default:'',
            message:'请输入项目名称',
            validate:function(v){
                const done = this.async();
                // Do async stuff
                setTimeout(function() {
                if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9]*)$/.test(v)) {
                    done('请输入合法的项目名称');
                    return;
                }
                done(null, true);
                }, 0);
                // 规则一：输入的首字符为英文字符
                // 规则二：尾字符必须为英文或数字
                // 规则三：字符仅允许-和_两种
                // \w=a-zA_Z0-9_
            },
            filter:function(v){
                return v
            },
        },{
            type:'input',
            name:'projectVersion',
            default:'1.0.0',
            message:'请输入项目版本号',
            validate:function(v){
                const done = this.async();
                // Do async stuff
                setTimeout(function() {
                if (!(!!semver.valid(v))) {
                    done('请输入合法的项目版本号');
                    return;
                }
                done(null, true);
                }, 0);
            },
            filter:function(v){
                if(semver.valid(v)){
                    return semver.valid(v)
                } else {
                    return v
                }
            },
        },{
            type:'list',
            name:'projectTemplate',
            message:'请选择项目模板',
            choices: this.createTemplateChoice()
        }])
        projectInfo = {
            type,
            ...project
        }
        }else if (type === TYPE_COMPONENT){

        }

        return projectInfo
        //return (项目的基本信息：Object)
    }

    createTemplateChoice(){
        return this.template.map(item=>({
            value: item.npmName,
            name:item.name
        }))
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