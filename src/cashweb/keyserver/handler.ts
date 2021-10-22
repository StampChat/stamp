import axios from 'axios'
import assert from 'assert'

import { Entry, AddressMetadata } from './keyserver_pb'
import { AuthWrapper, AuthWrapperSet, BurnOutputs } from '../auth_wrapper/wrapper_pb'
import pop from '../pop'
import { crypto, Address, Networks, PrivateKey, Transaction, Script, PublicKey } from 'bitcore-lib-xpi'
import { Wallet } from '../wallet'
import { Outpoint } from '../types/outpoint'
import { calcId } from '../wallet/helpers'
import { Opcode } from 'app/local_modules/bitcore-lib-xpi'
import { BroadcastEntry, BroadcastMessage, AgoraPost } from './broadcast_pb'
import { AgoraMessage, AgoraMessageEntry } from '../types/agora'

function calculateBurnAmount (burnOutputs: BurnOutputs[]) {
  return burnOutputs.reduce((total, burn) => {
    // TODO: Validate format
    const index = burn.getIndex()
    const tx = burn.getTx()
    assert(typeof tx !== 'string', 'Tx returned as string from protobuf library')
    const parsedTx = new Transaction(Buffer.from(tx))
    const output = parsedTx.outputs[index]
    const script = new Uint8Array(output.script.toBuffer())
    const isDownVote = script[6] === Opcode.map.OP_0
    return total + (isDownVote ? -parsedTx.outputs[index].satoshis : parsedTx.outputs[index].satoshis)
  }, 0)
}

export class KeyserverHandler {
  keyservers: string[]
  networkName: string
  defaultSampleSize: number
  wallet?: Wallet

  constructor ({ wallet, defaultSampleSize = 3, keyservers, networkName }: { wallet?: Wallet, defaultSampleSize?: number, keyservers: string[], networkName: string }) {
    assert(networkName, 'Missing networkName while initializing KeyserverHandler')
    assert(keyservers, 'Missing keyservers while initializing KeyserverHandler')
    this.keyservers = keyservers
    this.networkName = networkName
    this.defaultSampleSize = defaultSampleSize
    this.wallet = wallet
  }

  toAPIAddressString (address: string) {
    return new Address(new Address(address).hashBuffer, Networks.get(this.networkName, undefined)).toCashAddress()
  }

  constructRelayUrlMetadata (relayUrl: string, privKey: PrivateKey) {
    const relayUrlEntry = new Entry()
    relayUrlEntry.setKind('relay-server')
    const rawRelayUrl = new TextEncoder().encode(relayUrl)
    relayUrlEntry.setBody(rawRelayUrl)

    // Construct payload
    const metadata = new AddressMetadata()
    metadata.setTimestamp(Math.floor(Date.now() / 1000))
    metadata.setTtl(31556952) // 1 year
    metadata.addEntries(relayUrlEntry)

    const serializedPayload = metadata.serializeBinary()
    const hashbuf = crypto.Hash.sha256(Buffer.from(serializedPayload))
    const signature = crypto.ECDSA.sign(hashbuf, privKey)

    const authWrapper = new AuthWrapper()
    const sig = signature.toCompact(1, true).slice(1)
    authWrapper.setPublicKey(privKey.toPublicKey().toBuffer())
    authWrapper.setSignature(sig)
    authWrapper.setScheme(1)
    authWrapper.setPayload(serializedPayload)

    return authWrapper
  }

  async fetchMetadata (keyserver: string, address: string) {
    const legacyAddress = this.toAPIAddressString(address)
    const url = `${keyserver}/keys/${legacyAddress}`
    const response = await axios(
      {
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      }
    )
    if (response.status === 200) {
      const metadata = AuthWrapper.deserializeBinary(response.data)
      return metadata
    }
  }

  chooseServer () {
    // TODO: Sample correctly
    return this.keyservers[0]
  }

  async paymentRequest (serverUrl: string, address: string, truncatedAuthWrapper: AuthWrapper) {
    const legacyAddress = this.toAPIAddressString(address)
    const rawAuthWrapper = truncatedAuthWrapper.serializeBinary()
    const url = `${serverUrl}/keys/${legacyAddress}`
    return pop.getPaymentRequest(url, 'put', rawAuthWrapper)
  }

  async _uniformSample (address: string) {
    // TODO: Sample correctly
    const server = this.chooseServer()
    return this.fetchMetadata(server, address)
  }

  async getRelayUrl (address: string) {
    const legacyAddress = this.toAPIAddressString(address)

    // Get metadata
    const metadata = await this._uniformSample(legacyAddress)
    assert(metadata, 'Missing metadata from keyserver')
    const rawAddressMetadata = metadata.getPayload()
    assert(typeof rawAddressMetadata !== 'string', 'rawAddressMetadata is a string?')
    const payload = AddressMetadata.deserializeBinary(rawAddressMetadata)

    // Find vCard
    function isRelay (entry: Entry) {
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

  async putMetadata (address: string, server: string, metadata: AuthWrapper, token: string) {
    const rawMetadata = metadata.serializeBinary()
    const url = `${server}/keys/${address}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        Authorization: token
      },
      data: rawMetadata
    })
  }

  async updateKeyMetadata (relayUrl: string, idPrivKey: PrivateKey) {
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')
    const idAddress = idPrivKey.toAddress(this.networkName).toCashAddress()
    // Construct metadata
    const authWrapper = this.constructRelayUrlMetadata(relayUrl, idPrivKey)

    const serverUrl = this.chooseServer()
    const payloadRaw = authWrapper.getPayload()
    assert(typeof payloadRaw !== 'string', 'payloadRaw is a string?')
    const payload = Buffer.from(payloadRaw)
    const payloadDigest = crypto.Hash.sha256(payload)
    const truncatedAuthWrapper = new AuthWrapper()
    const publicKey = authWrapper.getPublicKey()
    assert(typeof publicKey !== 'string', 'publicKey is a string?')

    truncatedAuthWrapper.setPublicKey(publicKey)
    const payloadBuf = payloadDigest.buffer
    truncatedAuthWrapper.setPayloadDigest(new Uint8Array(payloadBuf))

    const { paymentDetails } = await this.paymentRequest(serverUrl, idAddress, truncatedAuthWrapper) ?? { paymentDetails: undefined }
    assert(paymentDetails, 'Missing payment details')
    // Construct payment
    const { paymentUrl, payment, usedUtxos } = await pop.constructPaymentTransaction(this.wallet, paymentDetails)

    const paymentUrlFull = new URL(paymentUrl, serverUrl)
    const { token } = await pop.sendPayment(paymentUrlFull.href, payment)
    await Promise.all(usedUtxos.map((id: Outpoint) => this.wallet?.storage.deleteOutpoint(calcId(id))))

    await this.putMetadata(idAddress, serverUrl, authWrapper, token)
  }

  private constructBurnTransaction (wallet: Wallet, hash: Buffer, vote: number) {
    const upvote = vote > 0
    const satoshis = vote < 0 ? -vote : vote

    // Create burn output
    const script = new Script(undefined)
      .add(Opcode.map.OP_RETURN)
      .add(Buffer.from([80, 79, 78, 68])) // POND
      .add(upvote ? Opcode.map.OP_1 : Opcode.map.OP_0)
      .add(hash)

    const output = new Transaction.Output({
      script,
      satoshis
    })
    return wallet.constructTransaction({ outputs: [output] })
  }

  async createBroadcast (topic: string, entries: AgoraMessageEntry[], vote: number) {
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')

    const broadcastMessage = new BroadcastMessage()
    broadcastMessage.setTopic(topic)
    broadcastMessage.setTimestamp(Date.now())

    // Construct payload
    const protoEntries: BroadcastEntry[] = []
    for (const entry of entries) {
      const textEntry = new BroadcastEntry()
      textEntry.setKind(entry.kind)
      if (entry.kind === 'post') {
        const payload = new AgoraPost()
        payload.setTitle(entry.title)
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
    const { transaction: burnTransaction, usedUtxos } = this.constructBurnTransaction(this.wallet, payloadDigest, vote)

    const burnOutput = new BurnOutputs()
    burnOutput.setTx(burnTransaction.toBuffer())
    burnOutput.setIndex(0)

    const idPrivKey = this.wallet?.identityPrivKey
    assert(idPrivKey, 'Missing private key in createBroadcast')
    const idPubKey = idPrivKey.toPublicKey().toBuffer()

    const signature = crypto.ECDSA.sign(payloadDigest, idPrivKey)
    const sig = signature.toCompact(1, true).slice(1)

    const authWrapper = new AuthWrapper()
    authWrapper.setPublicKey(idPubKey)
    authWrapper.setSignature(sig)

    authWrapper.setPublicKey(idPubKey)
    authWrapper.setPayload(serializedMessage)
    authWrapper.setBurnAmount(vote)
    authWrapper.setScheme(AuthWrapper.SignatureScheme.ECDSA)
    authWrapper.setTransactionsList([burnOutput])
    const server = this.chooseServer()

    const url = `${server}/messages`
    await axios({
      method: 'put',
      url: url,
      data: authWrapper.serializeBinary()
    })
    await Promise.all(usedUtxos.map((id: Outpoint) => this.wallet?.storage.deleteOutpoint(calcId(id))))
  }

  async getBroadcastMessages (topic: string, from?: number, to?: number) {
    const server = this.chooseServer()
    const url = `${server}/messages`
    const response = await axios(
      {
        method: 'get',
        url: url,
        params: {
          from: from ?? Date.now() - 1000 * 60 * 60 * 24,
          to: to ?? Date.now(),
          topic
        },
        responseType: 'arraybuffer'
      }
    )
    if (response.status !== 200) {
      return
    }
    if (response.status !== 200) {
      throw new Error('unable to fetch broadcast messages')
    }
    const authwrapperSet = AuthWrapperSet.deserializeBinary(response.data)
    const wrappers = authwrapperSet.getItemsList()
    const messages: AgoraMessage[] = []
    for (const wrapper of wrappers) {
      const payload = wrapper.getPayload()
      assert(typeof payload !== 'string', 'payload type should not be a string')
      const message = BroadcastMessage.deserializeBinary(payload)
      const pubKey = Buffer.from(wrapper.getPublicKey())
      const address = PublicKey.fromBuffer(pubKey).toAddress(this.networkName).toXAddress()
      const entries = message.getEntriesList()
      const parsedEntries: AgoraMessageEntry[] = []
      const satoshisBurned = calculateBurnAmount(wrapper.getTransactionsList())
      assert(satoshisBurned === wrapper.getBurnAmount())
      const payloadHash = crypto.Hash.sha256(Buffer.from(payload)).toString('hex')
      const parsedMessage: AgoraMessage = {
        poster: address,
        satoshis: satoshisBurned,
        topic: message.getTopic(),
        entries: parsedEntries,
        payloadHash
      }
      for (const entry of entries) {
        const kind = entry.getKind()
        const payload = entry.getPayload()
        assert(typeof payload !== 'string', `invalid payload type returned from protobufs ${payload}`)

        if (kind === 'post') {
          const post = AgoraPost.deserializeBinary(payload).toObject()
          parsedEntries.push({
            kind: 'post',
            ...post
          })
          continue
        }
      }
      messages.push(parsedMessage)
    }
    return messages
  }
}
