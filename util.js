/**
 * 处理 vue-script 文件各个属性的方法
 */
const {
  watchFnName,
  parseFn,
  generateFn,
  watchParamStr,
  getFnMain,
  capUpper,
  writeError,
  getFnInfo,
  isBabelFunction
} = require('./commonutil')

const {
  ts2jsTypeMap,
  ts2bableTypeMap
} = require('./vars')

function commonFnManage (v, self) {
  let commonFnTemplate = ''
  const fnInfo = getFnInfo(v)
  if (fnInfo.isGenerator) {
    writeError({
      title: '无法处理 Generator，请自行处理',
      msg: `无法处理的 Generator位于：${self.filePath}`
    })
    return ''
  }
  if (v.value && v.value.type === 'ArrowFunctionExpression') {
    commonFnTemplate = `
      ${fnInfo.fnName} =${fnInfo.isAsync ? ' async' : ''} ${fnInfo.fnParams} => ${fnInfo.fnBody}
    `
  } else {
    commonFnTemplate = `
      ${fnInfo.isAsync ? 'async ' : ''}${fnInfo.fnName} ${fnInfo.fnParams} ${fnInfo.fnBody}
    `
  }
  return commonFnTemplate
}

function updateCreated (initDataCode, self) {
  if (self.templateMap.created === void 0) {
    // 还没处理 created
    const createdObj = (self.vueExportDefaultChildren.filter(v => generateFn(v.key) === 'created') || [])[0]
    if (createdObj) {
      const addMethodsAst = parseFn(`function a () {${initDataCode}}`)
      // 找到 created 的 node
      createdObj.body.body.unshift(...addMethodsAst.program.body[0].body.body)
    } else {
      // 没有 created，则创建之
      self.templateMap.created = `created () {${initDataCode}}`
    }
  } else {
    // 已经处理完 created 了，则直接塞字符串进去
    self.templateMap.created = self.templateMap.created.replace(/[\s\S]*?{/, mt => mt + initDataCode)
  }
}

module.exports = {
  name: {
    handler (item) {
      return {
        className: item.value.value ? capUpper(item.value.value).replace(/-\w/g, mt => {
          return capUpper(mt.replace('-', ''))
        }) : ''
      }
    }
  },
  components: {
    handler (item) {
      return {
        template: generateFn(item)
      }
    }
  },
  mixins: {
    handler (item) {
      return {
        tsVueOptsList: ['Mixins'],
        tsVueMixinsList: item.value.elements.map(v => generateFn(v))
      }
    }
  },
  props: {
    handlerArrayString (item) {
      return item.value.elements.reduce((t, c) => {
        return t + `@Prop() readonly ${generateFn(c).replace(/['"]/g, '')}: any | undefined\n`
      }, '')
    },
    handlerType (va, self) {
      const list = va.value.elements || va.value.properties
      if (va.value.type !== 'Identifier' && !list) {
        writeError({
          title: '处理 props 出错',
          msg: `错误位于: ${self.filePath}, props:  ${va.key.name} 的格式可能不合法`
        })
        return {}
      }
      return {
        type: va.value.type === 'Identifier' ? generateFn(va.value) : list.map(v => generateFn(v)),
        typeTemplate: `type: ${generateFn(va.value)},`
      }
    },
    getType (typeInfo) {
      let mainType = (Array.isArray(typeInfo.type)
        ? typeInfo.type.map(typeItem => ts2jsTypeMap[typeItem]).join('|')
        : (ts2jsTypeMap[typeInfo.type] || 'any'))
      if (!typeInfo.default) {
        mainType += ((mainType ? '| ' : '') + 'undefined')
      }
      return mainType
    },
    handler (item, self) {
      let propsTemplate = ''
      let typeInfo = {}
      if (item.value.type === 'ArrayExpression') {
        propsTemplate += this.handlerArrayString(item)
      } else {
        let temptemplate= ''
        item.value.properties.forEach(v => {
          typeInfo = {}
          temptemplate += '@Prop({'
          if (!v.value.properties) {
            // 类型
            typeInfo = this.handlerType(v, self)
            temptemplate += (typeInfo.typeTemplate || '')
          } else {
            // 对象
            v.value.properties.forEach(vv => {
              if (vv.key.name === 'type') {
                typeInfo = this.handlerType(vv, self)
                temptemplate += (typeInfo.typeTemplate || '')
              } else {
                if (vv.key.name === 'default') {
                  typeInfo.default = true
                }
                temptemplate += `${generateFn(vv)},`
              }
            })
          }
          propsTemplate += (temptemplate + '}) readonly ')
          propsTemplate += `${v.key.name}${typeInfo.default ? '!' : ''}:${this.getType(typeInfo)}\n`
          temptemplate = ''
        })
      }
      return {
        template: propsTemplate,
        tsVueOptsList: ['Prop']
      }
    }
  },
  data: {
    hanlderExtraData (extraData, returnData, self) {
      const initDataCode =  `
        ${extraData.reduce((t, c) => t + generateFn(c), '')}
        ${returnData[0].argument.properties.reduce((t, c) => {
          return `${t}\nthis.${generateFn(c.key)} = ${generateFn(c.value)}`
        }, '')}
      `
      updateCreated(initDataCode, self)
    },
    handler (item, self) {
      let dataTemplate = ''
      let list = []
      let hasExtra = false
      if (item.type === 'ObjectMethod' || item.value.type === 'FunctionExpression') {
        const data = item.value || item
        const returnData = data.body.body.filter(v => v.type === 'ReturnStatement')
        const extraData = data.body.body.filter(v => v.type !== 'ReturnStatement')
        hasExtra = extraData.length !== 0
        if (hasExtra) {
          this.hanlderExtraData(extraData, returnData, self)
        }
        list = returnData[0].argument.properties
      } else {
        list = item.value.properties
      }
      list.forEach(v => {
        dataTemplate += `${v.key.name}:${ts2bableTypeMap[v.value.type] || 'any'} = ${hasExtra ? null : generateFn(v.value)}\n`
      })
      return {
        template: dataTemplate
      }
    },
  },
  model: {
    handlerError (title, msg, modeTemplate) {
      writeError({ title, msg })
      return {
        template: modeTemplate,
        tsVueOptsList: ['Model']
      }
    },
    handler (item, self) {
      let modeTemplate = ''
      modeTemplate += `@Model(`
      const modelObj = {}
      item.value.properties.forEach(v => {
        modelObj[v.key.name] = v.value.value
      })
      modeTemplate += `'${modelObj.event || "input"}'`
      if (!modelObj.prop) {
        return {
          template: modeTemplate,
          tsVueOptsList: ['Model']
        }
      }
      const propsObj = self.vueExportDefaultChildren.filter(v => v.key.name === 'props')[0]
      if (!propsObj) {
        return this.handlerError('model处理错误，缺少 props', `错误位于：${self.filePath}`, modeTemplate)
      }
      const modelPropIndex = propsObj.value.properties.findIndex(v => v.key.name === modelObj.prop)
      if (modelPropIndex === -1) {
        return this.handlerError('model处理错误，缺少对应的 props', `错误位于：${self.filePath}，缺少的 props：${modelObj.prop}`, modeTemplate)
      }
      const modelProp = propsObj.value.properties[modelPropIndex]
      // 此 prop 将在 model 中定义，因此需要从原 prop 中删去
      propsObj.value.properties.splice(modelPropIndex, 1)
      const modelOpts = {}
      modeTemplate += `, {`
      modelProp.value.properties.forEach(v => {
        modelOpts[v.key.name] = generateFn(v.value)
        modeTemplate += `${v.key.name}: ${generateFn(v.value)},`
      })
      modeTemplate += '}'
      modeTemplate += `) readonly ${modelProp.key.name}!: ${ts2jsTypeMap[modelOpts.type] || 'any'}\n`
      return {
        template: modeTemplate,
        tsVueOptsList: ['Model']
      }
    }
  },
  watch: {
    fnInfo: null,
    handlerStringLiteral (v, value, kk) {
      return `
        on${watchFnName(generateFn(v.key))}${kk === void 0 ? '' : kk}Changed (val: any, oldVal: any) {
          this.${generateFn(value).replace(/['"]/g, '')}(val, oldVal)
        }
      `
    },
    handlerES6FunctionExpression (v, value, kk) {
      this.fnInfo = getFnInfo(value || v)
      return `${this.fnInfo.isAsync ? 'async ' : ''}on${watchFnName(generateFn(v.key))}${kk === void 0 ? '' : kk}Changed ${this.fnInfo.fnParams} ${this.fnInfo.fnBody}`
    },
    handlerFunctionExpression (v, value, kk) {
      this.fnInfo = getFnInfo(value, v)
      return `${this.fnInfo.isAsync ? 'async ' : ''}on${watchFnName(generateFn(v.key))}${kk === void 0 ? '' : kk}Changed ${this.fnInfo.fnParams} ${this.fnInfo.fnBody}`
    },
    handlerArrowFunctionExpression (v, value, kk) {
      this.fnInfo = getFnInfo(value, v)
      return `on${watchFnName(generateFn(v.key))}${kk === void 0 ? '' : kk}Changed = ${this.fnInfo.isAsync ? 'async ' : ''} ${this.fnInfo.fnParams} => ${this.fnInfo.fnBody}`
    },
    handlerObjectExpression (v, value, kk) {
      let opts = ''
      let fn = ''
      value.properties.forEach(vv => {
        if (generateFn(vv.key) === 'handler') {
          fn = this.handlerItem(v, vv.value || vv, kk)
        } else {
          // 不是handler，那么就是 deep, immediate
          opts = opts + (opts ? ',' : ',{') + `${generateFn(vv.key)}:${generateFn(vv.value)}`
        }
      })
      opts += (opts ? '})' : ')')
      return `
        @Watch('${watchParamStr(v.key)}'${opts}
        ${fn}
      `
    },
    handlerItem (v, value, kk) {
      let watchTemplate = ''
      if (v.type === 'ObjectMethod' || (value && value.type === 'ObjectMethod')) {
        // es6 函数 () {}
        watchTemplate = this.handlerES6FunctionExpression(v, value, kk)
      } else if (value.type === 'FunctionExpression') {
        // 函数 function () {}
        watchTemplate = this.handlerFunctionExpression(v, value, kk)
      } else if (value.type === 'ArrowFunctionExpression') {
        // 箭头函数
        watchTemplate = this.handlerArrowFunctionExpression(v, value, kk)
      } else if (value.type === 'StringLiteral') {
        // 方法名
        watchTemplate = this.handlerStringLiteral(v, value, kk)
      } else {
        // 对象类型
        watchTemplate = this.handlerObjectExpression(v, value, kk)
      }
      return watchTemplate
    },
    handler (item, self) {
      let watchTemplate = ''
      let singleTemplate = ''
      item.value.properties.forEach(v => {
        if (v.value && v.value.type === 'ArrayExpression') {
          // 数组
          v.value.elements.forEach((vv, kk) => {
            try {
              singleTemplate = this.handlerItem(v, vv, kk)
            } catch (e) {
              writeError({
                title: '处理 watch出错，数组类型',
                msg: `出错的 watch位于：${self.filePath} =》 ${generateFn(v.key)} =》${generateFn(vv.key)}`
              })
            }
            watchTemplate += `
              ${singleTemplate.includes('@Watch') ? '' : `@Watch('${watchParamStr(v.key)}')`}
              ${singleTemplate}
            `
          })
        } else {
          try {
            singleTemplate = this.handlerItem(v, v.value)
          } catch (e) {
            writeError({
              title: '处理 watch出错',
              msg: `出错的 watch位于：${self.filePath} =》 ${generateFn(v.key)}`
            })
          }
          watchTemplate += `
            ${singleTemplate.includes('@Watch') ? '' : `@Watch('${watchParamStr(v.key)}')`}
            ${singleTemplate}
          `
        }
      })
      return {
        template: watchTemplate,
        tsVueOptsList: ['Watch']
      }
    }
  },
  computed: {
    handlerFunctionExpression (v, vv, self) {
      if (vv.type === 'ObjectMethod' || vv.value.type === 'FunctionExpression') {
        // es6函数 和 es5函数
        return `${generateFn(v.key)} ${getFnMain(generateFn(vv.type === 'ObjectMethod' ? vv : vv.value))}\n`
      } else if (vv.value.type === 'ArrowFunctionExpression') {
        // 箭头函数
        writeError({
          title: 'computed中不建议使用箭头函数，请自行转换',
          msg: `位于:  ${self.filePath} => ${generateFn(v.key)}`
        })
        return `${generateFn(v.key)} () { return null }\n`
      }
    },
    handler (item, self) {
      let computedTemplate = ''
      item.value.properties.forEach(v => {
        if (v.value && v.value.type === 'ObjectExpression') {
          // 对象形式
          v.value.properties.forEach(vv => {
            computedTemplate += (generateFn(vv.key) + ' ' + this.handlerFunctionExpression(v, vv, self))
          })
        } else {
          computedTemplate += ('get ' + this.handlerFunctionExpression(v, v, self))
        }
      })
      return {
        template: computedTemplate
      }
    }
  },
  methods: {
    handler (item, self) {
      let methodsTemplate = ''
      item.value.properties.forEach(v => {
        methodsTemplate += commonFnManage(v, self)
      })
      return {
        template: methodsTemplate
      }
    }
  },
  lifeCycle: {
    hanlder (item, self) {
      if (!isBabelFunction(item)) {
        writeError({
          title: `生命周期 ${item.key.name} 应该是一个函数`,
          msg: `不符合规范的生命周期 ${item.key.name} 位于：${self.filePath}`
        })
        return {}
      }
      return {
        template: commonFnManage(item, self)
      }
    }
  },
  provide: {
    handler (item, self) {
      writeError({
        title: '不建议在业务代码中使用 provide, 请手动转换',
        msg: `inject位于 ${self.filePath}`
      })
      return {}
    }
  },
  inject: {
    handler (item, self) {
      writeError({
        title: '不建议在业务代码中使用 inject, 请手动转换',
        msg: `inject位于 ${self.filePath}`
      })
      return {}
    }
  }
}
