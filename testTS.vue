<template>
</template>
<script lang="ts">
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
</script>