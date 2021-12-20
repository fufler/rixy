import Vue from 'vue'
import App from '@app'
import router from '@router'
import store from '@store'

import { library } from '@fortawesome/fontawesome-svg-core'

import {
  faExpand,
  faCompress,
  faAngleRight,
  faArrowsAlt,
  faBars,
  faEllipsisV,
  faPowerOff,
  faTrashAlt,
  faUndo
} from '@fortawesome/free-solid-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import { SwipeList, SwipeOut } from 'vue-swipe-actions'

import Draggable from 'vuedraggable'
import VueSidebarMenu from 'vue-sidebar-menu'

import VueSelect from 'vue-select'

import GuitarixPlugin, { ACTION_GET_FXS, GUITARIX_NAMESPACE } from '@plugins/guitarix'

import 'vue-sidebar-menu/dist/vue-sidebar-menu.css'
import 'animate.css'
import 'vue-swipe-actions/dist/vue-swipe-actions.css'
import 'vue-select/dist/vue-select.css'

import '@assets/styles/tailwind.css'
import '@assets/styles/overrides.css'
import '@worker'

const {
  VUE_APP_GUITARIX_HOST: GUITARIX_HOST,
  VUE_APP_GUITARIX_PORT: GUITARIX_PORT
} = process.env

Vue.config.productionTip = false

library.add(
  faAngleRight,
  faArrowsAlt,
  faBars,
  faEllipsisV,
  faPowerOff,
  faTrashAlt,
  faUndo,
  faExpand,
  faCompress
)

Vue.component('FontAwesomeIcon', FontAwesomeIcon)
Vue.component('Draggable', Draggable)
Vue.component('SwipeList', SwipeList)
Vue.component('SwipeOut', SwipeOut)
Vue.component('VueSelect', VueSelect)

Vue.use(VueSidebarMenu)

Vue.prototype.$bus = new Vue()

Vue.use(GuitarixPlugin, {
  host: GUITARIX_HOST,
  port: GUITARIX_PORT,
  store,
  bus: Vue.prototype.$bus
})

const vm = new Vue({
  router,
  store,
  render: h => h(App)
})

vm.$bus.$on('guitarix :: preset_changed', () => vm.$store.dispatch(`${GUITARIX_NAMESPACE}/${ACTION_GET_FXS}`))

vm.$mount('#app')
