const path = require('path')
module.exports = {
  vueLifeCycle: ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'activated', 'deactivated', 'beforeDestroy', 'destroyed', 'errorCaptured', 'beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave'],
  ts2jsTypeMap: {
    String: 'string',
    Number: 'number',
    Boolean: 'boolean',
    Array: 'Array<any>',
    Object: 'any',
    Date: 'any',
    Function: 'Function',
    Symbol: 'symbol',
    Undefined: 'undefined'
  },
  ts2bableTypeMap: {
    StringLiteral: 'string',
    NumericLiteral: 'number',
    BooleanLiteral: 'boolean',
    ArrayExpression: 'Array<any>',
    FunctionExpression: 'Function',
  },
  bableType2jsTypeMap: {
    StringLiteral: 'String',
    NumericLiteral: 'Number',
    BooleanLiteral: 'Boolean',
    ArrayExpression: 'Array',
    FunctionExpression: 'Function',
  },
  babelPlugins: [
    'typescript',
    'asyncGenerators',
    'classProperties',
    ['decorators', { decoratorsBeforeExport: true }],
    'doExpressions',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'objectRestSpread',
    'optionalCatchBinding',
    'throwExpressions'
  ],
  rootPath: '',
  errorMsgTxtPath: ''
}