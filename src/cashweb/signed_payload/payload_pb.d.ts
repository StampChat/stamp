// package: wrapper
// file: payload.proto

import * as jspb from "google-protobuf";

export class BurnOutputs extends jspb.Message {
  getTx(): Uint8Array | string;
  getTx_asU8(): Uint8Array;
  getTx_asB64(): string;
  setTx(value: Uint8Array | string): void;

  getIndex(): number;
  setIndex(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BurnOutputs.AsObject;
  static toObject(includeInstance: boolean, msg: BurnOutputs): BurnOutputs.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BurnOutputs, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BurnOutputs;
  static deserializeBinaryFromReader(message: BurnOutputs, reader: jspb.BinaryReader): BurnOutputs;
}

export namespace BurnOutputs {
  export type AsObject = {
    tx: Uint8Array | string,
    index: number,
  }
}

export class SignedPayload extends jspb.Message {
  getPublicKey(): Uint8Array | string;
  getPublicKey_asU8(): Uint8Array;
  getPublicKey_asB64(): string;
  setPublicKey(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  getScheme(): SignedPayload.SignatureSchemeMap[keyof SignedPayload.SignatureSchemeMap];
  setScheme(value: SignedPayload.SignatureSchemeMap[keyof SignedPayload.SignatureSchemeMap]): void;

  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  getPayloadDigest(): Uint8Array | string;
  getPayloadDigest_asU8(): Uint8Array;
  getPayloadDigest_asB64(): string;
  setPayloadDigest(value: Uint8Array | string): void;

  getBurnAmount(): number;
  setBurnAmount(value: number): void;

  clearTransactionsList(): void;
  getTransactionsList(): Array<BurnOutputs>;
  setTransactionsList(value: Array<BurnOutputs>): void;
  addTransactions(value?: BurnOutputs, index?: number): BurnOutputs;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignedPayload.AsObject;
  static toObject(includeInstance: boolean, msg: SignedPayload): SignedPayload.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignedPayload, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignedPayload;
  static deserializeBinaryFromReader(message: SignedPayload, reader: jspb.BinaryReader): SignedPayload;
}

export namespace SignedPayload {
  export type AsObject = {
    publicKey: Uint8Array | string,
    signature: Uint8Array | string,
    scheme: SignedPayload.SignatureSchemeMap[keyof SignedPayload.SignatureSchemeMap],
    payload: Uint8Array | string,
    payloadDigest: Uint8Array | string,
    burnAmount: number,
    transactionsList: Array<BurnOutputs.AsObject>,
  }

  export interface SignatureSchemeMap {
    SCHNORR: 0;
    ECDSA: 1;
  }

  export const SignatureScheme: SignatureSchemeMap;
}

export class SignedPayloadSet extends jspb.Message {
  clearItemsList(): void;
  getItemsList(): Array<SignedPayload>;
  setItemsList(value: Array<SignedPayload>): void;
  addItems(value?: SignedPayload, index?: number): SignedPayload;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SignedPayloadSet.AsObject;
  static toObject(includeInstance: boolean, msg: SignedPayloadSet): SignedPayloadSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SignedPayloadSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SignedPayloadSet;
  static deserializeBinaryFromReader(message: SignedPayloadSet, reader: jspb.BinaryReader): SignedPayloadSet;
}

export namespace SignedPayloadSet {
  export type AsObject = {
    itemsList: Array<SignedPayload.AsObject>,
  }
}

