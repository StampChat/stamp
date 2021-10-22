// package: wrapper
// file: wrapper.proto

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

export class AuthWrapper extends jspb.Message {
  getPublicKey(): Uint8Array | string;
  getPublicKey_asU8(): Uint8Array;
  getPublicKey_asB64(): string;
  setPublicKey(value: Uint8Array | string): void;

  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  getScheme(): AuthWrapper.SignatureSchemeMap[keyof AuthWrapper.SignatureSchemeMap];
  setScheme(value: AuthWrapper.SignatureSchemeMap[keyof AuthWrapper.SignatureSchemeMap]): void;

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
  toObject(includeInstance?: boolean): AuthWrapper.AsObject;
  static toObject(includeInstance: boolean, msg: AuthWrapper): AuthWrapper.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AuthWrapper, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AuthWrapper;
  static deserializeBinaryFromReader(message: AuthWrapper, reader: jspb.BinaryReader): AuthWrapper;
}

export namespace AuthWrapper {
  export type AsObject = {
    publicKey: Uint8Array | string,
    signature: Uint8Array | string,
    scheme: AuthWrapper.SignatureSchemeMap[keyof AuthWrapper.SignatureSchemeMap],
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

export class AuthWrapperSet extends jspb.Message {
  clearItemsList(): void;
  getItemsList(): Array<AuthWrapper>;
  setItemsList(value: Array<AuthWrapper>): void;
  addItems(value?: AuthWrapper, index?: number): AuthWrapper;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AuthWrapperSet.AsObject;
  static toObject(includeInstance: boolean, msg: AuthWrapperSet): AuthWrapperSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AuthWrapperSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AuthWrapperSet;
  static deserializeBinaryFromReader(message: AuthWrapperSet, reader: jspb.BinaryReader): AuthWrapperSet;
}

export namespace AuthWrapperSet {
  export type AsObject = {
    itemsList: Array<AuthWrapper.AsObject>,
  }
}

