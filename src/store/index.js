import { PublicKey } from 'bitcore-lib-cash'
import VCard from 'vcf'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from ''

import addressmetadata from '../keyserver/addressmetadata_pb'
import relayConstructors from '../relay/constructors'
import crypto from '../relay/crypto'
import messages from '../relay/messages_pb'

const cashlib = require('bitcore-lib-cash')

Vue.use(Vuex)

const vuexLocal = new VuexPersistence({ storage: window.localStorage })

export default new Vuex.Store({ modules, plugins: [vuexLocal.plugin] })
