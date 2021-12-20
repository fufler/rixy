<template>
  <div class="h-screen rack-view">
    <FxList
      :fxs="inactiveFxs"
      :expanded="menuExpanded"
      @expanded="setMenuExpanded"
      @reset="removeAllActiveFxs"
    />

    <RackList
      #head
      :expanded="!menuExpanded"
      :fxs="activeFxs"
      @inserted="insertFx"
      @removed="removeFx"
    >
      <nav-bar />
    </RackList>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

import FxList from '@components/FxList'
import RackList from '@components/RackList'
import NavBar from '@components/NavBar'

export default {
  name: 'RackView',
  components: {
    NavBar,
    FxList,
    RackList
  },
  computed: {
    ...mapGetters({
      menuExpanded: 'guitarix/menuExpanded',
      activeFxs: 'guitarix/activeFxs',
      inactiveFxs: 'guitarix/inactiveFxs'
    })
  },
  beforeMount () {
    this.setMenuExpanded(false)
  },
  methods: {
    ...mapActions({
      setMenuExpanded: 'guitarix/setMenuExpanded',
      insertFx: 'guitarix/insertFx',
      removeFx: 'guitarix/removeFx',
      removeAllActiveFxs: 'guitarix/removeAllActiveFxs'
    })
  }
}
</script>
