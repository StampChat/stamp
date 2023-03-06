// package: keyserver
// file: metadata.proto

import * as jspb from "google-protobuf";

export class Header extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getValue(): string;
  setValue(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Header.AsObject;
  static toObject(includeInstance: boolean, msg: Header): Header.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Header, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Header;
  static deserializeBinaryFromReader(message: Header, reader: jspb.BinaryReader): Header;
}

export namespace Header {
  export type AsObject = {
    name: string,
    value: string,
  }
}

export class AddressEntry extends jspb.Message {
  getKind(): string;
  setKind(value: string): void;

  getHeadersMap(): jspb.Map<string, string>;
  clearHeadersMap(): void;
  getBody(): Uint8Array | string;
  getBody_asU8(): Uint8Array;
  getBody_asB64(): string;
  setBody(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddressEntry.AsObject;
  static toObject(includeInstance: boolean, msg: AddressEntry): AddressEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AddressEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddressEntry;
  static deserializeBinaryFromReader(message: AddressEntry, reader: jspb.BinaryReader): AddressEntry;
}

export namespace AddressEntry {
  export type AsObject = {
    kind: string,
    headersMap: Array<[string, string]>,
    body: Uint8Array | string,
  }
}

export class AddressMetadata extends jspb.Message {
  getPubkey(): Uint8Array | string;
  getPubkey_asU8(): Uint8Array;
  getPubkey_asB64(): string;
  setPubkey(value: Uint8Array | string): void;

  getTimestamp(): number;
  setTimestamp(value: number): void;

  getTtl(): number;
  setTtl(value: number): void;

  clearEntriesList(): void;
  getEntriesList(): Array<AddressEntry>;
  setEntriesList(value: Array<AddressEntry>): void;
  addEntries(value?: AddressEntry, index?: number): AddressEntry;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddressMetadata.AsObject;
  static toObject(includeInstance: boolean, msg: AddressMetadata): AddressMetadata.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AddressMetadata, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddressMetadata;
  static deserializeBinaryFromReader(message: AddressMetadata, reader: jspb.BinaryReader): AddressMetadata;
}

export namespace AddressMetadata {
  export type AsObject = {
    pubkey: Uint8Array | string,
    timestamp: number,
    ttl: number,
    entriesList: Array<AddressEntry.AsObject>,
  }
}

export class Peer extends jspb.Message {
  getUrl(): string;
  setUrl(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Peer.AsObject;
  static toObject(includeInstance: boolean, msg: Peer): Peer.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Peer, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Peer;
  static deserializeBinaryFromReader(message: Peer, reader: jspb.BinaryReader): Peer;
}

export namespace Peer {
  export type AsObject = {
    url: string,
  }
}

export class Peers extends jspb.Message {
  clearPeersList(): void;
  getPeersList(): Array<Peer>;
  setPeersList(value: Array<Peer>): void;
  addPeers(value?: Peer, index?: number): Peer;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Peers.AsObject;
  static toObject(includeInstance: boolean, msg: Peers): Peers.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Peers, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Peers;
  static deserializeBinaryFromReader(message: Peers, reader: jspb.BinaryReader): Peers;
}

export namespace Peers {
  export type AsObject = {
    peersList: Array<Peer.AsObject>,
  }
}

