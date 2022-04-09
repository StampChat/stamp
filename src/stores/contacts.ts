import { PublicKey } from 'bitcore-lib-xpi'
import { defineStore } from 'pinia'

import { useChatStore } from './chats'

import { ReadOnlyRelayClient } from '../cashweb/relay'
import {
  defaultUpdateInterval,
  pendingRelayData,
  defaultRelayUrl,
  keyservers,
  networkName,
  displayNetwork,
  defaultAcceptancePrice,
} from '../utils/constants'
import { KeyserverHandler } from '../cashweb/keyserver'
import moment from 'moment'
import { toAPIAddress, toDisplayAddress } from '../utils/address'
import { mapObjIndexed } from 'ramda'
import { assert } from 'console'
import { STORE_SCHEMA_VERSION } from 'src/boot/pinia'
import { markRaw } from 'vue'

type Profile = {
  name: string | null
  bio: string | null
  avatar: string | null
  pubKey: PublicKey | null
}

export type ContactState = {
  lastUpdateTime: number
  notify: boolean
  relayURL: string | null
  profile: Profile
  inbox: {
    acceptancePrice?: number
  }
}

export interface State {
  contacts: Record<string, ContactState | undefined>
  updateInterval: number
}

export const defaultContactsState = {
  contacts: {},
  updateInterval: defaultUpdateInterval,
}

type RestorableContactState = {
  lastUpdateTime: number
  notify: boolean
  relayURL: string | null
  profile: {
    name: string | null
    bio: string | null
    avatar: string | null
    pubKey: Uint8Array | null
  }
  inbox: {
    acceptancePrice?: number
  }
}

export type RestorableState = {
  contacts: Record<string, RestorableContactState>
  updateInterval: number
}

export function rehydrateContacts(contactState?: RestorableState): State {
  if (!contactState) {
    return defaultContactsState
  }

  // This is currentlœy a shim, we don't need any special rehydrate contact at this time.
  return {
    ...contactState,
    contacts: !contactState.contacts
      ? defaultContactsState.contacts
      : mapObjIndexed(contact => {
          assert(contact, 'Undefined contact?')
          const profile = contact?.profile
          return {
            ...contact,
            profile: {
              ...profile,
              pubKey: profile?.pubKey
                ? markRaw(PublicKey.fromBuffer(profile?.pubKey))
                : null,
            },
          }
        }, contactState.contacts),
  }
}

export const useContactStore = defineStore('contacts', {
  state: (): State => ({ ...defaultContactsState }),
  getters: {
    getNotify: state => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress]
        ? state.contacts[apiAddress]?.notify
        : false
    },
    getRelayURL: state => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress]
        ? state.contacts[apiAddress]?.relayURL
        : defaultRelayUrl
    },
    isContact: state => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return apiAddress in state.contacts
    },
    getContact:
      state =>
      (address: string): ContactState => {
        if (!address) {
          return {
            ...pendingRelayData,
            relayURL: null,
            profile: { ...pendingRelayData.profile, pubKey: null },
          }
        }
        const apiAddress = toDisplayAddress(address)

        return (
          state.contacts[apiAddress] ?? {
            ...pendingRelayData,
            relayURL: null,
            profile: { ...pendingRelayData.profile, pubKey: null },
          }
        )
      },
    getContacts: state => {
      return state.contacts
    },
    haveContact: state => (address: string) => {
      const apiAddress = toDisplayAddress(address)
      return !!state.contacts[apiAddress]
    },
    getContactProfile: state => (address: string) => {
      if (!address) {
        return { ...pendingRelayData.profile }
      }
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress]
        ? state.contacts[apiAddress]?.profile
        : { ...pendingRelayData.profile }
    },
    getAcceptancePrice: state => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress]?.inbox.acceptancePrice
    },
    getPubKey: state => (address: string) => {
      const apiAddress = toDisplayAddress(address)
      const contact = state.contacts[apiAddress]
      if (!contact || !contact?.profile) {
        return undefined
      }
      const pubKey = contact.profile.pubKey
      if (!pubKey) {
        return null
      }

      if ('buffer' in pubKey) {
        return markRaw(PublicKey.fromBuffer(pubKey))
      }

      if ('point' in pubKey) {
        return markRaw(pubKey)
      }

      return markRaw(PublicKey.fromBuffer(Uint8Array.from(pubKey)))
    },
  },
  actions: {
    addContact({
      address,
      contact,
    }: {
      address: string
      contact: Partial<ContactState>
    }) {
      const fixedContact = {
        ...contact,
        profile: {
          name: contact.profile?.name ?? null,
          bio: contact.profile?.bio ?? null,
          avatar: contact.profile?.avatar ?? null,
          pubKey: contact.profile?.pubKey
            ? markRaw(contact.profile?.pubKey)
            : null,
        },
        lastUpdateTime: contact.lastUpdateTime ?? 0,
        notify: true,
        relayURL: null,
        inbox: contact.inbox ?? { acceptancePrice: defaultAcceptancePrice },
      }
      const apiAddress = toDisplayAddress(address)

      this.contacts[apiAddress] = fixedContact
    },
    setUpdateInterval(interval: number) {
      this.updateInterval = interval
    },
    updateContact({
      address,
      profile,
      inbox,
    }: Partial<ContactState> & { address: string }) {
      const apiAddress = toDisplayAddress(address)
      const contact = this.contacts[apiAddress]
      if (!contact) {
        return
      }
      contact.lastUpdateTime = moment().valueOf()
      contact.profile = profile || contact.profile
      contact.inbox = inbox || contact.inbox
    },
    setNotify({ address, value }: { address: string; value: boolean }) {
      const apiAddress = toDisplayAddress(address)
      const contact = this.contacts[apiAddress]
      if (!contact) {
        return
      }
      contact.notify = value
    },
    addLoadingContact({
      address,
      pubKey,
    }: {
      address: string
      pubKey: PublicKey
    }) {
      const contact = {
        ...pendingRelayData,
        profile: { ...pendingRelayData.profile, pubKey: pubKey },
      }
      this.addContact({ address, contact })
    },
    deleteContact(address: string) {
      const chats = useChatStore()
      const apiAddress = toDisplayAddress(address)

      chats.clearChat(address)
      chats.deleteChat(address)
      delete this.contacts[apiAddress]
    },
    async fetchAndAddContact({
      address,
      contact,
    }: {
      address: string
      contact: Partial<ContactState>
    }) {
      if (this.isContact(address)) {
        return
      }
      // Validate address
      const displayAddress = toDisplayAddress(address) // TODO: Make generic

      if (!contact) {
        // Validate address
        const apiAddress = toAPIAddress(address) // TODO: Make generic

        // Pull information from keyserver then relay server
        const ksHandler = new KeyserverHandler({ keyservers, networkName })
        const relayURL = await ksHandler.getRelayUrl(apiAddress)
        if (!relayURL) {
          return
        }
        const relayClient = new ReadOnlyRelayClient(
          relayURL,
          networkName,
          displayNetwork,
        )
        const relayData = await relayClient.getRelayData(apiAddress)
        if (!relayData) {
          return
        }
        this.addContact({
          address: displayAddress,
          contact: {
            ...relayData,
            relayURL,
            profile: {
              ...relayData.profile,
              pubKey: PublicKey.fromBuffer(relayData.profile.pubKey),
            },
          },
        })
      } else {
        this.addContact({
          address: displayAddress,
          contact,
        })
      }
      const chats = useChatStore()
      chats.setActiveChat(displayAddress)
    },
    addDefaultContact({ address, name }: { address: string; name: string }) {
      if (this.isContact(address)) {
        return
      }
      console.log('adding default contact', address)
      const contact = {
        ...pendingRelayData,
        profile: {
          ...pendingRelayData.profile,
          name: name,
          bio: '',
          avatar: null,
          pubKey: null,
        },
      }
      this.addContact({ address: address, contact })
      const chats = useChatStore()
      chats.openChat(address)
    },
    async refreshContacts() {
      for (const address of Object.keys(this.contacts)) {
        await this.refresh(address)
      }
    },
    async refresh(address: string) {
      // Make this generic over networks
      const oldContactInfo = this.getContact(address)
      const updateInterval = this.updateInterval
      const now = moment()
      const lastUpdateTime = oldContactInfo.lastUpdateTime ?? 0
      const expired =
        lastUpdateTime &&
        moment(lastUpdateTime).add(updateInterval, 'milliseconds').isBefore(now)
      const noPicture = oldContactInfo.profile && !oldContactInfo.profile.avatar
      if (!expired && !noPicture) {
        // Short circuit if we already updated this contact recently.
        console.log('skipping contact update, checked recently')
        return
      }
      console.log('Updating contact', address)

      // Get metadata
      try {
        const handler = new KeyserverHandler({ networkName, keyservers })
        const relayURL = await handler.getRelayUrl(address)
        if (!relayURL) {
          throw new Error(`Unable to find relay url for ${address}`)
        }

        const relayClient = new ReadOnlyRelayClient(
          relayURL,
          networkName,
          displayNetwork,
        )
        const relayData = await relayClient.getRelayData(address)
        this.updateContact({
          address,
          profile: {
            ...relayData.profile,
            pubKey: markRaw(PublicKey.fromBuffer(relayData.profile?.pubKey)),
          },
          inbox: relayData.inbox,
        })
      } catch (err) {
        console.error(err)
      }
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      storage.put('contacts', JSON.stringify(state))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage, metadata): Promise<Partial<State>> {
      let contacts = '{}'
      try {
        contacts = await storage.get('contacts')
      } catch (err) {
        //
      }
      const invalidStore =
        metadata.networkName !== displayNetwork ||
        metadata.version !== STORE_SCHEMA_VERSION
      if (invalidStore) {
        return { ...defaultContactsState }
      }

      const deserializedProfile = JSON.parse(contacts) as RestorableState
      const rehydratedContacts = await rehydrateContacts(deserializedProfile)
      return rehydratedContacts
    },
  },
})