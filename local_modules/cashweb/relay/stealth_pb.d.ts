// package: stealth
// file: stealth.proto

import * as jspb from "google-protobuf";

export class StealthOutpoints extends jspb.Message {
  getStealthTx(): Uint8Array | string;
  getStealthTx_asU8(): Uint8Array;
  getStealthTx_asB64(): string;
  setStealthTx(value: Uint8Array | string): void;

  clearVoutsList(): void;
  getVoutsList(): Array<number>;
  setVoutsList(value: Array<number>): void;
  addVouts(value: number, index?: number): number;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StealthOutpoints.AsObject;
  static toObject(includeInstance: boolean, msg: StealthOutpoints): StealthOutpoints.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StealthOutpoints, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StealthOutpoints;
  static deserializeBinaryFromReader(message: StealthOutpoints, reader: jspb.BinaryReader): StealthOutpoints;
}

export namespace StealthOutpoints {
  export type AsObject = {
    stealthTx: Uint8Array | string,
    voutsList: Array<number>,
  }
}

export class StealthPaymentEntry extends jspb.Message {
  getEphemeralPubKey(): Uint8Array | string;
  getEphemeralPubKey_asU8(): Uint8Array;
  getEphemeralPubKey_asB64(): string;
  setEphemeralPubKey(value: Uint8Array | string): void;

  clearOutpointsList(): void;
  getOutpointsList(): Array<StealthOutpoints>;
  setOutpointsList(value: Array<StealthOutpoints>): void;
  addOutpoints(value?: StealthOutpoints, index?: number): StealthOutpoints;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StealthPaymentEntry.AsObject;
  static toObject(includeInstance: boolean, msg: StealthPaymentEntry): StealthPaymentEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StealthPaymentEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StealthPaymentEntry;
  static deserializeBinaryFromReader(message: StealthPaymentEntry, reader: jspb.BinaryReader): StealthPaymentEntry;
}

export namespace StealthPaymentEntry {
  export type AsObject = {
    ephemeralPubKey: Uint8Array | string,
    outpointsList: Array<StealthOutpoints.AsObject>,
  }
}

