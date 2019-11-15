// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var transaction_pb = require('./transaction_pb.js');

function serialize_transaction_BroadcastRequest(arg) {
  if (!(arg instanceof transaction_pb.BroadcastRequest)) {
    throw new Error('Expected argument of type transaction.BroadcastRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_BroadcastRequest(buffer_arg) {
  return transaction_pb.BroadcastRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_BroadcastResponse(arg) {
  if (!(arg instanceof transaction_pb.BroadcastResponse)) {
    throw new Error('Expected argument of type transaction.BroadcastResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_BroadcastResponse(buffer_arg) {
  return transaction_pb.BroadcastResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_IdFromPosRequest(arg) {
  if (!(arg instanceof transaction_pb.IdFromPosRequest)) {
    throw new Error('Expected argument of type transaction.IdFromPosRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_IdFromPosRequest(buffer_arg) {
  return transaction_pb.IdFromPosRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_IdFromPosResponse(arg) {
  if (!(arg instanceof transaction_pb.IdFromPosResponse)) {
    throw new Error('Expected argument of type transaction.IdFromPosResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_IdFromPosResponse(buffer_arg) {
  return transaction_pb.IdFromPosResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_MerkleBranchRequest(arg) {
  if (!(arg instanceof transaction_pb.MerkleBranchRequest)) {
    throw new Error('Expected argument of type transaction.MerkleBranchRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_MerkleBranchRequest(buffer_arg) {
  return transaction_pb.MerkleBranchRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_MerkleBranchResponse(arg) {
  if (!(arg instanceof transaction_pb.MerkleBranchResponse)) {
    throw new Error('Expected argument of type transaction.MerkleBranchResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_MerkleBranchResponse(buffer_arg) {
  return transaction_pb.MerkleBranchResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_TransactionRequest(arg) {
  if (!(arg instanceof transaction_pb.TransactionRequest)) {
    throw new Error('Expected argument of type transaction.TransactionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_TransactionRequest(buffer_arg) {
  return transaction_pb.TransactionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_transaction_TransactionResponse(arg) {
  if (!(arg instanceof transaction_pb.TransactionResponse)) {
    throw new Error('Expected argument of type transaction.TransactionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_transaction_TransactionResponse(buffer_arg) {
  return transaction_pb.TransactionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var TransactionService = exports.TransactionService = {
  // Broadcast a transaction to the network.
  broadcast: {
    path: '/transaction.Transaction/Broadcast',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.BroadcastRequest,
    responseType: transaction_pb.BroadcastResponse,
    requestSerialize: serialize_transaction_BroadcastRequest,
    requestDeserialize: deserialize_transaction_BroadcastRequest,
    responseSerialize: serialize_transaction_BroadcastResponse,
    responseDeserialize: deserialize_transaction_BroadcastResponse,
  },
  // Return a raw transaction.
  transaction: {
    path: '/transaction.Transaction/Transaction',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.TransactionRequest,
    responseType: transaction_pb.TransactionResponse,
    requestSerialize: serialize_transaction_TransactionRequest,
    requestDeserialize: deserialize_transaction_TransactionRequest,
    responseSerialize: serialize_transaction_TransactionResponse,
    responseDeserialize: deserialize_transaction_TransactionResponse,
  },
  // Return the merkle branch of a confirmed transaction given its hash.
  merkleBranch: {
    path: '/transaction.Transaction/MerkleBranch',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.MerkleBranchRequest,
    responseType: transaction_pb.MerkleBranchResponse,
    requestSerialize: serialize_transaction_MerkleBranchRequest,
    requestDeserialize: deserialize_transaction_MerkleBranchRequest,
    responseSerialize: serialize_transaction_MerkleBranchResponse,
    responseDeserialize: deserialize_transaction_MerkleBranchResponse,
  },
  // Return a transaction hash and optionally a merkle proof, given a block
  // height and a position in the block.
  idFromPos: {
    path: '/transaction.Transaction/IdFromPos',
    requestStream: false,
    responseStream: false,
    requestType: transaction_pb.IdFromPosRequest,
    responseType: transaction_pb.IdFromPosResponse,
    requestSerialize: serialize_transaction_IdFromPosRequest,
    requestDeserialize: deserialize_transaction_IdFromPosRequest,
    responseSerialize: serialize_transaction_IdFromPosResponse,
    responseDeserialize: deserialize_transaction_IdFromPosResponse,
  },
};

exports.TransactionClient = grpc.makeGenericClientConstructor(TransactionService);
