// package: broadcast
// file: broadcast.proto

import * as jspb from "google-protobuf";

export class AgoraPost extends jspb.Message {
  getTitle(): string;
  setTitle(value: string): void;

  getUrl(): string;
  setUrl(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AgoraPost.AsObject;
  static toObject(includeInstance: boolean, msg: AgoraPost): AgoraPost.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AgoraPost, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AgoraPost;
  static deserializeBinaryFromReader(message: AgoraPost, reader: jspb.BinaryReader): AgoraPost;
}

export namespace AgoraPost {
  export type AsObject = {
    title: string,
    url: string,
    message: string,
  }
}

export class BroadcastEntry extends jspb.Message {
  getKind(): string;
  setKind(value: string): void;

  getHeadersMap(): jspb.Map<string, string>;
  clearHeadersMap(): void;
  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BroadcastEntry.AsObject;
  static toObject(includeInstance: boolean, msg: BroadcastEntry): BroadcastEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BroadcastEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BroadcastEntry;
  static deserializeBinaryFromReader(message: BroadcastEntry, reader: jspb.BinaryReader): BroadcastEntry;
}

export namespace BroadcastEntry {
  export type AsObject = {
    kind: string,
    headersMap: Array<[string, string]>,
    payload: Uint8Array | string,
  }
}

export class BroadcastMessage extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): void;

  getTimestamp(): number;
  setTimestamp(value: number): void;

  clearEntriesList(): void;
  getEntriesList(): Array<BroadcastEntry>;
  setEntriesList(value: Array<BroadcastEntry>): void;
  addEntries(value?: BroadcastEntry, index?: number): BroadcastEntry;

  getParentDigest(): Uint8Array | string;
  getParentDigest_asU8(): Uint8Array;
  getParentDigest_asB64(): string;
  setParentDigest(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BroadcastMessage.AsObject;
  static toObject(includeInstance: boolean, msg: BroadcastMessage): BroadcastMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BroadcastMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BroadcastMessage;
  static deserializeBinaryFromReader(message: BroadcastMessage, reader: jspb.BinaryReader): BroadcastMessage;
}

export namespace BroadcastMessage {
  export type AsObject = {
    topic: string,
    timestamp: number,
    entriesList: Array<BroadcastEntry.AsObject>,
    parentDigest: Uint8Array | string,
  }
}

