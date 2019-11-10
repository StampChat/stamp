<template>
  <div id="q-app">
    <router-view />
  </div>
</template>

<script>
import { mapActions } from 'vuex'
var path = require('path')
var grpc = require('grpc')

export default {
  name: 'App',
  methods: {
    ...mapActions(['startClock']),
    ...mapActions({
      startProfileUpdater: 'contacts/startProfileUpdater',
      setProfile: 'myProfile/setMyProfile'
    })
  },
  mounted () {
    this.setProfile({ 'name': null, 'address': null })
  },
  created () {
    this.startClock()
    this.startProfileUpdater()

    var PROTO_PATH = path.join(__dirname, '/protos/transaction.proto')
    var protoLoader = require('@grpc/proto-loader')
    // Suggested options for similarity to existing grpc.load behavior
    var packageDefinition = protoLoader.loadSync(
      PROTO_PATH,
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      })
    var protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
    // The protoDescriptor object has the full package hierarchy
    var routeguide = protoDescriptor.transaction
    console.log(routeguide)
  }
}
</script>
