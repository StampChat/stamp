import { Address, Networks } from 'bitcore-lib-xpi'
import { networkName, displayNetwork } from './constants'

// These helper functions are here because we end up using
// different addresses in the codebase in different places.
// TODO: Need to audit everything to make sure the same versions
// are used everywhere.
export function toAPIAddress(address: string | Address) {
  return new Address(
    new Address(address).hashBuffer,
    Networks.get(networkName, undefined),
  ).toCashAddress()
}

export function toDisplayAddress(address: string | Address) {
  return new Address(
    new Address(address).hashBuffer,
    Networks.get(displayNetwork, undefined),
  ).toXAddress()
}
