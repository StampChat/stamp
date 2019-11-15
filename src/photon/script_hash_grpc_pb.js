// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var script_hash_pb = require('./script_hash_pb.js');

function serialize_script_hash_BalanceRequest(arg) {
  if (!(arg instanceof script_hash_pb.BalanceRequest)) {
    throw new Error('Expected argument of type script_hash.BalanceRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_BalanceRequest(buffer_arg) {
  return script_hash_pb.BalanceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_BalanceResponse(arg) {
  if (!(arg instanceof script_hash_pb.BalanceResponse)) {
    throw new Error('Expected argument of type script_hash.BalanceResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_BalanceResponse(buffer_arg) {
  return script_hash_pb.BalanceResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_HistoryRequest(arg) {
  if (!(arg instanceof script_hash_pb.HistoryRequest)) {
    throw new Error('Expected argument of type script_hash.HistoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_HistoryRequest(buffer_arg) {
  return script_hash_pb.HistoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_HistoryResponse(arg) {
  if (!(arg instanceof script_hash_pb.HistoryResponse)) {
    throw new Error('Expected argument of type script_hash.HistoryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_HistoryResponse(buffer_arg) {
  return script_hash_pb.HistoryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_ListUnspentRequest(arg) {
  if (!(arg instanceof script_hash_pb.ListUnspentRequest)) {
    throw new Error('Expected argument of type script_hash.ListUnspentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_ListUnspentRequest(buffer_arg) {
  return script_hash_pb.ListUnspentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_ListUnspentResponse(arg) {
  if (!(arg instanceof script_hash_pb.ListUnspentResponse)) {
    throw new Error('Expected argument of type script_hash.ListUnspentResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_ListUnspentResponse(buffer_arg) {
  return script_hash_pb.ListUnspentResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_SubscribeRequest(arg) {
  if (!(arg instanceof script_hash_pb.SubscribeRequest)) {
    throw new Error('Expected argument of type script_hash.SubscribeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_SubscribeRequest(buffer_arg) {
  return script_hash_pb.SubscribeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_script_hash_SubscribeResponse(arg) {
  if (!(arg instanceof script_hash_pb.SubscribeResponse)) {
    throw new Error('Expected argument of type script_hash.SubscribeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_script_hash_SubscribeResponse(buffer_arg) {
  return script_hash_pb.SubscribeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var ScriptHashService = exports.ScriptHashService = {
  // Return the confirmed and unconfirmed balances of a script hash.
  balance: {
    path: '/script_hash.ScriptHash/Balance',
    requestStream: false,
    responseStream: false,
    requestType: script_hash_pb.BalanceRequest,
    responseType: script_hash_pb.BalanceResponse,
    requestSerialize: serialize_script_hash_BalanceRequest,
    requestDeserialize: deserialize_script_hash_BalanceRequest,
    responseSerialize: serialize_script_hash_BalanceResponse,
    responseDeserialize: deserialize_script_hash_BalanceResponse,
  },
  // Return the confirmed and unconfirmed history of a script hash.
  history: {
    path: '/script_hash.ScriptHash/History',
    requestStream: false,
    responseStream: false,
    requestType: script_hash_pb.HistoryRequest,
    responseType: script_hash_pb.HistoryResponse,
    requestSerialize: serialize_script_hash_HistoryRequest,
    requestDeserialize: deserialize_script_hash_HistoryRequest,
    responseSerialize: serialize_script_hash_HistoryResponse,
    responseDeserialize: deserialize_script_hash_HistoryResponse,
  },
  // Return an ordered list of UTXOs sent to a script hash.
  listUnspent: {
    path: '/script_hash.ScriptHash/ListUnspent',
    requestStream: false,
    responseStream: false,
    requestType: script_hash_pb.ListUnspentRequest,
    responseType: script_hash_pb.ListUnspentResponse,
    requestSerialize: serialize_script_hash_ListUnspentRequest,
    requestDeserialize: deserialize_script_hash_ListUnspentRequest,
    responseSerialize: serialize_script_hash_ListUnspentResponse,
    responseDeserialize: deserialize_script_hash_ListUnspentResponse,
  },
  // Subscribe to a script hash.
  subscribe: {
    path: '/script_hash.ScriptHash/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: script_hash_pb.SubscribeRequest,
    responseType: script_hash_pb.SubscribeResponse,
    requestSerialize: serialize_script_hash_SubscribeRequest,
    requestDeserialize: deserialize_script_hash_SubscribeRequest,
    responseSerialize: serialize_script_hash_SubscribeResponse,
    responseDeserialize: deserialize_script_hash_SubscribeResponse,
  },
};

exports.ScriptHashClient = grpc.makeGenericClientConstructor(ScriptHashService);
