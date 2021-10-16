// package: bip70
// file: paymentrequest.proto

import * as jspb from "google-protobuf";

export class Output extends jspb.Message {
  hasAmount(): boolean;
  clearAmount(): void;
  getAmount(): number | undefined;
  setAmount(value: number): void;

  hasScript(): boolean;
  clearScript(): void;
  getScript(): Uint8Array | string;
  getScript_asU8(): Uint8Array;
  getScript_asB64(): string;
  setScript(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Output.AsObject;
  static toObject(includeInstance: boolean, msg: Output): Output.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Output, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Output;
  static deserializeBinaryFromReader(message: Output, reader: jspb.BinaryReader): Output;
}

export namespace Output {
  export type AsObject = {
    amount?: number,
    script: Uint8Array | string,
  }
}

export class PaymentDetails extends jspb.Message {
  hasNetwork(): boolean;
  clearNetwork(): void;
  getNetwork(): string | undefined;
  setNetwork(value: string): void;

  clearOutputsList(): void;
  getOutputsList(): Array<Output>;
  setOutputsList(value: Array<Output>): void;
  addOutputs(value?: Output, index?: number): Output;

  hasTime(): boolean;
  clearTime(): void;
  getTime(): number | undefined;
  setTime(value: number): void;

  hasExpires(): boolean;
  clearExpires(): void;
  getExpires(): number | undefined;
  setExpires(value: number): void;

  hasMemo(): boolean;
  clearMemo(): void;
  getMemo(): string | undefined;
  setMemo(value: string): void;

  hasPaymentUrl(): boolean;
  clearPaymentUrl(): void;
  getPaymentUrl(): string | undefined;
  setPaymentUrl(value: string): void;

  hasMerchantData(): boolean;
  clearMerchantData(): void;
  getMerchantData(): Uint8Array | string;
  getMerchantData_asU8(): Uint8Array;
  getMerchantData_asB64(): string;
  setMerchantData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PaymentDetails.AsObject;
  static toObject(includeInstance: boolean, msg: PaymentDetails): PaymentDetails.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PaymentDetails, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PaymentDetails;
  static deserializeBinaryFromReader(message: PaymentDetails, reader: jspb.BinaryReader): PaymentDetails;
}

export namespace PaymentDetails {
  export type AsObject = {
    network?: string,
    outputsList: Array<Output.AsObject>,
    time?: number,
    expires?: number,
    memo?: string,
    paymentUrl?: string,
    merchantData: Uint8Array | string,
  }
}

export class PaymentRequest extends jspb.Message {
  hasPaymentDetailsVersion(): boolean;
  clearPaymentDetailsVersion(): void;
  getPaymentDetailsVersion(): number | undefined;
  setPaymentDetailsVersion(value: number): void;

  hasPkiType(): boolean;
  clearPkiType(): void;
  getPkiType(): string | undefined;
  setPkiType(value: string): void;

  hasPkiData(): boolean;
  clearPkiData(): void;
  getPkiData(): Uint8Array | string;
  getPkiData_asU8(): Uint8Array;
  getPkiData_asB64(): string;
  setPkiData(value: Uint8Array | string): void;

  hasSerializedPaymentDetails(): boolean;
  clearSerializedPaymentDetails(): void;
  getSerializedPaymentDetails(): Uint8Array | string;
  getSerializedPaymentDetails_asU8(): Uint8Array;
  getSerializedPaymentDetails_asB64(): string;
  setSerializedPaymentDetails(value: Uint8Array | string): void;

  hasSignature(): boolean;
  clearSignature(): void;
  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PaymentRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PaymentRequest): PaymentRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PaymentRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PaymentRequest;
  static deserializeBinaryFromReader(message: PaymentRequest, reader: jspb.BinaryReader): PaymentRequest;
}

export namespace PaymentRequest {
  export type AsObject = {
    paymentDetailsVersion?: number,
    pkiType?: string,
    pkiData: Uint8Array | string,
    serializedPaymentDetails: Uint8Array | string,
    signature: Uint8Array | string,
  }
}

export class X509Certificates extends jspb.Message {
  clearCertificateList(): void;
  getCertificateList(): Array<Uint8Array | string>;
  getCertificateList_asU8(): Array<Uint8Array>;
  getCertificateList_asB64(): Array<string>;
  setCertificateList(value: Array<Uint8Array | string>): void;
  addCertificate(value: Uint8Array | string, index?: number): Uint8Array | string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): X509Certificates.AsObject;
  static toObject(includeInstance: boolean, msg: X509Certificates): X509Certificates.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: X509Certificates, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): X509Certificates;
  static deserializeBinaryFromReader(message: X509Certificates, reader: jspb.BinaryReader): X509Certificates;
}

export namespace X509Certificates {
  export type AsObject = {
    certificateList: Array<Uint8Array | string>,
  }
}

export class Payment extends jspb.Message {
  hasMerchantData(): boolean;
  clearMerchantData(): void;
  getMerchantData(): Uint8Array | string;
  getMerchantData_asU8(): Uint8Array;
  getMerchantData_asB64(): string;
  setMerchantData(value: Uint8Array | string): void;

  clearTransactionsList(): void;
  getTransactionsList(): Array<Uint8Array | string>;
  getTransactionsList_asU8(): Array<Uint8Array>;
  getTransactionsList_asB64(): Array<string>;
  setTransactionsList(value: Array<Uint8Array | string>): void;
  addTransactions(value: Uint8Array | string, index?: number): Uint8Array | string;

  clearRefundToList(): void;
  getRefundToList(): Array<Output>;
  setRefundToList(value: Array<Output>): void;
  addRefundTo(value?: Output, index?: number): Output;

  hasMemo(): boolean;
  clearMemo(): void;
  getMemo(): string | undefined;
  setMemo(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Payment.AsObject;
  static toObject(includeInstance: boolean, msg: Payment): Payment.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Payment, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Payment;
  static deserializeBinaryFromReader(message: Payment, reader: jspb.BinaryReader): Payment;
}

export namespace Payment {
  export type AsObject = {
    merchantData: Uint8Array | string,
    transactionsList: Array<Uint8Array | string>,
    refundToList: Array<Output.AsObject>,
    memo?: string,
  }
}

export class PaymentACK extends jspb.Message {
  hasPayment(): boolean;
  clearPayment(): void;
  getPayment(): Payment;
  setPayment(value?: Payment): void;

  hasMemo(): boolean;
  clearMemo(): void;
  getMemo(): string | undefined;
  setMemo(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PaymentACK.AsObject;
  static toObject(includeInstance: boolean, msg: PaymentACK): PaymentACK.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: PaymentACK, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PaymentACK;
  static deserializeBinaryFromReader(message: PaymentACK, reader: jspb.BinaryReader): PaymentACK;
}

export namespace PaymentACK {
  export type AsObject = {
    payment: Payment.AsObject,
    memo?: string,
  }
}

