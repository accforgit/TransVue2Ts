#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const ManageMain = require('./ManageMain.js')
const { capUpper, writeError } = require('./commonutil')
const VARS = require('./vars.js')

let rootBaseName = ''
const replacejs2TsPathList = []

// 执行入口
entry()

function entry () {
  const argv = process.argv
  if (argv[2]) {
    VARS.rootPath = path.resolve(__dirname, argv[2])
    VARS.errorMsgTxtPath = path.join(path.dirname(VARS.rootPath), 'errorMsgTxt.txt')
    console.log(`
      开始处理： ${VARS.rootPath}
    `)
    rootBaseName = getBaseName(VARS.rootPath)
    excuteFile(VARS.rootPath)
  } else {
    console.log('请输入需要转换的文件(夹)路径')
  }
}

function getNewFilePath (fileName, isDirectory = false) {
  const mt = fileName.match(/(.+?)(\w+)(\.\w+|$)/)
  const newFilePath = (mt[1] + mt[2]).replace(rootBaseName, rootBaseName + 'TS')
  if (isDirectory) {
    return newFilePath
  }
  return newFilePath + mt[3]
}

// 获取文件的名称，例如 getBaseName('/src/index.js') => index
function getBaseName (fileName) {
  return fileName.match(/\w+(?=(\.|$))/)[0]
}

/**
 * 处理文件
 * @param {String} filePath 文件路径
 */
function manageFile (filePath) {
  const newFilePath = getNewFilePath(filePath)
  mkdirRecursive(newFilePath)
  // .vue文件需要处理
  if (/\.vue/.test(filePath)) {
    return fs.readFile(filePath, (err, data) => {
      if (err) throw err
      transVueScript(filePath, data.toString())
    })
  }
  // 非 .vue文件直接复制粘贴到新目录即可
  fs.copyFile(filePath, newFilePath, err => {
    if (err) return console.log('源文件拷贝失败', filePath)
    clearJsFile()
  })
}

/**
 * 处理文件夹，遍历处理目录下所有文件(夹)
 * @param {*} dirPath 目录路径
 */
function manageDir (dirPath) {
  fs.readdir(dirPath, (err, files) => {
    if (err) return console.log(err)
    let filePath = ''
    files.forEach(file => {
      filePath = path.join(dirPath, file)
      ;((filePath) => {
        excuteFile(filePath)
      })(filePath)
    })
  })
}

function excuteFile (filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err) return console.log(err)
    if (stats.isDirectory()) {
      return manageDir(filePath)
    }
    if (stats.isFile()) {
      return manageFile(filePath)
    }
  })
}

/**
 * 处理 vue 文件的 script，转化为 ts 形式
 * @param {String} vuefilePath vue 文件的路径
 * @param {String} data vue文件内容
 */
function transVueScript (vuefilePath, data) {
  const mt1 = data.match(/<script.*?(src=['"](.+)['"]).*>/)
  const mt2 = data.match(/<script.*>([\s\S]*)<\/script>/)
  if (mt1 && mt1[2]) {
    // 带有 src 属性
    let scriptPath = path.resolve(path.dirname(vuefilePath), mt1[2])
    if (!/\.js$/.test(scriptPath)) {
      scriptPath += '.js'
    }
    replacejs2TsPathList.push(getNewFilePath(scriptPath))
    if (!isPathExist(scriptPath)) {
      writeError({
        title: `src属性指向的文件不存在`,
        msg: `错误位于： ${vuefilePath} => ${scriptPath}`
      })
      return null
    }
    fs.readFile(scriptPath, (err, jsData) => {
      if (err) throw err
      const manage = new ManageMain(jsData.toString(), capUpper(path.dirname(scriptPath).match(/\w+$/)[0]), scriptPath)
      const newTsData = manage.generateCode()
      const newScriptPath = getNewFilePath(scriptPath).replace('.js', '.ts')
      
      fs.writeFile(newScriptPath, newTsData, err => {
        if (err) return console.log(err)
        console.log('写入 ts文件成功：', newScriptPath)
        clearJsFile()
      })
    })
    // 写 vue 文件
    try {
      fs.writeFile(getNewFilePath(vuefilePath), data.replace(/<script/, mt => mt + ' lang="ts"').replace(/(?<=<script.+src=['"]).+(?=['"].*>)/, mt => {
        return mt.replace('.js', '.ts')
      }), err => {
        if (err) {
          writeError({
            title: '写入 ts文件失败',
            msg: `错误文件为：${vuefilePath} =>${newScriptPath}`
          })
        }
      })
    } catch (e) {
      writeError({
        title: '写入文件错误',
        msg: `错误文件为：${newScriptPath}：${e.toString()}`
      })
    }
  } else if (mt2 && mt2[1]) {
    // vue 单文件
    try {
      const manage = new ManageMain(mt2[1], capUpper(path.dirname(vuefilePath).match(/\w+$/)[0]), vuefilePath)
      const newTsData = manage.generateCode()
      fs.writeFile(getNewFilePath(vuefilePath), data.replace(/(?<=<script.+src=['"]).+(?=['"].*>)/, mt => {
        return mt.replace('.js', '.ts')
      }).replace(/<script.*>([\s\S]*)<\/script>/, `<script lang="ts">\n${newTsData}\n</script>`), err => {
        if (err) return console.log(err)
        console.log('写入 vue-ts文件成功：', getNewFilePath(vuefilePath))
        clearJsFile()
      })
    } catch (e) {
      writeError({
        title: '写入文件错误',
        msg: `错误文件为：${vuefilePath}：${e.toString()}`
      })
    }
  } else {
    // 没有 script文件，则直接复制到新目录即可
    fs.writeFile(getNewFilePath(vuefilePath), data, err => {
      if (err) return console.log(err)
      console.log('写入 vue-ts文件成功：', getNewFilePath(vuefilePath))
      clearJsFile()
    })
  }
}


/**
 * 确保 filePath 这个路径实际存在，如果不存在则创建
 * @param {*} filePath
 */
function mkdirRecursive (filePath) {
  const pathList = []
  let pathLen = -1
  while (filePath.length !== pathLen) {
    pathLen = filePath.length
    filePath = path.dirname(filePath)
    pathList.push(filePath)
  }
  pathList.reverse()
  pathList.forEach(item => {
    if (!isPathExist(item)) {
      fs.mkdirSync(item)
    }
  })
}

/**
 * 检查路径是否存在
 * @param {String} filePath 路径
 */
function isPathExist (filePath) {
  let isExist = true
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
  } catch (e) {
    isExist = false
  }
  return isExist
}

/**
 * 在新文件夹中删掉已经被 .ts文件代替的 .js文件
 */
function clearJsFile () {
  replacejs2TsPathList.forEach(item => {
    (item => {
      fs.unlink(item, err => {
        if (!err) {
          console.log('文件已删除', item)
        }
      })
    })(item)
  })
}