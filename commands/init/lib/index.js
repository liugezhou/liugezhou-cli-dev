'use strict';

const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const fse = require('fs-extra')
const ejs = require('ejs')
const glob = require('glob')
const semver = require('semver')
const userHome = require('user-home')

const Command = require('@liugezhou-cli-dev/command');
const Package = require('@liugezhou-cli-dev/package');
const { spinnerStart, sleep,execAsync } = require('@liugezhou-cli-dev/utils')
const log = require('@liugezhou-cli-dev/log')
const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'
const TEMPLATE_TYPE_NORMAL ='normal'
const TEMPLATE_TYPE_CUSTOM ='custom'

const WHITE_COMMAND =['npm', 'cnpm']

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
            //3.安装模板
                await this.installTemplate()
            }
        } catch (error) {
            log.error(error.message)
            if(process.env.LOG_LEVEL === 'verbose'){
                console.log(error)
            }
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
        this.templateInfo = templateInfo
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
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true)
                if(await templateNpm.exists()){
                    log.success('下载模板成功！')
                    this.templateNpm = templateNpm
                }
            }
        }else{
            const spinner = spinnerStart('正在更新模板...')
            await sleep()
            try {
                await templateNpm.update()
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true)
                if(await templateNpm.exists()){
                    log.success('模板更新成功!')
                    this.templateNpm = templateNpm
                }
            }
        }
    }

    async installTemplate(){
        if(this.templateInfo){
            if(!this.templateInfo.type){
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL
            }
            if(this.templateInfo.type === TEMPLATE_TYPE_NORMAL){
                //标准安装
                await this.installNormalTemplate()
            }else if(this.templateInfo.type === TEMPLATE_TYPE_CUSTOM){
                //自定义安装
                await this.installCustomTemplate()
            }else{
                throw new Error('项目模板信息无法识别！')
            }
        }else{
            throw new Error('项目模板信息不存在！')
        }
    }

    async execCommand(command,errMsg){
        let ret;
        if(command){
            const cmdArray=command.split(' ')
            const cmd = this.checkCommand(cmdArray[0])
            if(!cmd){
                throw new Error(errMsg)
            }
            const args = cmdArray.slice(1)
            ret = await execAsync(cmd,args,{
                stdio:'inherit',
                cwd:process.cwd()
            })
            if(ret !== 0){//执行成功
                throw new Error('依赖安装过程失败')
            }
            return ret
        }
    }

    checkCommand(cmd){
        if(WHITE_COMMAND.includes(cmd)){
            return cmd
        }
        return null;
    }

    async ejsRender(options){
        const dir = process.cwd()
        const projectInfo = this.projectInfo
        return new Promise((resolve,reject)=>{
            glob('**',{
                cwd:dir,
                ignore:options.ignore || '',
                nodir:true
            },(err,files) =>{
                if(err){
                    reject(err)
                }
                Promise.all(files.map(file=>{
                    const filePath = path.join(dir,file)
                    return new Promise( (resolve1,reject1) => {
                        ejs.renderFile( filePath,projectInfo,{},(err,result) => {
                            if(err){
                                reject1(err)
                            }
                            fse.writeFileSync(filePath,result)
                            resolve1(result)
                        })
                    })
                })).then(()=>{
                    resolve()
                }).catch(err=>{
                    reject(err)
                })
            })
        })
    }

    async installNormalTemplate(){
        //拷贝模板代码至当前目录
        const spinner = spinnerStart('正在安装模板...')
        await sleep()
        try {
            const templatePath = path.resolve(this.templateNpm.cacheFilePath,'template')
            const targetPath = process.cwd()
            fse.ensureDirSync(templatePath)//确保使用前目录存在
            fse.ensureDirSync(targetPath)
            fse.copySync(templatePath,targetPath) 
        } catch (error) {
            throw error
        } finally{ 
            spinner.stop(true)
            log.success('模板安装成功')
        }
        const  templateIgnore = this.templateInfo.ignore || []
        const ignore = ['**/node_modules/**',...templateIgnore]
        await this.ejsRender({ignore})
        const { installCommand,startCommand } = this.templateInfo
        //依赖安装
        await this.execCommand(installCommand,'依赖过程安装失败！')
        //启动命令执行
        await this.execCommand(startCommand,'启动命令执行失败失败！')
    }
    async installCustomTemplate(){
        //查询自定义模版的入口文件
        if(await this.templateNpm.exists()){
            const rootFile = this.templateNpm.getRootFilePath()
            if(fs.existsSync(rootFile)){
                log.verbose('开始执行自定义模板')
                const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
                const options = {
                    templateInfo: this.templateInfo,
                    projectInfo: this.projectInfo,
                    sourcePath: templatePath,
                    targetPath: process.cwd(),
                  };
                const code = `require('${rootFile}')(${JSON.stringify(options)})`
                await execAsync('node',  ['-e', code], {stdio:'inherit',cwd: process.cwd()})
                log.success('自定义模版安装成功')
            }else{
                throw new Error('自定义模板入口文件不存在')
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
        function isValidName(v) {
            return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
          }

          let projectInfo = {}
          let isProjectNameValid = false
          if (isValidName(this.projectName)) {
            isProjectNameValid = true;
            projectInfo.projectName = this.projectName;
          }
        //1.选取创建项目或组件
        const { type } = await inquirer.prompt({
            type:'list',
            name:'type',
            message:'请选择初始化类型', 
            default:TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT,
              }, {
                name: '组件',
                value: TYPE_COMPONENT,
              }]
        })
        this.template = this.template.filter(template =>template.tag.includes(type))
        const title =  type === TYPE_PROJECT ? '项目':'组件'
        const projectNamePrompt = {
            type:'input',
            name:'projectName',
            default:'',
            message:`请输入${title}名称`,
            validate:function(v){
                const done = this.async();
                // Do async stuff
                setTimeout(function() {
                if (!isValidName(v)) {
                    done(`请输入合法${title}的名称`);
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
            }
        }
        const projectPrompt = []
        if (!isProjectNameValid) {
            projectPrompt.push(projectNamePrompt);
          }
          projectPrompt.push({
            type:'input',
            name:'projectVersion',
            default:'1.0.0',
            message:`请输入${title}版本号`,
            validate:function(v){
                const done = this.async();
                // Do async stuff
                setTimeout(function() {
                if (!(!!semver.valid(v))) {
                    done(`请输入合法的${title}版本号`);
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
                message:`请选择${title}模板`,
                choices: this.createTemplateChoice()
            })

        if(type === TYPE_PROJECT){
        //2.获取项目的基本信息
        const project = await inquirer.prompt(projectPrompt)
        projectInfo = {
            ...projectInfo,
            type,
            ...project
        }
        }else if (type === TYPE_COMPONENT){
            // 获取组件的基本信息
            const descriptionPrompt = {
                type:'input',
                name:'componentDescription',
                message:'请输入组件描述信息',
                default:'',
                validate:function(v){
                    const done = this.async()
                    setTimeout(() => {
                        if(!v){
                            done('请输入组件描述信息')
                            return 
                        }
                        done(null,true)
                    }, 0);
                }
            }
            projectPrompt.push(descriptionPrompt)
            const component = await inquirer.prompt(projectPrompt)
            projectInfo = {
                ...projectInfo,
                type,
                ...component
            }
        }
        // 生成classname
        if(projectInfo.projectName){
            projectInfo.name = projectInfo.projectName
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/,'')
        }
        if(projectInfo.projectVersion){
            projectInfo.version = projectInfo.projectVersion
        }
        if(projectInfo.componentDescription){
            projectInfo.description = projectInfo.componentDescription
        }
        return projectInfo
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