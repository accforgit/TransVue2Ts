const generate = require('@babel/generator').default
const propertyManage = require('./util.js')
const { parseFn, generateFn, writeError } = require('./commonutil')
const { vueLifeCycle } = require('./vars')

class ManageMain {
  constructor (scriptCode, className, filePath) {
    console.log('开始处理文件：', filePath)
    this.code = scriptCode
    this.className = className
    this.filePath = filePath
    this._initData()
    this._init()
  }
  _initData () {
    this.vueExportDefaultChildren = null
    this.tsVueMixinsList = []
    this.tsVueOptsList = ['Component']
    this.exportDefaultBefore = []
    this.exportDefaultAfter = []
    this.vueExportDefaultIndex = null
    this.ast = null
    this.tsVueMixinsList = []
    this.templateMap = {}
  }
  _init () {
    this.ast = parseFn(this.code)
    const vueExportDefaultIndex = this.ast.program.body.findIndex(item => item.type === 'ExportDefaultDeclaration')
    this.exportDefaultAfter = this.ast.program.body.slice(vueExportDefaultIndex + 1)
    if (vueExportDefaultIndex !== -1) {
      this.exportDefaultBefore = this.ast.program.body.slice(0, vueExportDefaultIndex)
      this.vueExportDefaultChildren = this.ast.program.body.slice(vueExportDefaultIndex)[0].declaration.properties
      if (this.vueExportDefaultChildren) {
        this._excuteManage()
      }
    }
  }
  _excuteManage () {
    // 因为 model 的存在，可能会影响到 props 某个值的存在，所以这里先处理 model
    const modelIndex = this.vueExportDefaultChildren.findIndex(item => {
      return item.key.name === 'model'
    })
    if (modelIndex !== -1) {
      const result = propertyManage.model.handler(this.vueExportDefaultChildren[modelIndex], this)
      this.templateMap.model = (this.templateMap.model || '') + (result.template || '')
      this.tsVueOptsList = this.tsVueOptsList.concat(result.tsVueOptsList || [])
    }
    this.vueExportDefaultChildren.filter(item => item.key.name !== 'model').forEach(item => {
      // 处理 生命周期 和 vue-router 的钩子函数
      if (vueLifeCycle.includes(item.key.name)) {
        return this.templateMap[item.key.name] = (this.templateMap[item.key.name] || '') + (propertyManage.lifeCycle.hanlder(item, this).template || '')
      }
      if (!propertyManage[item.key.name]) {
        return writeError({
          title: '未处理的属性或方法',
          msg: `请自行处理: ${item.key.name} in ${this.filePath}`
        })
      }
      try {
        const result = propertyManage[item.key.name].handler(item, this)
        this.templateMap[item.key.name] = (this.templateMap[item.key.name] || '') + (result.template || '')
        this.tsVueOptsList = this.tsVueOptsList.concat(result.tsVueOptsList || [])
        this.tsVueMixinsList = this.tsVueMixinsList.concat(result.tsVueMixinsList || [])
        if (result.className) {
          this.className = result.className
        }
      } catch (e) {
        writeError({
          title: 'export 处理出错',
          msg: `${this.filePath}, ${this.className}, ${item.key.name} ：${e.toString()}`
        })
      }
    })
  }
  _joinFullTsTemplate () {
    const exportDefaultBeforeStr = this.exportDefaultBefore.map(item => {
      return generateFn(item)
    }).join('\n').replace(/import\s+Vue\s+from\s*['"]vue['"]/, '')
    const exportDefaultAfterStr = this.exportDefaultAfter.map(item => {
      return generateFn(item)
    }).join('\n')
    let componentsTemplate = '@Component({'
    let componentsContentTemplate = ''
    if (this.templateMap.components) {
      componentsContentTemplate = this.templateMap.components + ','
      this.templateMap.components = ''
    }
    if (this.templateMap.filters) {
      componentsContentTemplate += `\n${this.templateMap.filters}`
      this.templateMap.filters = ''
    }
    componentsTemplate += `${componentsContentTemplate.replace(/,$/, '')}})`
    const tsTemplate = Object.keys(this.templateMap).reduce((t, c) => `${t}\n${this.templateMap[c]}`, '')
    return `
      import { ${this.tsVueOptsList.join(', ')} } from 'vue-property-decorator'
      ${exportDefaultBeforeStr}
    
      ${componentsTemplate}
      class ${this.className || 'Index'} extends ${this.tsVueMixinsList.length === 0 ? 'Vue' : `Mixins(${this.tsVueMixinsList.join(',')})`} {
        ${tsTemplate}
      }
      ${exportDefaultAfterStr}
    `
  }
  generateCode () {
    if (this.tsVueMixinsList.length === 0) {
      this.tsVueOptsList.push('Vue')
    }
    const fullTsTemplate = this._joinFullTsTemplate()
    const newTsAst = parseFn(fullTsTemplate)
    const output = generate(newTsAst)
    return output.code
      // 去除行尾分号；
      .replace(/;(?=\s*\n)/g, '')
      // 给 refs 添加类型
      .replace(/this\.\$refs.+?(?=\.)/g, mt => {
        return `(${mt} as any)`
      })
      .replace(new RegExp(`class ${this.className || 'Index'} extends`), mt => {
        return `export default ${mt}`
      })
  }
}

module.exports = ManageMain
