const path = require('path')
const grpc = require('@grpc/grpc-js')

let PROTO_PATH =
    [
      path.join(__dirname, './transaction.proto'),
      path.join(__dirname, './script_hash.proto')
    ]

let protoLoader = require('@grpc/proto-loader')

// Suggested options for similarity to existing grpc.load behavior
let packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

// The protoDescriptor object has the full package hierarchy
let protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
let transaction = protoDescriptor.transaction
let scriptHash = protoDescriptor.script_hash

export default {
  transaction, scriptHash
}
