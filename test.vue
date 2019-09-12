<template>
</template>
<script>
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
</script>