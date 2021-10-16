// package: wrapper
// file: wrapper.proto

import * as jspb from "google-protobuf";

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
  }

  export interface SignatureSchemeMap {
    SCHNORR: 0;
    ECDSA: 1;
  }

  export const SignatureScheme: SignatureSchemeMap;
}

