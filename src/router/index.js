import Vue from 'vue'
import VueRouter from 'vue-router'
import RackView from '@views/RackView'
import FxView from '@views/FxView'
import PresetsView from '@views/PresetsView'
import TunerView from '@views/TunerView'

Vue.use(VueRouter)

export const ROUTE_RACK_VIEW = 'RackView'

const routes = [
  {
    path: '/',
    name: ROUTE_RACK_VIEW,
    component: RackView
  },
  {
    path: '/presets',
    name: 'PresetsView',
    component: PresetsView
  },
  {
    path: '/tuner',
    name: 'TunerView',
    component: TunerView
  },
  {
    path: '/rack/:id',
    name: 'FxView',
    component: FxView
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
