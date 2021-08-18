// package: relay
// file: relay.proto

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

export class ProfileEntry extends jspb.Message {
  getKind(): string;
  setKind(value: string): void;

  clearHeadersList(): void;
  getHeadersList(): Array<Header>;
  setHeadersList(value: Array<Header>): void;
  addHeaders(value?: Header, index?: number): Header;

  getBody(): Uint8Array | string;
  getBody_asU8(): Uint8Array;
  getBody_asB64(): string;
  setBody(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProfileEntry.AsObject;
  static toObject(includeInstance: boolean, msg: ProfileEntry): ProfileEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProfileEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProfileEntry;
  static deserializeBinaryFromReader(message: ProfileEntry, reader: jspb.BinaryReader): ProfileEntry;
}

export namespace ProfileEntry {
  export type AsObject = {
    kind: string,
    headersList: Array<Header.AsObject>,
    body: Uint8Array | string,
  }
}

export class Profile extends jspb.Message {
  getTimestamp(): number;
  setTimestamp(value: number): void;

  getTtl(): number;
  setTtl(value: number): void;

  clearEntriesList(): void;
  getEntriesList(): Array<ProfileEntry>;
  setEntriesList(value: Array<ProfileEntry>): void;
  addEntries(value?: ProfileEntry, index?: number): ProfileEntry;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Profile.AsObject;
  static toObject(includeInstance: boolean, msg: Profile): Profile.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Profile, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Profile;
  static deserializeBinaryFromReader(message: Profile, reader: jspb.BinaryReader): Profile;
}

export namespace Profile {
  export type AsObject = {
    timestamp: number,
    ttl: number,
    entriesList: Array<ProfileEntry.AsObject>,
  }
}

export class PayloadEntry extends jspb.Message {
  getKind(): string;
  setKind(value: string): void;

  clearHeadersList(): void;
  getHeadersList(): Array<Header>;
  setHeadersList(value: Array<Header>): void;
  addHeaders(value?: Header, index?: number): Header;

  getBody(): Uint8Array | string;
  getBody_asU8(): Uint8Array;
  getBody_asB64(): string;
  setBody(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PayloadEntry.AsObject;
  static toObject(includeInstance: boolean, msg: PayloadEntry): PayloadEntry.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PayloadEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PayloadEntry;
  static deserializeBinaryFromReader(message: PayloadEntry, reader: jspb.BinaryReader): PayloadEntry;
}

export namespace PayloadEntry {
  export type AsObject = {
    kind: string,
    headersList: Array<Header.AsObject>,
    body: Uint8Array | string,
  }
}

export class Payload extends jspb.Message {
  getTimestamp(): number;
  setTimestamp(value: number): void;

  clearEntriesList(): void;
  getEntriesList(): Array<PayloadEntry>;
  setEntriesList(value: Array<PayloadEntry>): void;
  addEntries(value?: PayloadEntry, index?: number): PayloadEntry;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Payload.AsObject;
  static toObject(includeInstance: boolean, msg: Payload): Payload.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Payload, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Payload;
  static deserializeBinaryFromReader(message: Payload, reader: jspb.BinaryReader): Payload;
}

export namespace Payload {
  export type AsObject = {
    timestamp: number,
    entriesList: Array<PayloadEntry.AsObject>,
  }
}

export class StampOutpoints extends jspb.Message {
  getStampTx(): Uint8Array | string;
  getStampTx_asU8(): Uint8Array;
  getStampTx_asB64(): string;
  setStampTx(value: Uint8Array | string): void;

  clearVoutsList(): void;
  getVoutsList(): Array<number>;
  setVoutsList(value: Array<number>): void;
  addVouts(value: number, index?: number): number;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StampOutpoints.AsObject;
  static toObject(includeInstance: boolean, msg: StampOutpoints): StampOutpoints.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StampOutpoints, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StampOutpoints;
  static deserializeBinaryFromReader(message: StampOutpoints, reader: jspb.BinaryReader): StampOutpoints;
}

export namespace StampOutpoints {
  export type AsObject = {
    stampTx: Uint8Array | string,
    voutsList: Array<number>,
  }
}

export class Stamp extends jspb.Message {
  getStampType(): Stamp.StampTypeMap[keyof Stamp.StampTypeMap];
  setStampType(value: Stamp.StampTypeMap[keyof Stamp.StampTypeMap]): void;

  clearStampOutpointsList(): void;
  getStampOutpointsList(): Array<StampOutpoints>;
  setStampOutpointsList(value: Array<StampOutpoints>): void;
  addStampOutpoints(value?: StampOutpoints, index?: number): StampOutpoints;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Stamp.AsObject;
  static toObject(includeInstance: boolean, msg: Stamp): Stamp.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Stamp, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Stamp;
  static deserializeBinaryFromReader(message: Stamp, reader: jspb.BinaryReader): Stamp;
}

export namespace Stamp {
  export type AsObject = {
    stampType: Stamp.StampTypeMap[keyof Stamp.StampTypeMap],
    stampOutpointsList: Array<StampOutpoints.AsObject>,
  }

  export interface StampTypeMap {
    NONE: 0;
    MESSAGECOMMITMENT: 1;
  }

  export const StampType: StampTypeMap;
}

export class Message extends jspb.Message {
  getSourcePublicKey(): Uint8Array | string;
  getSourcePublicKey_asU8(): Uint8Array;
  getSourcePublicKey_asB64(): string;
  setSourcePublicKey(value: Uint8Array | string): void;

  getDestinationPublicKey(): Uint8Array | string;
  getDestinationPublicKey_asU8(): Uint8Array;
  getDestinationPublicKey_asB64(): string;
  setDestinationPublicKey(value: Uint8Array | string): void;

  getReceivedTime(): number;
  setReceivedTime(value: number): void;

  getPayloadDigest(): Uint8Array | string;
  getPayloadDigest_asU8(): Uint8Array;
  getPayloadDigest_asB64(): string;
  setPayloadDigest(value: Uint8Array | string): void;

  hasStamp(): boolean;
  clearStamp(): void;
  getStamp(): Stamp | undefined;
  setStamp(value?: Stamp): void;

  getScheme(): Message.EncryptionSchemeMap[keyof Message.EncryptionSchemeMap];
  setScheme(value: Message.EncryptionSchemeMap[keyof Message.EncryptionSchemeMap]): void;

  getSalt(): Uint8Array | string;
  getSalt_asU8(): Uint8Array;
  getSalt_asB64(): string;
  setSalt(value: Uint8Array | string): void;

  getPayloadHmac(): Uint8Array | string;
  getPayloadHmac_asU8(): Uint8Array;
  getPayloadHmac_asB64(): string;
  setPayloadHmac(value: Uint8Array | string): void;

  getPayloadSize(): number;
  setPayloadSize(value: number): void;

  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Message.AsObject;
  static toObject(includeInstance: boolean, msg: Message): Message.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Message, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Message;
  static deserializeBinaryFromReader(message: Message, reader: jspb.BinaryReader): Message;
}

export namespace Message {
  export type AsObject = {
    sourcePublicKey: Uint8Array | string,
    destinationPublicKey: Uint8Array | string,
    receivedTime: number,
    payloadDigest: Uint8Array | string,
    stamp?: Stamp.AsObject,
    scheme: Message.EncryptionSchemeMap[keyof Message.EncryptionSchemeMap],
    salt: Uint8Array | string,
    payloadHmac: Uint8Array | string,
    payloadSize: number,
    payload: Uint8Array | string,
  }

  export interface EncryptionSchemeMap {
    NONE: 0;
    EPHEMERALDH: 1;
  }

  export const EncryptionScheme: EncryptionSchemeMap;
}

export class MessageSet extends jspb.Message {
  clearMessagesList(): void;
  getMessagesList(): Array<Message>;
  setMessagesList(value: Array<Message>): void;
  addMessages(value?: Message, index?: number): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MessageSet.AsObject;
  static toObject(includeInstance: boolean, msg: MessageSet): MessageSet.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MessageSet, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MessageSet;
  static deserializeBinaryFromReader(message: MessageSet, reader: jspb.BinaryReader): MessageSet;
}

export namespace MessageSet {
  export type AsObject = {
    messagesList: Array<Message.AsObject>,
  }
}

export class PushError extends jspb.Message {
  getStatusCode(): number;
  setStatusCode(value: number): void;

  getErrorText(): string;
  setErrorText(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PushError.AsObject;
  static toObject(includeInstance: boolean, msg: PushError): PushError.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PushError, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PushError;
  static deserializeBinaryFromReader(message: PushError, reader: jspb.BinaryReader): PushError;
}

export namespace PushError {
  export type AsObject = {
    statusCode: number,
    errorText: string,
  }
}

export class PushErrors extends jspb.Message {
  getErrorsMap(): jspb.Map<number, PushError>;
  clearErrorsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PushErrors.AsObject;
  static toObject(includeInstance: boolean, msg: PushErrors): PushErrors.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PushErrors, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PushErrors;
  static deserializeBinaryFromReader(message: PushErrors, reader: jspb.BinaryReader): PushErrors;
}

export namespace PushErrors {
  export type AsObject = {
    errorsMap: Array<[number, PushError.AsObject]>,
  }
}

export class MessagePage extends jspb.Message {
  clearMessagesList(): void;
  getMessagesList(): Array<Message>;
  setMessagesList(value: Array<Message>): void;
  addMessages(value?: Message, index?: number): Message;

  getStartTime(): number;
  setStartTime(value: number): void;

  getEndTime(): number;
  setEndTime(value: number): void;

  getStartDigest(): Uint8Array | string;
  getStartDigest_asU8(): Uint8Array;
  getStartDigest_asB64(): string;
  setStartDigest(value: Uint8Array | string): void;

  getEndDigest(): Uint8Array | string;
  getEndDigest_asU8(): Uint8Array;
  getEndDigest_asB64(): string;
  setEndDigest(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MessagePage.AsObject;
  static toObject(includeInstance: boolean, msg: MessagePage): MessagePage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MessagePage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MessagePage;
  static deserializeBinaryFromReader(message: MessagePage, reader: jspb.BinaryReader): MessagePage;
}

export namespace MessagePage {
  export type AsObject = {
    messagesList: Array<Message.AsObject>,
    startTime: number,
    endTime: number,
    startDigest: Uint8Array | string,
    endDigest: Uint8Array | string,
  }
}

export class PayloadPage extends jspb.Message {
  clearPayloadsList(): void;
  getPayloadsList(): Array<Uint8Array | string>;
  getPayloadsList_asU8(): Array<Uint8Array>;
  getPayloadsList_asB64(): Array<string>;
  setPayloadsList(value: Array<Uint8Array | string>): void;
  addPayloads(value: Uint8Array | string, index?: number): Uint8Array | string;

  getStartTime(): number;
  setStartTime(value: number): void;

  getEndTime(): number;
  setEndTime(value: number): void;

  getStartDigest(): Uint8Array | string;
  getStartDigest_asU8(): Uint8Array;
  getStartDigest_asB64(): string;
  setStartDigest(value: Uint8Array | string): void;

  getEndDigest(): Uint8Array | string;
  getEndDigest_asU8(): Uint8Array;
  getEndDigest_asB64(): string;
  setEndDigest(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PayloadPage.AsObject;
  static toObject(includeInstance: boolean, msg: PayloadPage): PayloadPage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PayloadPage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PayloadPage;
  static deserializeBinaryFromReader(message: PayloadPage, reader: jspb.BinaryReader): PayloadPage;
}

export namespace PayloadPage {
  export type AsObject = {
    payloadsList: Array<Uint8Array | string>,
    startTime: number,
    endTime: number,
    startDigest: Uint8Array | string,
    endDigest: Uint8Array | string,
  }
}

