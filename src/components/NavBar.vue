<template>
  <div class="navbar flex text-white">
    <router-link
      v-for="r in routes"
      :key="r.name"
      class="flex flex-1 items-center justify-center text-center border-2 border-secondary"
      :to="{ name: r.name }"
      :exact="exactMatchOnly"
    >
      {{ r.title }}
    </router-link>
  </div>
</template>

<script>
export default {
  name: 'NavBar',

  props: {
    exactMatchOnly: {
      type: Boolean,
      default: false
    },

    border: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    routes () {
      return [
        {
          name: 'RackView',
          title: 'Rack'
        },
        {
          name: 'PresetsView',
          title: 'Presets'
        },
        {
          name: 'TunerView',
          title: 'Tuner'
        }
      ]
    }
  }
}
</script>

<style scoped>
  .navbar {
    user-select: none;
    height: 46px;

    padding: 8px;

    cursor: pointer;
  }

  .navbar > .router-link-exact-active {
    @apply bg-accent border-accent;
  }

  .navbar > .router-link-active:not(.router-link-exact-active) {
    @apply bg-accent border-secondary border-dashed;
  }

  .navbar > .router-link-exact-active:active {
    @apply border-primary;
  }
</style>
