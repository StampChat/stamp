const path = require('path')
const grpc = require('@grpc/grpc-js')

var PROTO_PATH =
    [
      path.join(__dirname, './transaction.proto'),
      path.join(__dirname, './script_hash.proto')
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

// The protoDescriptor object has the full package hierarchy
var protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const transaction = protoDescriptor.transaction
const scriptHash = protoDescriptor.script_hash

export default {
  transaction, scriptHash
}
