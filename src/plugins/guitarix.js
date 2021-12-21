import utils from '@utils'

/**
 * TX: Transmitted
 * RX: Received
 * EX: Error
 * QU: Queue
 */
const { logger } = utils

export const GUITARIX_NAMESPACE = 'guitarix'

const {
  VUE_APP_GUITARIX_IGNORE_FX: FX_IGNORE_LIST,
  VUE_APP_WEBSOCKET_USE_BINARY_FORMAT: WEBSOCKET_USE_BINARY_FORMAT
} = process.env

// clean up fx ids
const fxIgnoreList = FX_IGNORE_LIST.split(',').map(fx => fx.trim())

const useWebsocketBinaryFormat = ['1', 'true', true].includes(WEBSOCKET_USE_BINARY_FORMAT.trim())

const methodsRequiringIds = new Set([
  'bank_check_reparse',
  'bank_get_contents',
  'bank_get_filename',
  'bank_insert_content',
  'bank_insert_new',
  'bank_remove',
  'banks',
  'convert_preset',
  'desc',
  'get',
  'get_bank',
  'get_last_midi_control_value',
  'get_midi_controller_map',
  'get_midi_feedback',
  'get_oscilloscope_mul_buffer',
  'get_parameter',
  'get_parameter_value',
  'get_rack_unit_order',
  'get_tuner_freq',
  'get_tuner_note',
  'get_tuner_switcher_active',
  'get_tuning',
  'getstate',
  'getversion',
  'jack_cpu_load',
  'ladspaloader_update_plugins',
  'list',
  'load_impresp_dirs',
  'load_ladspalist',
  'midi_get_config_mode',
  'midi_size',
  'parameterlist',
  'plugin_load_ui',
  'plugin_preset_list_load',
  'pluginlist',
  'presets',
  'queryunit',
  'read_audio',
  'rename_bank',
  'rename_preset'
])

class GuitarixSocket {
  /**
   * private methods
   */
  constructor (opts) {
    this._msgId = 1

    this._init(opts)
  }

  _init (opts) {
    // store opts
    this._opts = opts
    this._store = opts.store
    this.bus = opts.bus

    // create socket
    try {
      this._socket = new WebSocket(`ws://${opts.host}:${opts.port}`)
    } catch (e) {
      return this._attemptReconnect()
    }

    this._socket.onopen = this._onOpen.bind(this)
    this._socket.onclose = this._onClose.bind(this)
    this._socket.onmessage = this._onMessage.bind(this)
    this._socket.onerror = this._onError.bind(this)

    // create stores
    this._queue = []
    this._resolves = {}

    this._connected = false

    // debug
    window.guitarix = this
  }

  _onOpen () {
    this._connected = true
    this._store.dispatch(`${GUITARIX_NAMESPACE}/setOnlineStatus`, true)

    this.sendMessage(
      'listen',
      [
        'state',
        'freq',
        'display',
        'tuner',
        'presetlist_changed',
        'param',
        'units_changed',
        'preset'
      ]
    )

    if (this._queue.length) {
      logger('QU: ', this._queue)

      this._queue.forEach(e => this.sendMessage(e.method, e.params).then(r => e.resolve(r)))

      this._queue = []
    }
  }

  _onClose () {
    this._connected = false
    this._store.dispatch(`${GUITARIX_NAMESPACE}/setOnlineStatus`, false)

    this._attemptReconnect()
  }

  async _onMessage (response) {
    const jsonStrings = useWebsocketBinaryFormat ? (await response.data.text()).split('\n') : [response.data]

    for (const jsonString of jsonStrings) {
      if (jsonString === '') {
        continue
      }

      let msg
      try {
        msg = JSON.parse(jsonString)
        logger('RX: ', msg)
      } catch (e) {
        logger('EX: ', e)
        continue
      }

      // something we requested
      const resolve = this._resolves[msg.id]
      if (resolve != null) {
        delete this._resolves[msg.id]
        resolve(msg.result)
        continue
      }

      this.bus.$emit(`guitarix :: ${msg.method}`, msg)
    }
  }

  _onError (e) {
    this._store.dispatch(`${GUITARIX_NAMESPACE}/setOnlineStatus`, false)

    logger('EX: ', e)

    this._socket.close()
  }

  _attemptReconnect () {
    setTimeout(() => {
      this._init(this._opts)

      logger('Reconnecting...')
    }, 2000)
  }

  /**
   * public methods
   */
  sendMessage (method, params = []) {
    let _resolve
    const promise = new Promise(resolve => { _resolve = resolve })

    if (!this._connected) {
      this._queue.unshift({ method, params, resolve: _resolve })
      return promise
    }

    const msgId = this._msgId++

    this._resolves[msgId] = _resolve

    const jsonrpcMsg = {
      jsonrpc: '2.0',
      method,
      params
    }

    if (methodsRequiringIds.has(method)) {
      jsonrpcMsg.id = msgId
    }

    logger('TX: ', jsonrpcMsg)

    const jsonString = JSON.stringify(jsonrpcMsg)
    const payload = useWebsocketBinaryFormat ? new Blob([jsonString + '\n']) : jsonString

    this._socket.send(payload)

    if (jsonrpcMsg.id == null) {
      _resolve()
    }

    return promise
  }
}

export const ACTION_GET_FXS = 'getFxs'
export const ACTION_LOAD_BANKS = 'loadBanks'

const MUTATION_SET_BANKS = 'setBanks'

export const GETTER_BANKS = 'getBanks'

const GuitarixPlugin = {
  install (Vue, opts = {}) {
    var guitarixSocket = new GuitarixSocket(opts)

    // register vuex module
    opts.store.registerModule(GUITARIX_NAMESPACE, {
      namespaced: true,

      state: {
        online: true,
        fxs: [],
        banks: [],
        menuExpanded: false
      },

      getters: {
        online (state) {
          return state.online
        },

        menuExpanded (state) {
          return state.menuExpanded
        },

        activeFxs (state) {
          return state
            .fxs
            .filter(fx => fx.box_visible)
        },

        inactiveFxs (state) {
          return state
            .fxs
            .filter(fx => !fx.box_visible)
        },

        fxById: (state) => (id) => {
          return state.fxs.find(fx => fx.id === id)
        },

        [GETTER_BANKS]: state => state.banks
      },
      actions: {
        setOnlineStatus ({ commit }, online) {
          commit('setOnlineStatus', online)
        },

        setMenuExpanded ({ commit }, menuExpanded) {
          commit('setMenuExpanded', menuExpanded)
        },

        async [ACTION_GET_FXS] ({ commit }) {
          const plugins = await guitarixSocket.sendMessage(
            'get',
            [
              'sys.visible_mono_plugins',
              'sys.visible_stereo_plugins'
            ]
          )

          commit('setFxs', [
            ...plugins['sys.visible_mono_plugins'],
            ...plugins['sys.visible_stereo_plugins']
          ].filter(fx => {
            if (fxIgnoreList.includes(fx.id)) {
              logger('IFX: ', fx.id)
            }

            return !fxIgnoreList.includes(fx.id)
          }))
        },

        async [ACTION_LOAD_BANKS] ({ commit }) {
          const banks = await guitarixSocket.sendMessage(
            'banks',
            []
          )

          commit(MUTATION_SET_BANKS, banks)
        },

        insertFx ({ dispatch }, { fx, before, stereo }) {
          guitarixSocket.sendMessage(
            'insert_rack_unit',
            [
              fx,
              before,
              stereo
            ]
          )

          dispatch('getFxs')
        },

        removeFx ({ dispatch }, fx) {
          guitarixSocket.sendMessage(
            'remove_rack_unit',
            [
              fx.id,
              fx.stereo
            ]
          )

          dispatch('getFxs')
        },

        removeAllActiveFxs ({ dispatch, getters }) {
          getters.activeFxs.forEach(fx => {
            dispatch('removeFx', fx)
          })
        }
      },

      mutations: {
        setOnlineStatus (state, online) {
          state.online = online
        },

        setMenuExpanded (state, menuExpanded) {
          state.menuExpanded = menuExpanded
        },

        setFxs (state, fxs) {
          state.fxs = fxs
        },

        [MUTATION_SET_BANKS] (state, banks) {
          state.banks = banks
        }
      }
    }, {})

    // expose utils
    Vue.prototype.$guitarix = {
      sendMessage: guitarixSocket.sendMessage.bind(guitarixSocket),
      log: utils.logger
    }
  }
}

export default GuitarixPlugin
