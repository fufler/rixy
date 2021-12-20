<template>
  <div class="h-screen fx-view">
    <nav-bar />
    <FxControlHeader
      v-if="fx"
      :name="fx.name"
    />

    <FxControlList
      :fx="fx"
      :controls="allControls"
      @change="updateFxControl"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import throttle from 'lodash/throttle'

import FxControlHeader from '@components/FxControlHeader'
import FxControlList from '@components/FxControlList'
import NavBar from '@components/NavBar'

export default {
  name: 'FxView',
  components: {
    NavBar,
    FxControlHeader,
    FxControlList
  },
  data () {
    return {
      controls: {},
      augmentedControls: {}
    }
  },
  computed: {
    fx () {
      return this.fxById(this.$route.params.id)
    },
    ...mapGetters({
      fxById: 'guitarix/fxById'
    }),
    allControls () {
      return {
        ...this.controls,
        ...this.augmentedControls
      }
    }
  },
  beforeMount () {
    this.getFxControl()
  },
  methods: {
    getFxControl: throttle(async function () {
      const isViewingAmpFx = this.$route.params.id === 'ampstack'

      // here we want a straight callback from guitarix
      // to augment local state (mostly on/off status)
      this.controls = await this.$guitarix.sendMessage(
        'queryunit',
        [this.$route.params.id]
      )

      // augment with amplifier controls if applicable
      if (isViewingAmpFx) {
        this.augmentedControls = await this.$guitarix.sendMessage(
          'get_parameter',
          [
            // main
            'amp.out_master',

            // noise gate
            'noise_gate.on_off',
            'noise_gate.threshold',

            // compressor
            'shaper.on_off',
            'shaper.sharper',

            // mono level
            'amp.on_off',
            'amp.out_amp',

            // clip
            'amp.clip.on_off',
            'amp.fuzz',

            // bass boots
            'amp.bass_boost.on_off',
            'bassbooster.Level',

            // presence
            'con.on_off',
            'con.Level',

            // reverb
            'amp.feed_on_off',
            'amp.wet_dry'
          ]
        )
      }
    }, 350),

    async updateFxControl (fx, control, value) {
      this.$guitarix.sendMessage(
        'set',
        [
          fx.prop,
          fx.value
        ]
      )

      await this.$nextTick()
      this.getFxControl()
    }
  }
}
</script>
