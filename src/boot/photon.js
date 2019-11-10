import Vue from 'vue'

const path = require('path')
const grpc = require('@grpc/grpc-js')

var PROTO_PATH = [
  path.join(__dirname, '../photon/transaction.proto'),
  path.join(__dirname, '../photon/script_hash.proto')
]
var protoLoader = require('@grpc/proto-loader')
// Suggested options for similarity to existing grpc.load behavior
var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})
var protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
// The protoDescriptor object has the full package hierarchy

Vue.prototype.$photon = protoDescriptor
