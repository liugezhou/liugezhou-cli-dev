const request = require('@liugezhou-cli-dev/request')

module.exports = function(){
  return request({
    url:'/project/template'
  })
}