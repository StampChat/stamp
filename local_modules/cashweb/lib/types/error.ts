export interface BaseError extends Error {
  type?: string;
  payloadDigest?: Buffer;
  response?: {
    status: number;
    data: Uint8Array;
  };
}
