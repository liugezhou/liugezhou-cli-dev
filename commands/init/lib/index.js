'use strict';

const Command = require('@liugezhou-cli-dev/command');

class InitCommand extends Command{
    
}
function init(argv) {
    // console.log('Entry',projectName,cmdObj.force,process.env.CLI_TARGET_PATH)
    return new InitCommand(argv)
}

module.exports.InitCommand = InitCommand;
module.exports = init;