import axios from 'axios'
import {
  Payload,
  Message,
  MessagePage,
  MessageSet,
  Profile,
  PayloadEntry,
} from './relay_pb'
import p2pkh from './p2pkh_pb'

import { SignedPayload } from '../signed_payload/payload_pb'
import pop from '../pop'
// TODO: Relay code should not depend on Stamp base code. Fix this import
import VCard from 'vcf'
import EventEmitter from 'events'
import { MessageConstructor } from './constructors'
import { arrayBufferToBase64 } from './images'

import { PayloadConstructor } from './crypto'
import { messageMixin } from './extension'
import { calcUtxoId } from '../wallet/helpers'
import assert from 'assert'
import paymentrequest, { Payment } from '../bip70/paymentrequest_pb'

import WebSocket from 'isomorphic-ws'
import {
  PublicKey,
  crypto,
  Transaction,
  Networks,
  Address,
  PrivateKey,
} from 'bitcore-lib-xpi'
import { MessageStore } from './storage/storage'
import { Wallet } from '../wallet'
import { Utxo } from '../types/utxo'
import { defaultAcceptancePrice } from 'src/utils/constants'
import { pAll } from './pAll'
import type {
  ReceivedMessage,
  ReceivedMessageWrapper,
  UIOutput,
  UIStampOutput,
} from '../types/user-interface'
import type {
  MessageItem,
  MessageWrapper,
  P2PKHSendItem,
  ReplyItem,
  TextItem,
} from '../types/messages'
import { encodeEntry } from './encode-entry'
import { decodeEntry } from './decode-entry'

export class ReadOnlyRelayClient {
  url: string
  networkName: string
  displayNetwork: string
  networkPrefix: string

  constructor(url: string, networkName: string, displayNetwork: string) {
    this.url = url
    this.networkName = networkName
    this.networkPrefix = Networks.get(networkName).prefix
    this.displayNetwork = displayNetwork
  }

  toAPIAddress(address: string | Address): string {
    return new Address(
      new Address(address).hashBuffer,
      Networks.get(this.networkName, undefined),
    ).toCashAddress()
  }

  toXAddress(address: string | Address): string {
    return new Address(
      new Address(address).hashBuffer,
      Networks.get(this.displayNetwork, undefined),
    ).toXAddress()
  }

  async getRelayData(address: string | Address) {
    const addressLegacy = this.toAPIAddress(address)

    const url = `${this.url}/profiles/${addressLegacy}`
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
    })
    const metadata = SignedPayload.deserializeBinary(response.data)

    // Get PubKey
    const pubKey = metadata.getPublicKey()
    assert(typeof pubKey !== 'string', 'invalid type for pubKey')
    const rawPayload = metadata.getPayload()
    assert(typeof rawPayload !== 'string', 'invalid type for pubKey')

    const payload = Profile.deserializeBinary(rawPayload)

    // Find vCard
    function isVCard(entry: PayloadEntry) {
      return entry.getKind() === 'vcard'
    }
    const entryList = payload.getEntriesList()
    const rawCard = entryList.find(isVCard)?.getBody() // TODO: Cancel if not found
    assert(typeof rawCard !== 'string')
    let name = 'Undefined'
    try {
      const strCard = new TextDecoder().decode(rawCard)
      const vCard = new VCard().parse(strCard)
      name = vCard.data.fn.valueOf().toString()
    } catch (err) {
      console.error('Error parsing vcard', err)
    }
    // const bio = vCard.data.note._data
    const bio = ''

    // Get avatar
    function isAvatar(entry: PayloadEntry) {
      return entry.getKind() === 'avatar'
    }
    const avatarEntry = entryList.find(isAvatar)
    const rawAvatar = avatarEntry?.getBody()

    const value = avatarEntry?.getHeadersList()[0].getValue()
    assert(rawAvatar && typeof rawAvatar !== 'string')
    const avatarDataURL =
      'data:' + value + ';base64,' + arrayBufferToBase64(rawAvatar)

    const profile = {
      name,
      bio,
      avatar: avatarDataURL,
      pubKey,
    }
    const inbox = {
      acceptancePrice: 100, // TODO: Parse
    }
    const relayData = {
      profile,
      inbox,
      notify: true,
    }
    return relayData
  }
}

export class RelayClient extends ReadOnlyRelayClient {
  url: string
  events: EventEmitter
  wallet?: Wallet
  getPubKey: (address: string) => PublicKey | null
  messageStore: MessageStore
  relayReconnectInterval: number
  payloadConstructor: PayloadConstructor
  messageConstructor: MessageConstructor
  token?: string

  constructor(
    url: string,
    wallet: Wallet,
    {
      networkName = 'testnet',
      relayReconnectInterval = 10_000,
      getPubKey,
      messageStore,
    }: {
      relayReconnectInterval?: number
      networkName?: string
      messageStore: MessageStore
      getPubKey: (address: string) => PublicKey | null
    },
  ) {
    super(url, networkName, 'livenet')
    assert(networkName, 'Missing networkName while initializing RelayClient')
    assert(url, 'Missing url while initializing RelayClient')
    assert(getPubKey, 'Missing getPubKey while initializing RelayClient')
    assert(messageStore, 'Missing messageStore while initializing RelayClient')

    this.url = url
    this.events = new EventEmitter()
    this.wallet = wallet
    this.getPubKey = getPubKey
    this.messageStore = messageStore
    this.relayReconnectInterval = relayReconnectInterval
    this.payloadConstructor = new PayloadConstructor({ networkName })
    this.messageConstructor = new MessageConstructor({ networkName })
    this.token = undefined
  }

  setToken(token: string) {
    this.token = token
  }

  setWallet(wallet: Wallet) {
    this.wallet = wallet
  }

  async profilePaymentRequest(address: string) {
    const addressLegacy = this.toAPIAddress(address)

    const url = `${this.url}/profiles/${addressLegacy}`
    return await pop.getPaymentRequest(url, 'put')
  }

  setUpWebsocket(address: string | Address) {
    assert(this.token, 'missing tokenw hile setting up websocket')
    const addressLegacy = this.toAPIAddress(address)

    const url = new URL(`/ws/${addressLegacy}`, this.url)
    url.protocol = 'wss'
    url.searchParams.set('access_token', this.token)
    const socket = new WebSocket(url.toString())
    socket.binaryType = 'arraybuffer'

    socket.onmessage = event => {
      const buffer = event.data as ArrayBuffer
      const message = Message.deserializeBinary(new Uint8Array(buffer))
      this.receiveMessage(message)
        .then(async finalizedMessage => {
          if (!finalizedMessage) {
            // We didn't get a valid message, or we already processed it before
            return
          }
          await this.messageStore.saveMessage(finalizedMessage)
          this.events.emit('receivedMessages', [finalizedMessage])
        })
        .catch(err => console.error(err))
    }

    const disconnectHandler = () => {
      this.events.emit('disconnected')
      setTimeout(() => {
        assert(this.token, 'missing tokenw hile setting up websocket')
        this.setUpWebsocket(address)
      }, this.relayReconnectInterval)
    }

    socket.onerror = err => {
      this.events.emit('error', err)
    }
    socket.onclose = () => {
      disconnectHandler()
    }
    socket.onopen = () => {
      this.events.emit('opened')
    }
  }

  async getRawPayload(address: string, digest: Uint8Array) {
    assert(this.token, 'missing tokenw hile setting calling getRawPayload')
    const addressLegacy = this.toAPIAddress(address)

    const url = `${this.url}/payloads/${addressLegacy}`

    const hexDigest = Array.prototype.map
      .call(digest, x => ('00' + x.toString(16)).slice(-2))
      .join('')
    const response = await axios({
      method: 'get',
      url,
      headers: {
        Authorization: this.token,
      },
      params: {
        digest: hexDigest,
      },
      responseType: 'arraybuffer',
    })
    return response.data
  }

  async getPayload(address: string, digest: Uint8Array) {
    const addressLegacy = this.toAPIAddress(address)

    const rawPayload = await this.getRawPayload(addressLegacy, digest)
    const payload = Payload.deserializeBinary(rawPayload)
    return payload
  }

  async deleteMessage(digest: string) {
    assert(
      typeof digest === 'string',
      'message digest was not a string in deleteMessage',
    )
    assert(
      this.wallet,
      'Attempting to delete a message with no wallet available',
    )

    const message = await this.messageStore.getMessage(digest)
    assert(message, 'message not found?')

    // Send utxos to a change address
    const randomChangeIdx = (this.wallet.changeKeys.length * Math.random()) << 0
    const changeKey = this.wallet.changeKeys[randomChangeIdx]
    await this.wallet.forwardUTXOsToPubkey({
      utxos: message.message.outpoints,
      pubkey: changeKey.privKey.toPublicKey(),
    })
    assert(this.wallet.myAddress, 'Missing address? Wallet not loaded.')
    const url = `${this.url}/messages/${this.toAPIAddress(
      this.wallet.myAddress,
    )}`
    await axios({
      method: 'delete',
      url,
      headers: this.token
        ? {
            Authorization: this.token,
          }
        : undefined,
      params: {
        digest,
      },
    })
    this.messageStore.deleteMessage(digest)
  }

  async putProfile(address: string, metadata: SignedPayload) {
    const addressLegacy = this.toAPIAddress(address)

    const rawProfile = metadata.serializeBinary()
    const url = `${this.url}/profiles/${addressLegacy}`
    await axios({
      method: 'put',
      url: url,
      headers: this.token
        ? {
            Authorization: this.token,
          }
        : undefined,
      data: rawProfile,
    })
  }

  async getMessages(
    address: string,
    startTime: number,
    endTime?: number,
    retries = 3,
  ): Promise<MessagePage | void> {
    const addressLegacy = this.toAPIAddress(address)

    const url = `${this.url}/messages/${addressLegacy}`
    try {
      const response = await axios({
        method: 'get',
        url: url,
        headers: this.token
          ? {
              Authorization: this.token,
            }
          : undefined,
        params: {
          start_time: startTime,
          end_time: endTime,
        },
        responseType: 'arraybuffer',
      })
      assert(response.status === 200, 'We should not be here')
      const messagePage = MessagePage.deserializeBinary(response.data)
      return messagePage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const response = err.response
      if (response.status !== 402) {
        throw err
      }

      if (retries === 0) {
        throw err
      }

      // TODO: We need to ensure this payment is reasonable to the user, otherwise the relay server
      // could request amounts of money that are ridiculous.

      const paymentRequest = paymentrequest.PaymentRequest.deserializeBinary(
        response.data,
      )
      const serializedPaymentDetails =
        paymentRequest.getSerializedPaymentDetails()
      assert(
        typeof serializedPaymentDetails !== 'string',
        'serializedPaymentDetails is a string?',
      )
      const paymentDetails = paymentrequest.PaymentDetails.deserializeBinary(
        serializedPaymentDetails,
      )
      assert(this.wallet, 'Wallet not properly setup?')
      const { paymentUrl, payment } = await pop.constructPaymentTransaction(
        this.wallet,
        paymentDetails,
      )
      const paymentUrlFull = new URL(paymentUrl, this.url)
      console.log('Sending payment to', paymentUrlFull.href)
      const { token } = await pop.sendPayment(paymentUrlFull.href, payment)
      this.setToken(token)
      return this.getMessages(address, startTime, endTime, retries--)
    }
  }

  async messagePaymentRequest(address: string) {
    const addressLegacy = this.toAPIAddress(address)

    const url = `${this.url}/messages/${addressLegacy}`
    return await pop.getPaymentRequest(url, 'get')
  }

  async sendPayment(paymentUrl: string, payment: Payment) {
    return await pop.sendPayment(paymentUrl, payment)
  }

  async pushMessages(address: string, messageSet: MessageSet) {
    const addressLegacy = this.toAPIAddress(address)

    const rawMetadata = messageSet.serializeBinary()
    const url = `${this.url}/messages/${addressLegacy}`
    await axios({
      method: 'put',
      url: url,
      data: rawMetadata,
    })
  }

  async sendMessageImpl({
    address,
    items,
    stampAmount,
    errCount = 0,
    previousHash,
  }: {
    address: string
    items: MessageItem[]
    stampAmount: number
    errCount?: number
    previousHash?: string
  }) {
    const wallet = this.wallet
    assert(wallet, 'Trying to call sendMessageImply with wallet unset')
    const sourcePrivateKey = wallet?.identityPrivKey
    assert(sourcePrivateKey, 'Missing identityPrivateKey')
    const destinationPublicKey =
      address === wallet?.myAddress?.toXAddress()
        ? wallet?.identityPrivKey?.publicKey
        : this.getPubKey(address)
    assert(destinationPublicKey, 'Unable to set destination public key')
    const senderAddress = this.wallet?.myAddress?.toXAddress()
    assert(senderAddress, 'Unable to set senderAddress')

    const stagedUtxos: Utxo[] = []
    const outpoints: UIOutput[] = []
    const transactions: Transaction[] = []
    const entries: PayloadEntry[] = []

    // Construct payload
    for (const item of items) {
      assert(this.wallet, 'wallet missing while trying to construct a message')
      const [entry, entryTransactions, entryUtxos, entryOutpoints] =
        encodeEntry(item, destinationPublicKey, {
          wallet,
          messageConstructor: this.messageConstructor,
        })
      stagedUtxos.push(...entryUtxos)
      outpoints.push(...entryOutpoints)
      transactions.push(...entryTransactions)
      entries.push(entry)
    }

    // Construct payload
    const payload = new Payload()
    payload.setTimestamp(Date.now())
    payload.setEntriesList(entries)
    const plainTextPayload = payload.serializeBinary()

    // Construct message
    try {
      const { message, transactionBundle, payloadDigest } =
        this.messageConstructor.constructMessage(
          wallet,
          plainTextPayload,
          sourcePrivateKey,
          destinationPublicKey,
          stampAmount,
        )
      const payloadDigestHex = payloadDigest.toString('hex')

      outpoints.push(
        ...transactionBundle
          .map(({ transaction, vouts, usedUtxos }) => {
            transactions.push(transaction)
            stagedUtxos.push(...usedUtxos)
            return vouts.map(
              vout =>
                ({
                  type: 'stamp',
                  txId: transaction.txid,
                  satoshis: transaction.outputs[vout].satoshis,
                  outputIndex: vout,
                } as UIStampOutput),
            )
          })
          .flat(1),
      )

      // Add localy
      this.events.emit('messageSending', {
        address,
        senderAddress,
        index: payloadDigestHex,
        items,
        outpoints,
        previousHash,
        transactions,
      })

      const messageSet = new MessageSet()
      messageSet.addMessages(message)

      const destinationAddress = destinationPublicKey
        .toAddress(this.networkName)
        .toCashAddress()
      const chronikClient = this.wallet?.chronikClient
      assert(chronikClient, 'Unable to get chronikClient')
      // Ensure all outpoints are on-chain before trying to send message. Don't
      // want to burn other transactions if our state is out of sync with the
      // blockchain.
      return new Promise(
        (
          resolve: (txIds: string[] | undefined) => void,
          reject: (err: unknown) => void,
        ) =>
          wallet
            .checkAndFixUtxos(stagedUtxos)
            .then(checks => checks.every(c => c))
            .then(o => {
              if (!o) {
                throw new Error(
                  'Invalid UTXOs found while trying to broadcast message',
                )
              }
            })
            .then(() =>
              chronikClient.broadcastTxs(
                transactions.map(tx => {
                  console.log(
                    'Broadcasting a transaction',
                    tx.txid,
                    tx.toString(),
                  )
                  return tx.toString()
                }),
              ),
            )
            .then(async result => {
              await this.pushMessages(destinationAddress, messageSet)
              resolve(result.txids)
            })
            .then(async () => {
              this.events.emit('messageSent', {
                address,
                senderAddress,
                index: payloadDigestHex,
                items,
                outpoints,
                transactions,
              })
              // TODO: we shouldn't be dealing with this here. Leaky abstraction
              await Promise.all(
                stagedUtxos.map(utxo => wallet.deleteUtxo(calcUtxoId(utxo))),
              )
            })
            .catch(async err => {
              console.error(err)
              if (err.response) {
                console.error(err.response)
              }
              if (errCount >= 3) {
                this.events.emit('messageSendError', {
                  address,
                  senderAddress,
                  index: payloadDigestHex,
                  items,
                  outpoints,
                  transactions,
                })
                console.log(`unable to send message after ${errCount} retries`)
                reject(err)
                return
              }
              console.log('error sending message', err)

              try {
                await wallet.checkAndFixUtxos(stagedUtxos, true)
                const txids = await this.sendMessageImpl({
                  address,
                  items,
                  stampAmount,
                  errCount: errCount + 1,
                  previousHash: payloadDigestHex,
                })
                resolve(txids)
              } catch (err) {
                reject(err)
              }
            }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err)
      const payloadDigestHex = err.payloadDigest?.toString('hex')
      this.events.emit('messageSendError', {
        address,
        senderAddress,
        index: payloadDigestHex,
        items,
        outpoints,
        transactions,
      })
    }
  }

  // Stub for original API
  // TODO: Fix clients to not use these APIs at all
  async sendMessage({
    address,
    text,
    replyDigest,
    stampAmount,
  }: {
    address: string
    text: string
    replyDigest?: string
    stampAmount: number
  }) {
    // Send locally
    const items: MessageItem[] = [
      {
        type: 'text',
        text,
      } as TextItem,
    ]
    if (replyDigest) {
      items.unshift({
        type: 'reply',
        payloadDigest: replyDigest,
      } as ReplyItem)
    }
    await this.sendMessageImpl({ address, items, stampAmount })
  }

  async sendStealthPayment({
    address,
    stampAmount,
    amount,
    memo,
  }: {
    address: string
    stampAmount: number
    amount: number
    memo: string
  }) {
    // Send locally
    const items: MessageItem[] = [
      {
        type: 'stealth',
        amount,
      },
    ]
    if (memo !== '') {
      items.push({
        type: 'text',
        text: memo,
      })
    }
    await this.sendMessageImpl({ address, items, stampAmount })
  }

  async sendImage({
    address,
    image,
    caption,
    replyDigest,
    stampAmount,
  }: {
    address: string
    image: string
    caption: string
    replyDigest?: string
    stampAmount: number
  }) {
    const items: MessageItem[] = [
      {
        type: 'image',
        image,
      },
    ]
    if (caption !== '') {
      items.push({
        type: 'text',
        text: caption,
      })
    }
    if (replyDigest) {
      items.unshift({
        type: 'reply',
        payloadDigest: replyDigest,
      })
    }

    await this.sendMessageImpl({ address, items, stampAmount })
  }

  // Stub for original API
  // TODO: Fix clients to not use these APIs at all
  async sendToPubKeyHash({
    address,
    amount,
  }: {
    address: string
    amount: number
  }) {
    // Send locally
    const items: MessageItem[] = [
      {
        type: 'p2pkh',
        address,
        amount,
      } as P2PKHSendItem,
    ]
    console.log(items)
    const myAddressStr = this.wallet?.myAddress?.toXAddress()
    assert(myAddressStr, 'Unable to get myAddressString in sendToPubKeyHash')
    return this.sendMessageImpl({
      address: myAddressStr,
      items,
      stampAmount: 0,
    })
  }

  receiveSelfSend({ payload }: { payload: Payload }) {
    assert(this.wallet, 'wallet unset while handing receiveSelfSend')
    // Decode entries
    const entriesList = payload.getEntriesList()

    for (const index in entriesList) {
      const entry = entriesList[index]
      // If address data doesn't exist then add it
      const kind = entry.getKind()
      if (kind === 'p2pkh') {
        const entryData = entry.getBody()
        assert(typeof entryData !== 'string', 'entryData of wrong type')
        const p2pkhMessage = p2pkh.P2PKHEntry.deserializeBinary(entryData)

        // Add stealth outputs
        const transactionRaw = p2pkhMessage.getTransaction()
        const p2pkhTxRaw = Buffer.from(transactionRaw)
        const p2pkhTxR = new Transaction(p2pkhTxRaw)

        for (const input of p2pkhTxR.inputs) {
          // Don't add these outputs to our wallet. They're the other persons
          const utxoId = calcUtxoId({
            txId: input.prevTxId.toString('hex'),
            outputIndex: input.outputIndex,
          })
          this.wallet.deleteUtxo(utxoId)
        }

        continue
      }
    }
  }

  async receiveMessage(
    rawMessage: Message,
    receivedTime = Date.now(),
  ): Promise<ReceivedMessageWrapper | null> {
    // Parse message
    const message = messageMixin(this.displayNetwork, rawMessage)
    const preParsedMessage = message.parse()
    const senderAddress = preParsedMessage.sourcePublicKey
      .toAddress(this.displayNetwork)
      .toXAddress() // TODO: Make generic
    const wallet = this.wallet
    assert(wallet, 'Wallet not available when trying to receive message')
    const myAddress = wallet.myAddress?.toXAddress()
    assert(myAddress, 'Address or wallet not set')
    const outbound = senderAddress === myAddress
    const serverTime = preParsedMessage.receivedTime

    // if this client sent the message, we already have the data and don't need to process it or get the payload again
    if (preParsedMessage.payloadDigest.length !== 0) {
      const payloadDigestHex = Array.prototype.map
        .call(preParsedMessage.payloadDigest, x =>
          ('00' + x.toString(16)).slice(-2),
        )
        .join('')
      const message = await this.messageStore.getMessage(payloadDigestHex)
      if (message) {
        console.log('Already have message', payloadDigestHex)
        // TODO: We really should handle unfreezing UTXOs here via a callback in the future.
        return null
      }
      console.log('Message not found locally', payloadDigestHex)
    }

    const getPayload = async (
      payloadDigest: Uint8Array,
      messagePayload: Uint8Array,
    ) => {
      if (messagePayload.length !== 0) {
        return messagePayload
      }
      try {
        return new Uint8Array(
          await this.getRawPayload(myAddress, payloadDigest),
        )
      } catch (err) {
        console.error(err)
        throw err
      }
    }

    // Get payload if serialized payload is missing
    // TODO: write a test that we actually use these payloads in the future.
    // :facepalm:
    const rawCipherPayload = await getPayload(
      preParsedMessage.payloadDigest,
      preParsedMessage.payload,
    )

    // If we had to fetch the payload, let's actually use it!
    preParsedMessage.payload = rawCipherPayload

    // Just to be clear that this is where the message is now valid.
    const parsedMessage = preParsedMessage

    const payloadDigest = Buffer.from(
      crypto.Hash.sha256(Buffer.from(rawCipherPayload)),
    )
    if (payloadDigest.compare(parsedMessage.payloadDigest) !== 0) {
      console.error(
        "Payload received doesn't match digest. Refusing to process message",
        payloadDigest,
        parsedMessage.payloadDigest,
      )
      return null
    }

    const destinationAddress = parsedMessage.destinationPublicKey
      .toAddress(this.displayNetwork)
      .toXAddress()

    // Add UTXO
    const stampOutpoints = parsedMessage.stamp.getStampOutpointsList()
    const outpoints = []

    let stampValue = 0
    const identityPrivateKey = wallet.identityPrivKey
    assert(identityPrivateKey, 'No identity privkey set')

    const stampRootHDPrivKey = this.payloadConstructor
      .constructStampHDPrivateKey(payloadDigest, identityPrivateKey)
      .deriveChild(44)
      .deriveChild(145)

    for (const [i, stampOutpoint] of stampOutpoints.entries()) {
      const stampTxRaw = Buffer.from(stampOutpoint.getStampTx())
      const stampTx = new Transaction(stampTxRaw)
      const txId = stampTx.txid
      const vouts = stampOutpoint.getVoutsList()
      const stampTxHDPrivKey = stampRootHDPrivKey.deriveChild(i)
      if (outbound) {
        for (const input of stampTx.inputs) {
          // In order to update UTXO state more quickly, go ahead and remove the inputs from our set immediately
          const utxoId = calcUtxoId({
            txId: input.prevTxId.toString('hex'),
            outputIndex: input.outputIndex,
          })
          await wallet.deleteUtxo(utxoId)
        }
      }
      for (const [j, outputIndex] of vouts.entries()) {
        const output = stampTx.outputs[outputIndex]
        const satoshis = output.satoshis
        const address = output.script.toAddress(this.networkName)
        stampValue += satoshis

        // Also note, we should use an HD key here.
        const outputPrivKey = stampTxHDPrivKey.deriveChild(j).privateKey

        // Network doesn't really matter here, just serves as a placeholder to avoid needing to compute the
        // HASH160(SHA256(point)) ourself
        // Also, ensure the point is compressed first before calculating the address so the hash is deterministic
        const computedAddress = new PublicKey(
          crypto.Point.pointToCompressed(outputPrivKey.toPublicKey().point),
        ).toAddress(this.networkName)
        if (
          !outbound &&
          !address.toBuffer().equals(computedAddress.toBuffer())
        ) {
          // Assume outbound addresses were valid.  Otherwise we need to calclate a different
          // derivation then based on our identity address.
          console.error('invalid stamp address, ignoring')
          continue
        }

        const stampOutput = {
          type: 'stamp',
          address: address.toCashAddress(),
          satoshis,
          txId,
          outputIndex,
        } as Utxo
        outpoints.push(stampOutput)
        if (outbound) {
          // In order to update UTXO state more quickly, go ahead and remove the inputs from our set immediately
          continue
        }
        wallet.putUtxo({
          ...stampOutput,
          privKey: Object.freeze(outputPrivKey),
        })
      }
    }

    // Ignore messages below acceptance price
    const stealthValue = 0

    const rawPayload = outbound
      ? parsedMessage.openSelf(identityPrivateKey)
      : parsedMessage.open(identityPrivateKey)
    const payload = Payload.deserializeBinary(rawPayload)
    if (outbound && myAddress === destinationAddress) {
      this.receiveSelfSend({ payload })
      return null
    }

    // Decode entries
    const entriesList = payload.getEntriesList()
    const newMsg: ReceivedMessage = {
      outbound,
      status: 'confirmed',
      items: [] as MessageItem[],
      serverTime,
      receivedTime,
      outpoints,
      senderAddress,
      destinationAddress,
    }
    for (const entry of entriesList) {
      const entryData = await decodeEntry(entry, outbound, {
        constructHDStealthPrivateKey: (publicKey: PublicKey) =>
          this.payloadConstructor.constructHDStealthPrivateKey(
            publicKey,
            identityPrivateKey,
          ),
        networkName: this.networkName,
        wallet: wallet,
      })
      if (entryData == null) {
        continue
      }
      const [messageItem, entryOutpoints] = entryData
      newMsg.items.push(messageItem)
      outpoints.push(...entryOutpoints)
    }

    const copartyPubKey = outbound
      ? parsedMessage.destinationPublicKey
      : parsedMessage.sourcePublicKey
    const copartyAddress = copartyPubKey
      .toAddress(this.displayNetwork)
      .toXAddress() // TODO: Make generic
    const payloadDigestHex = payloadDigest.toString('hex')
    const finalizedMessage = {
      outbound,
      senderAddress,
      copartyAddress,
      copartyPubKey,
      index: payloadDigestHex,
      stampValue,
      message: Object.freeze({
        ...newMsg,
        totalValue: stampValue + stealthValue,
      }),
    }
    return finalizedMessage
  }

  async refresh() {
    const wallet = this.wallet
    const myAddressStr = wallet?.myAddress
      ? this.toAPIAddress(wallet?.myAddress)
      : undefined
    assert(myAddressStr, 'Missing wallet or myaddress')
    const lastReceived = await this.messageStore.mostRecentMessageTime()
    console.log('refreshing', lastReceived, myAddressStr)
    const messagePage = await this.getMessages(myAddressStr, lastReceived)
    assert(messagePage, 'no messagePage available?')
    const messageList = messagePage.getMessagesList()
    console.log('processing messages')
    try {
      const finalizedMessages = await pAll(
        messageList,
        async arg => {
          const message = await this.receiveMessage(arg)
          if (!message) {
            return
          }
          this.messageStore.saveMessage(message)
          return message
        },
        20,
      )
      this.events.emit('receivedMessages', finalizedMessages.filter(Boolean))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Unable to deserialize message:', err.message)
    }
    // Sanity check after downloading in case relay server was ultimately out of sync with blockchain somehow.
    this.wallet?.updateAllOutpoints()
  }

  async updateProfile(
    idPrivKey: PrivateKey,
    profile: {
      name?: string
      bio?: string
      avatar?: string
    },
    acceptancePrice?: number,
  ) {
    const checkedPrice = acceptancePrice ?? defaultAcceptancePrice
    const priceFilter = this.messageConstructor.constructPriceFilter(
      true,
      checkedPrice,
      checkedPrice,
    )
    const metadata = this.messageConstructor.constructProfileMetadata(
      profile,
      priceFilter,
      idPrivKey,
    )
    await this.putProfile(
      idPrivKey.toAddress(this.networkName).toCashAddress().toString(),
      metadata,
    )
  }

  async wipeWallet(
    messageDeleter: (args: { address: string; payloadDigest: string }) => void,
  ) {
    const messageIterator = await this.messageStore.getIterator()
    // Todo, this rehydrate stuff is common to receiveMessage
    let messages: MessageWrapper[] = []
    const deleteMessage = async (messageWrapper: MessageWrapper) => {
      const { index, copartyAddress } = messageWrapper
      try {
        console.log('remote deleting message', index)
        await this.deleteMessage(messageWrapper.index)

        console.log('deleting message', index)
        messageDeleter({ address: copartyAddress, payloadDigest: index })
      } catch (err) {
        console.log(err)
      }
    }

    for await (const messageWrapper of messageIterator) {
      if (!messageWrapper.message) {
        continue
      }
      messages.push(messageWrapper)
      if ((messages.length + 1) % 500 === 0) {
        await pAll(messages, deleteMessage, 20)
        messages = []
        // Allow other parts of the GUI/App to process
        await new Promise<void>(resolve => {
          setTimeout(() => {
            resolve()
          }, 0)
        })
      }
    }
    await pAll(messages, deleteMessage, 20)
  }
}

export default RelayClient
