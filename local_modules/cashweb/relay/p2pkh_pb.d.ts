// package: p2pkh
// file: p2pkh.proto

import * as jspb from "google-protobuf";

export class P2PKHEntry extends jspb.Message {
  getTransaction(): Uint8Array | string;
  getTransaction_asU8(): Uint8Array;
  getTransaction_asB64(): string;
  setTransaction(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): P2PKHEntry.AsObject;
  static toObject(includeInstance: boolean, msg: P2PKHEntry): P2PKHEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: P2PKHEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): P2PKHEntry;
  static deserializeBinaryFromReader(message: P2PKHEntry, reader: jspb.BinaryReader): P2PKHEntry;
}

export namespace P2PKHEntry {
  export type AsObject = {
    transaction: Uint8Array | string,
  }
}

