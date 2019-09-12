const fs = require('fs')
const generate = require('@babel/generator').default
const { parse } = require('@babel/parser')
const { babelPlugins } = require('./vars')
const VARS = require('./vars.js')

/**
 * watch的函数名称
 * @param {*} str
 */
const watchFnName = str => {
  str = str.replace(/[^\w]/g, '')
  return str.slice(0, 1).toLocaleUpperCase() + str.slice(1)
}

/**
 * Watch 的参数
 * @param {*} str
 */
const watchParamStr = params => {
  return generateFn(params).replace(/['"]/g, '')
}

const generateFn = node => {
  return generate(node, {
    comments: false
  }).code
}

const parseFn = nodeStr => {
  return parse(nodeStr, {
    sourceType: 'module',
    plugins: babelPlugins
  })
}

/**
 * 截取部分函数，例如 getFnMain('function (a, b) {}') => (a, b) {}
 * @param {String} fn 函数字符串
 */
const getFnMain = fn => {
  return fn.replace(/[\s\S]+?(?=\()/, '')
}

/**
 * 处理函数（es5函数、箭头函数、es6 函数、async/await）
 * @param {*} babelNode 
 */
const getFnInfo = (babelNode, rootNode) => {
  return {
    fnName: generateFn(rootNode ? rootNode.key : babelNode.key),
    fnParams: '(' + (babelNode.value || babelNode).params.reduce((t, c) => t + generateFn(c) + ',', '').slice(0, -1) + ')',
    fnBody: generateFn((babelNode.value || babelNode).body),
    isAsync: (babelNode.value || babelNode).async,
    isGenerator: (babelNode.value || babelNode).generator
  }
}
/**
 * 获取函数参数
 * @param {*} vv
 */
const getFnParams = vv => {
  return `(${(vv.params || vv.value.params).map(vvv => generateFn(vvv)).join(',')})`
}

/**
 * 首字母大写
 * @param {*} str
 */
const capUpper = str => {
  return str[0].toUpperCase() + str.slice(1)
}

/**
 * 是否是函数类型
 * @param {*} item 需要确定类型的值
 */
const isBabelFunction = item => {
  return item.type === 'ObjectMethod' || item.value.type === 'FunctionExpression' || item.value.type === 'ArrowFunctionExpression'
}

/**
 * 错误日志
 * @param {Array<any>} errorList 错误数据
 */
const writeError = errorData => {
  console.log(`
    ---${errorData.title}---
    ${errorData.msg}
  `)
  let errorMsg = `time: ${new Date().toLocaleString()}\ntitle: ${errorData.title}\nmsg: ${errorData.msg}\n\n`
  fs.writeFile(VARS.errorMsgTxtPath, errorMsg, { flag: 'a' }, err => {
    if (err) console.log(err)
  })
}

module.exports = {
  watchFnName,
  generateFn,
  parseFn,
  watchParamStr,
  getFnMain,
  capUpper,
  writeError,
  getFnParams,
  isBabelFunction,
  getFnInfo
}