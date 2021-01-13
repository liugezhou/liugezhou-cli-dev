'use strict';

const Spinner = require('cli-spinner')

function isObject(obj){
    return Object.prototype.toString.call(obj).slice(8,-1) === 'Object'
}
function spinnerStart(){
        const spinner = new Spinner('loading.. %s')
        spinner.setSpinnerString('|/-\\')
        spinner.start()
        return spinner
}
module.exports = {
    isObject,
    spinnerStart
};

