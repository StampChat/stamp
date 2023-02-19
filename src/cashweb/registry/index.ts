import axios from 'axios'
import assert from 'assert'

import { AddressEntry, AddressMetadata } from './metadata_pb'
import {
  SignedPayload,
  SignedPayloadSet,
  BurnOutputs,
} from '../signed_payload/payload_pb'
import pop from '../pop'
import {
  crypto,
  Address,
  Networks,
  PrivateKey,
  Transaction,
  Script,
  PublicKey,
} from 'bitcore-lib-xpi'
import { Wallet } from '../wallet'
import { Utxo } from '../types/utxo'
import { calcUtxoId } from '../wallet/helpers'
import { Opcode } from 'app/local_modules/bitcore-lib-xpi'
import { BroadcastEntry, BroadcastMessage, ForumPost } from './broadcast_pb'
import { ForumMessage, ForumMessageEntry } from '../types/forum'

function calculateBurnAmount(burnOutputs: BurnOutputs[]) {
  return burnOutputs.reduce((total, burn) => {
    // TODO: Validate format
    const index = burn.getIndex()
    const tx = burn.getTx()
    assert(
      typeof tx !== 'string',
      'Tx returned as string from protobuf library',
    )
    const parsedTx = new Transaction(Buffer.from(tx))
    const output = parsedTx.outputs[index]
    const script = new Uint8Array(output.script.toBuffer())
    const isDownVote = script[6] === Opcode.map.OP_0
    return (
      total +
      (isDownVote
        ? -parsedTx.outputs[index].satoshis
        : parsedTx.outputs[index].satoshis)
    )
  }, 0)
}

export class RegistryHandler {
  registrys: string[]
  networkName: string
  defaultSampleSize: number
  wallet?: Wallet

  constructor({
    wallet,
    defaultSampleSize = 3,
    registrys,
    networkName,
  }: {
    wallet?: Wallet
    defaultSampleSize?: number
    registrys: string[]
    networkName: string
  }) {
    assert(
      networkName,
      'Missing networkName while initializing RegistryHandler',
    )
    assert(registrys, 'Missing registrys while initializing RegistryHandler')
    this.registrys = registrys
    this.networkName = 'livenet'
    this.defaultSampleSize = defaultSampleSize
    this.wallet = wallet
  }

  toAPIAddressString(address: string | Address | PrivateKey) {
    return new Address(
      new Address(address).hashBuffer,
      Networks.get(this.networkName, undefined),
    ).toXAddress()
  }

  constructRelayUrlMetadata(relayUrl: string, privKey: PrivateKey) {
    const relayUrlEntry = new AddressEntry()
    relayUrlEntry.setKind('relay-server')
    const rawRelayUrl = new TextEncoder().encode(relayUrl)
    relayUrlEntry.setBody(rawRelayUrl)

    const pubkey = privKey.toPublicKey().toBuffer()
    // Construct payload
    const metadata = new AddressMetadata()
    metadata.setTimestamp(Math.floor(Date.now() / 1000))
    metadata.setTtl(31556952) // 1 year
    metadata.addEntries(relayUrlEntry)
    metadata.setPubkey(pubkey)

    const serializedPayload = metadata.serializeBinary()
    const hashbuf = crypto.Hash.sha256(Buffer.from(serializedPayload))
    const signature = crypto.ECDSA.sign(hashbuf, privKey)
    const signedPayload = new SignedPayload()
    signedPayload.setPublicKey(pubkey)
    signedPayload.setSignature(signature.toDER())
    signedPayload.setScheme(1)
    signedPayload.setPayload(serializedPayload)

    return { signedPayload, serializedPayload }
  }

  async fetchMetadata(registry: string, address: string) {
    const legacyAddress = this.toAPIAddressString(address)
    const url = `${registry}/metadata/${legacyAddress}`
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
    })
    if (response.status === 200) {
      const metadata = SignedPayload.deserializeBinary(response.data)
      return metadata
    }
  }

  chooseServer() {
    // TODO: Sample correctly
    return this.registrys[0]
  }

  async paymentRequest(
    serverUrl: string,
    address: string,
    truncatedSignedPayload: SignedPayload,
  ) {
    const legacyAddress = this.toAPIAddressString(address)
    const rawSignedPayload = truncatedSignedPayload.serializeBinary()
    const url = `${serverUrl}/metadata/${legacyAddress}`
    return pop.getPaymentRequest(url, 'put', rawSignedPayload)
  }

  async _uniformSample(address: string) {
    // TODO: Sample correctly
    const server = this.chooseServer()
    return this.fetchMetadata(server, address)
  }

  async getRelayUrl(address: string) {
    const legacyAddress = this.toAPIAddressString(address)

    // Get metadata
    const metadata = await this._uniformSample(legacyAddress)
    assert(metadata, 'Missing metadata from registry')
    const rawAddressMetadata = metadata.getPayload()
    assert(
      typeof rawAddressMetadata !== 'string',
      'rawAddressMetadata is a string?',
    )
    const payload = AddressMetadata.deserializeBinary(rawAddressMetadata)

    // Find vCard
    function isRelay(entry: AddressEntry) {
      return entry.getKind() === 'relay-server'
    }
    const entryList = payload.getEntriesList()
    const entry = entryList.find(isRelay)
    if (!entry) {
      return null
    }
    const entryData = entry.getBody()
    assert(typeof entryData !== 'string', 'entryData is a string')
    const relayUrl = new TextDecoder().decode(entryData)
    return relayUrl
  }

  async updateKeyMetadata(
    relayUrl: string,
    idPrivKey: PrivateKey,
    sats = 1000000,
  ) {
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')
    const idAddress = this.toAPIAddressString(
      idPrivKey.toAddress(this.networkName),
    )
    // Construct metadata
    const { signedPayload, serializedPayload } = this.constructRelayUrlMetadata(
      relayUrl,
      idPrivKey,
    )

    const serverUrl = this.chooseServer()
    const payloadRaw = signedPayload.getPayload()
    assert(typeof payloadRaw !== 'string', 'payloadRaw is a string?')
    const publicKey = signedPayload.getPublicKey()
    assert(typeof publicKey !== 'string', 'publicKey is a string?')
    const payloadDigest = crypto.Hash.sha256(Buffer.from(serializedPayload))
    const { transaction: burnTransaction, usedUtxos } =
      this.constructBurnTransaction(
        this.wallet,
        payloadDigest,
        sats,
        [83, 84, 77, 80], // 'STMP'
      )
    try {
      signedPayload.setBurnAmount(sats)
      const burnOutput = new BurnOutputs()
      burnOutput.setTx(burnTransaction.toBuffer())
      burnOutput.setIndex(0)
      signedPayload.addTransactions(burnOutput)
      const url = `${serverUrl}/metadata/${idAddress}`
      await axios({
        headers: { 'content-type': 'application/x-protobuf' },
        method: 'put',
        url: url,
        data: signedPayload.serializeBinary(),
      })
      await Promise.all(
        usedUtxos.map((id: Utxo) =>
          this.wallet?.storage.deleteById(calcUtxoId(id)),
        ),
      )
    } catch (err) {
      this.wallet.fixUtxos(usedUtxos)
      throw err
    }
  }

  private constructBurnTransaction(
    wallet: Wallet,
    hash: Buffer,
    vote: number,
    lokadId = [80, 79, 78, 68], // 'POND'
  ) {
    const upvote = vote > 0
    const satoshis = vote < 0 ? -vote : vote

    // Create burn output
    const script = new Script(undefined)
      .add(Opcode.map.OP_RETURN)
      .add(Buffer.from(lokadId))
      .add(upvote ? Opcode.map.OP_1 : Opcode.map.OP_0)
      .add(hash)

    const output = new Transaction.Output({
      script,
      satoshis,
    })
    return wallet.constructTransaction({ outputs: [output] })
  }

  async createBroadcast(
    topic: string,
    entries: ForumMessageEntry[],
    vote: number,
    parentDigest?: string,
  ) {
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')

    const broadcastMessage = new BroadcastMessage()
    broadcastMessage.setTopic(topic)
    broadcastMessage.setTimestamp(Date.now())
    parentDigest &&
      broadcastMessage.setParentDigest(Buffer.from(parentDigest, 'hex'))

    // Construct payload
    const protoEntries: BroadcastEntry[] = []
    for (const entry of entries) {
      const textEntry = new BroadcastEntry()
      textEntry.setKind(entry.kind)
      if (entry.kind === 'post') {
        const payload = new ForumPost()
        entry.title && payload.setTitle(entry.title)
        entry.url && payload.setUrl(entry.url)
        entry.message && payload.setMessage(entry.message)
        textEntry.setPayload(payload.serializeBinary())
        protoEntries.push(textEntry)
        continue
      }
      assert(false, 'unsupported entry type')
    }
    broadcastMessage.setEntriesList(protoEntries)

    const serializedMessage = broadcastMessage.serializeBinary()
    const payloadDigest = crypto.Hash.sha256(Buffer.from(serializedMessage))
    const { transaction: burnTransaction, usedUtxos } =
      this.constructBurnTransaction(this.wallet, payloadDigest, vote)

    const burnOutput = new BurnOutputs()
    burnOutput.setTx(burnTransaction.toBuffer())
    burnOutput.setIndex(0)

    const idPrivKey = this.wallet?.identityPrivKey
    assert(idPrivKey, 'Missing private key in createBroadcast')
    const idPubKey = idPrivKey.toPublicKey().toBuffer()

    const signature = crypto.ECDSA.sign(payloadDigest, idPrivKey)
    const sig = signature.toCompact(1, true).slice(1)

    const signedPayload = new SignedPayload()
    signedPayload.setPublicKey(idPubKey)
    signedPayload.setSignature(sig)

    signedPayload.setPublicKey(idPubKey)
    signedPayload.setPayload(serializedMessage)
    signedPayload.setBurnAmount(vote)
    signedPayload.setScheme(SignedPayload.SignatureScheme.ECDSA)
    signedPayload.setTransactionsList([burnOutput])
    const server = this.chooseServer()

    try {
      const url = `${server}/messages`
      await axios({
        method: 'put',
        url: url,
        data: signedPayload.serializeBinary(),
      })
      await Promise.all(
        usedUtxos.map((id: Utxo) =>
          this.wallet?.storage.deleteById(calcUtxoId(id)),
        ),
      )
    } catch (err) {
      await this.wallet?.fixUtxos(usedUtxos)
      throw err
    }
    return payloadDigest.toString('hex')
  }

  async addOfferings(payloadDigest: string, vote: number) {
    // Topic should not be required, but it is a sanity check on the backend to
    // make sure the vote and the post have the same information.
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')

    const payloadDigestBinary = Buffer.from(payloadDigest, 'hex')
    const { transaction: burnTransaction, usedUtxos } =
      this.constructBurnTransaction(this.wallet, payloadDigestBinary, vote)

    const burnOutput = new BurnOutputs()
    burnOutput.setTx(burnTransaction.toBuffer())
    burnOutput.setIndex(0)

    const idPrivKey = this.wallet?.identityPrivKey
    assert(idPrivKey, 'Missing private key in createBroadcast')
    const idPubKey = idPrivKey.toPublicKey().toBuffer()

    const signature = crypto.ECDSA.sign(payloadDigestBinary, idPrivKey)
    const sig = signature.toCompact(1, true).slice(1)

    const signedPayload = new SignedPayload()
    signedPayload.setPublicKey(idPubKey)
    signedPayload.setSignature(sig)

    signedPayload.setPublicKey(idPubKey)
    signedPayload.setPayloadDigest(payloadDigestBinary)
    signedPayload.setBurnAmount(vote)
    signedPayload.setScheme(SignedPayload.SignatureScheme.ECDSA)
    signedPayload.setTransactionsList([burnOutput])
    const server = this.chooseServer()
    const url = `${server}/messages`
    await axios({
      method: 'put',
      url: url,
      data: signedPayload.serializeBinary(),
    })
    await Promise.all(
      usedUtxos.map((id: Utxo) =>
        this.wallet?.storage.deleteById(calcUtxoId(id)),
      ),
    )
  }

  parseWrapper(wrapper: SignedPayload) {
    const payload = wrapper.getPayload()
    assert(typeof payload !== 'string', 'payload type should not be a string')
    const message = BroadcastMessage.deserializeBinary(payload)
    const pubKey = Buffer.from(wrapper.getPublicKey())
    const address = PublicKey.fromBuffer(pubKey)
      .toAddress(this.networkName)
      .toXAddress()
    const entries = message.getEntriesList()
    const parsedEntries: ForumMessageEntry[] = []
    const satoshisBurned = calculateBurnAmount(wrapper.getTransactionsList())
    assert(satoshisBurned === wrapper.getBurnAmount())
    const payloadDigest = crypto.Hash.sha256(Buffer.from(payload)).toString(
      'hex',
    )
    const parentDigestBinary = message.getParentDigest()
    assert(
      typeof parentDigestBinary !== 'string' || parentDigestBinary.length === 0,
      'post.getParentDigest() returned a string incorrectly',
    )
    const timestamp = message.getTimestamp()
    const parsedMessage: ForumMessage = {
      poster: address,
      satoshis: satoshisBurned,
      topic: message.getTopic(),
      entries: parsedEntries,
      payloadDigest,
      parentDigest: Buffer.from(parentDigestBinary).toString('hex'),
      timestamp: new Date(timestamp),
    }
    for (const entry of entries) {
      const kind = entry.getKind()
      const payload = entry.getPayload()
      if (typeof payload === 'string') {
        console.error('invalid payload type returned from protobufs')
        continue
      }

      if (kind === 'post') {
        const post = ForumPost.deserializeBinary(payload)
        parsedEntries.push({
          kind: 'post',
          title: post.getTitle(),
          url: post.getUrl(),
          message: post.getMessage(),
        })
        continue
      }
    }
    return parsedMessage
  }

  async getBroadcastMessages(topic: string, from?: number, to?: number) {
    const server = this.chooseServer()
    const url = `${server}/messages`
    const response = await axios({
      method: 'get',
      url: url,
      params: {
        // Defaults to 1 day
        from: from ?? Date.now() - 1000 * 60 * 60 * 24,
        to: to ?? Date.now(),
        topic,
      },
      responseType: 'arraybuffer',
    })
    if (response.status !== 200) {
      return
    }
    if (response.status !== 200) {
      throw new Error('unable to fetch broadcast messages')
    }
    const signedpayloadSet = SignedPayloadSet.deserializeBinary(response.data)
    const wrappers = signedpayloadSet.getItemsList()
    const messages: ForumMessage[] = []
    for (const wrapper of wrappers) {
      const message = this.parseWrapper(wrapper)
      messages.push(message)
    }
    return messages
  }

  async getBroadcastMessage(payloadDigest: string) {
    const server = this.chooseServer()
    const url = `${server}/messages/${payloadDigest}`
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
    })
    if (response.status !== 200) {
      return
    }
    if (response.status !== 200) {
      throw new Error('unable to fetch broadcast messages')
    }
    const signedPayload = SignedPayload.deserializeBinary(response.data)
    const message = this.parseWrapper(signedPayload)
    return message
  }
}
