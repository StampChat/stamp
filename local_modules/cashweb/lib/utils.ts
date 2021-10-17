import { BaseError } from "./types/error";

export function validateBinary(input: unknown): input is Uint8Array {
  return Array.isArray(input);
}

export function validateError(input: unknown): input is BaseError {
  return typeof input === "object";
}

export const defaultAcceptancePrice = 100;
