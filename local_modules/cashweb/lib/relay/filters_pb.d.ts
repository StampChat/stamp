// package: filters
// file: filters.proto

import * as jspb from "google-protobuf";

export class PriceFilter extends jspb.Message {
  getPublic(): boolean;
  setPublic(value: boolean): void;

  getAcceptancePrice(): number;
  setAcceptancePrice(value: number): void;

  getNotificationPrice(): number;
  setNotificationPrice(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PriceFilter.AsObject;
  static toObject(includeInstance: boolean, msg: PriceFilter): PriceFilter.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PriceFilter, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PriceFilter;
  static deserializeBinaryFromReader(message: PriceFilter, reader: jspb.BinaryReader): PriceFilter;
}

export namespace PriceFilter {
  export type AsObject = {
    pb_public: boolean,
    acceptancePrice: number,
    notificationPrice: number,
  }
}

export class Filters extends jspb.Message {
  hasPriceFilter(): boolean;
  clearPriceFilter(): void;
  getPriceFilter(): PriceFilter | undefined;
  setPriceFilter(value?: PriceFilter): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Filters.AsObject;
  static toObject(includeInstance: boolean, msg: Filters): Filters.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Filters, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Filters;
  static deserializeBinaryFromReader(message: Filters, reader: jspb.BinaryReader): Filters;
}

export namespace Filters {
  export type AsObject = {
    priceFilter?: PriceFilter.AsObject,
  }
}

