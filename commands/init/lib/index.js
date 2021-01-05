'use strict';

const Command = require('@liugezhou-cli-dev/command');
const log = require('@liugezhou-cli-dev/log')
class InitCommand extends Command{
    init(){
        this.projectName = this._argv[0] || '';
        this.force = this._cmd.force
        log.verbose('projectName',this.projectName)
        log.verbose('force',this.force)
    }
    exec(){
        console.log('init的业务逻辑')
    }
}
function init(argv) {
    // console.log('Entry',projectName,cmdObj.force,process.env.CLI_TARGET_PATH)
    return new InitCommand(argv)
}

module.exports.InitCommand = InitCommand;
module.exports = init;