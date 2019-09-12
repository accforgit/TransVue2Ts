# TransVue2Ts

![NPM](https://nodei.co/npm/transvue2ts.png?downloads=true&downloadRank=true&stars=true)

![img](https://img.shields.io/npm/v/transvue2ts.svg) ![img](https://img.shields.io/bundlephobia/minzip/transvue2ts.svg) ![img](https://img.shields.io/npm/dt/transvue2ts.svg) ![img](https://img.shields.io/github/license/accforgit/transvue2ts.svg)

`transvue2ts` 是一个自动将 `vue-js`代码转化为 `vue-ts`规范的工具库

![img](https://raw.githubusercontent.com/accforgit/transvue2ts/master/public/transvue2ts.gif)

## Install

```
npm install transvue2ts -g
```
全局安装完毕后，`npm`会自动将 `transvue2ts`执行文件的路径写入系统 `path`，所以理论上可以直接在命令行中使用 `transvue2ts`这个指令

## Usage

全局安装完毕之后，`npm`会自动将 `transvue2ts`执行文件的路径写入系统 `path`，所以理论上可以直接在命令行中使用 `transvue2ts`这个指令，直接打开命令行工具即可使用，同时支持单文件和文件目录的转化
`transvue2ts`是库的指令，第二个参数是需要处理的文件(夹)的 **完整全路径**
例如：

处理 `E:\project\testA\src\test.vue`文件：
```
transvue2ts E:\project\testA\src\test.vue
=>
输出路径：E:\project\testA\src\testTs.vue
```
处理 `E:\project\testA\src`文件夹下的所有 `.vue`文件：
```
transvue2ts E:\project\testA\src
=>
输出路径：E:\project\testA\srcTs
```
对于单文件来说，其必须是 `.vue`结尾，转化后的文件将输出到同级目录下，文件名为原文件名 + `Ts`，例如 `index.vue` => `indexTs.vue`；
对于文件目录来说，程序将会对此文件目录进行递归遍历，找出这个文件夹下所有的 `.vue`文件进行转化，转化后的文件将按照原先的目录结构全部平移到同级目录下的一个新文件夹中，例如 `/src` => `/srcTs`

## Demo
```js
import OtherMixins from './OtherMixins'
export default {
  mixins: [OtherMixins],
  props: {
    a: {
      type: Number,
      required: true,
      validator (value) {
        return value > 2
      }
    }
  },
  data () {
    return {
      b: 20
    }
  },
  watch: {
    a (value) {
      console.log(value)
    }
  },
  computed: {
    c () {
      return this.a * 2
    }
  },
  created () {
    console.log('created done')
  },
  methods: {
    clickFn () {
      console.log('click')
    }
  }
}
```
转化为：
```js
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import OtherMixins from './OtherMixins'

@Component
export default class TransVue2TS extends Mixins(OtherMixins) {
  @Prop({
    type: Number,
    required: true,

    validator(value) {
      return value > 2
    }

  })
  readonly a: number | undefined
  b: number = 20

  @Watch('a')
  onAChanged(value) {
    console.log(value)
  }

  get c() {
    return this.a * 2
  }

  created() {
    console.log('created done')
  }

  clickFn() {
    console.log('click')
  }

}
```

