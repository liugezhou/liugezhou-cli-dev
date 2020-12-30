'use strict';

function init(projectName, cmdObj) {
    console.log('Entry',projectName,cmdObj.force,process.env.CLI_TARGET_PATH)
}

module.exports = init;