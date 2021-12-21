<template>
  <div
    class="presets-view h-screen flex flex-col"
    :class="{ 'menu-expanded': !menuCollapsed }"
  >
    <nav-bar
      exact-match-only
    />
    <sidebar-menu
      :menu="menu"
      :collapsed="menuCollapsed"
      width="250px"
      @toggle-collapse="menuCollapsed = !menuCollapsed"
      @item-click="handleBankClick"
    >
      <span slot="toggle-icon">
        <font-awesome-icon icon="bars" />
      </span>

      <div
        slot="footer"
        class="flex justify-center gap-8"
      >
        <span
          v-if="selectedBank != null"
          title="Remove bank"
          class="text-center cursor-pointer"
          @click="removeBank"
        >
          <font-awesome-icon
            class="text-accent"
            icon="trash"
          />
        </span>
        <span
          title="Add bank"
          class="text-center cursor-pointer"
          @click="addBank"
        >
          <font-awesome-icon
            class="text-accent"
            icon="plus"
          />
        </span>
      </div>
    </sidebar-menu>
    <div class="wrapper overflow-y-scroll-auto text-white gap-2">
      <template v-if="selectedBank != null">
        <div
          v-for="preset in selectedBank.presets"
          :key="preset"
          class="preset border-2 border-primary text-white"
          :class="{ selected: selectedPresetName === preset }"
          @click.self="selectedPresetName = preset"
        >
          <template v-if="selectedPresetName !== preset">
            {{ preset }}
          </template>
          <template v-else>
            <div
              title="Load preset"
              class="flex flex-1 items-center justify-center buttons w-full"
              @click="loadPreset"
            >
              <font-awesome-icon icon="file-upload" />
            </div>
            <div
              v-if="selectedBank.mutable"
              class="flex-1 flex w-full"
            >
              <div
                title="Save preset"
                class="flex flex-1 buttons text-center cursor-pointer items-center justify-center"
                @click="savePreset"
              >
                <font-awesome-icon icon="save" />
              </div>
              <div
                title="Remove preset"
                class="flex flex-1 buttons text-center cursor-pointer items-center justify-center"
                @click="removePreset"
              >
                <font-awesome-icon icon="trash" />
              </div>
            </div>
          </template>
        </div>
        <div
          class="add-preset preset border-2 border-primary flex"
          @click="addPreset"
        >
          <span
            title="Add preset"
            class="text-center cursor-pointer"
          >
            <font-awesome-icon icon="plus" />
          </span>
        </div>
      </template>
      <template v-else>
        Select bank to view list of available presets…
      </template>
    </div>
  </div>
</template>

<script>
import NavBar from '@components/NavBar'
import { ACTION_LOAD_BANKS, GETTER_BANKS, GUITARIX_NAMESPACE } from '@plugins/guitarix'
import { ROUTE_RACK_VIEW } from '@router'

export default {
  name: 'PresetsView',

  components: { NavBar },

  data: () => ({
    banks: [],
    menuCollapsed: false,
    selectedBankName: null,
    selectedPresetName: null
  }),

  computed: {
    selectedBank () {
      return this.$store.getters[`${GUITARIX_NAMESPACE}/${GETTER_BANKS}`].find(bank => bank.name === this.selectedBankName)
    },

    menu () {
      return [
        {
          header: true,
          title: 'Banks',
          hiddenOnCollapse: true
        },
        ...this.$store.getters[`${GUITARIX_NAMESPACE}/${GETTER_BANKS}`].map(bank => ({
          title: bank.name,
          class: this.selectedBankName === bank.name ? 'selected' : '',
          bank
        }))
      ]
    }
  },

  watch: {
    selectedBankName () {
      this.selectedPresetName = null
    }
  },

  created () {
    this.$store.dispatch(`${GUITARIX_NAMESPACE}/${ACTION_LOAD_BANKS}`)
  },

  methods: {
    handleBankClick (e, item) {
      this.selectedBankName = item.bank.name
    },

    async addBank () {
      const name = prompt('Enter bank name')

      if (name == null) {
        return
      }

      await this.$guitarix.sendMessage('bank_insert_new', [name])
      await this.$store.dispatch(`${GUITARIX_NAMESPACE}/${ACTION_LOAD_BANKS}`)
    },

    async removeBank () {
      if (!confirm('Are you sure you want to remove bank?')) {
        return
      }

      await this.$guitarix.sendMessage('bank_remove', [this.selectedBankName])
      await this.$store.dispatch(`${GUITARIX_NAMESPACE}/${ACTION_LOAD_BANKS}`)
    },

    async addPreset () {
      const name = prompt('Enter preset name')

      if (name == null) {
        return
      }

      if (this.selectedBank.presets.indexOf(name) !== -1) {
        alert('Preset with the same name already exists')
        return
      }

      await this.$guitarix.sendMessage('save_preset', [this.selectedBankName, name])
      await this.$store.dispatch(`${GUITARIX_NAMESPACE}/${ACTION_LOAD_BANKS}`)
    },

    async loadPreset () {
      if (!confirm('Are you sure you want to load preset? All unsaved changes will be lost.')) {
        return
      }

      await this.$guitarix.sendMessage('setpreset', [this.selectedBankName, this.selectedPresetName])
      this.$router.push({ name: ROUTE_RACK_VIEW })
    },

    async removePreset () {
      if (!confirm('Are you sure you want to remove preset?')) {
        return
      }

      await this.$guitarix.sendMessage('erase_preset', [this.selectedBankName, this.selectedPresetName])
      await this.$store.dispatch(`${GUITARIX_NAMESPACE}/${ACTION_LOAD_BANKS}`)
    },

    async savePreset () {
      if (confirm('Are you sure you want to overwrite selected preset?')) {
        await this.$guitarix.sendMessage('save_preset', [this.selectedBankName, this.selectedPresetName])
        this.selectedPresetName = null
      }
    }
  }
}
</script>

<style scoped>
  .presets-view {
    margin-left: 50px;
    transition: 0.3s ease;
  }

  .presets-view.menu-expanded {
    margin-left: 250px;
  }

  .presets-view .wrapper {
    flex: 1;

    display: flex;

    justify-content: space-evenly;
    align-items: center;
    align-content: space-evenly;
    flex-wrap: wrap;
  }

  .presets-view .wrapper .preset {
    cursor: pointer;
    width: 200px;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
  }

  .presets-view .wrapper .preset:hover:not(.selected) {
    @apply bg-accent;
  }

  .presets-view .wrapper .preset:active:not(.selected) {
    @apply border-4;
  }

  .presets-view .wrapper .preset.selected {
    @apply border-accent;

    flex-direction: column;
  }

  .presets-view .wrapper .preset.selected .buttons:hover {
    @apply bg-accent;
  }

  .presets-view .wrapper .preset.add-preset:not(:hover) {
    @apply text-accent;
  }

</style>
