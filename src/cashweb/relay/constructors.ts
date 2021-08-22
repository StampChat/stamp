import { PublicKey, crypto, Transaction, Script, Address, PrivateKey } from 'bitcore-lib-xpi'
import assert from 'assert'
import atob from 'atob'

import { Header, Message, PayloadEntry, Profile, ProfileEntry, Stamp, StampOutpoints } from './relay_pb'
import stealth from './stealth_pb'
import p2pkh from './p2pkh_pb'
import filters, { PriceFilter } from './filters_pb'
import { PayloadConstructor } from './crypto'
import VCard from 'vcf'
import { AuthWrapper } from '../auth_wrapper/wrapper_pb'
import { Wallet } from '../wallet'

export class MessageConstructor {
  payloadConstructor: PayloadConstructor

  constructor ({ networkName }: { networkName: string }) {
    assert(networkName, 'Missing networkName while initializing MessageConstructor')
    this.payloadConstructor = new PayloadConstructor({ networkName })
  }

  constructStampTransactions (wallet: Wallet, payloadDigest: Buffer, destPubKey: PublicKey, amount: number) {
    assert(payloadDigest instanceof Buffer, 'digestPayload is wrong type')

    // Stamp output
    const stampHDPubKey = this.payloadConstructor.constructStampHDPublicKey(payloadDigest, destPubKey)
    // Assuming one txn and one output for now.

    const stampAddressGenerator = (transactionNumber: number) => (outputNumber: number) => {
      const outpointPubKey = stampHDPubKey.deriveChild(44)
        .deriveChild(145)
        .deriveChild(transactionNumber)
        .deriveChild(outputNumber)
        .publicKey
      const address = new PublicKey(crypto.Point.pointToCompressed(outpointPubKey.point))
      transactionNumber += 1
      return address
    }
    if (!amount) {
      return []
    }

    // Construct transaction
    return wallet.constructTransactionSet({ addressGenerator: stampAddressGenerator, amount })
  }

  constructStealthTransactions (wallet: Wallet, ephemeralPrivKey: PrivateKey, destPubKey: PublicKey, amount: number) {
    // Add ephemeral output
    // NOTE: We're only doing 1 stealth txn, and 1 output for now.
    // But the spec should allow doing confidential amounts.
    const stealthHDPubKey = this.payloadConstructor.constructHDStealthPublicKey(ephemeralPrivKey, destPubKey)

    const stealthPubKeyGenerator = (transactionNumber: number) => (outputNumber: number) => {
      const stealthPubKey = stealthHDPubKey
        .deriveChild(44)
        .deriveChild(145)
        .deriveChild(transactionNumber)
        .deriveChild(outputNumber)
        .publicKey
      const stealthAddress = new PublicKey(crypto.Point.pointToCompressed(stealthPubKey.point))

      transactionNumber += 1
      return stealthAddress
    }

    // Construct transaction
    return wallet.constructTransactionSet({ addressGenerator: stealthPubKeyGenerator, amount })
  }

  constructMessage (wallet: Wallet, plainTextPayload: Uint8Array, sourcePrivateKey: PrivateKey, destinationPublicKey: PublicKey, stampAmount: number) {
    const plainPayloadDigest = crypto.Hash.sha256(Buffer.from(plainTextPayload))

    // Construct salt
    const rawSourcePrivateKey = sourcePrivateKey.toBuffer()
    const salt = crypto.Hash.sha256hmac(plainPayloadDigest, rawSourcePrivateKey)

    // Construct shared key
    const sharedKey = this.payloadConstructor.constructSharedKey(sourcePrivateKey, destinationPublicKey, salt)

    // Encrypt payload
    const payload = this.payloadConstructor.encrypt(sharedKey, plainTextPayload)

    // Calculate payload hmac
    const payloadDigest = crypto.Hash.sha256(Buffer.from(payload))
    const payloadHmac = this.payloadConstructor.constructPayloadHmac(sharedKey, payloadDigest)

    // Get transaction bundle from wallet
    try {
      const transactionBundle = this.constructStampTransactions(wallet, payloadDigest, destinationPublicKey, stampAmount)

      // Construct Stamp
      const stamp = new Stamp()
      stamp.setStampType(1)

      for (const { transaction: stampTx, vouts } of transactionBundle) {
        const rawStampTx = stampTx.toBuffer()
        const stampOutpoints = new StampOutpoints()
        stampOutpoints.setStampTx(rawStampTx)
        vouts.forEach((vout) => stampOutpoints.addVouts(vout))

        stamp.addStampOutpoints(stampOutpoints)
      }

      // Construct message
      const message = new Message()
      const rawSourcePublickey = sourcePrivateKey.toPublicKey().toBuffer()
      const rawDestinationPublicKey = destinationPublicKey.toBuffer()
      message.setScheme(1)
      message.setDestinationPublicKey(rawDestinationPublicKey)
      message.setSourcePublicKey(rawSourcePublickey)
      message.setPayload(payload)
      message.setPayloadHmac(payloadHmac)
      message.setSalt(salt)
      message.setStamp(stamp)
      return { message, transactionBundle, payloadDigest }
    } catch (err) {
      console.error(err)
      throw Object({
        payloadDigest,
        err
      })
    }
  }

  constructReplyEntry ({ payloadDigest }: { payloadDigest: string }) {
    assert(typeof payloadDigest === 'string', 'digestPayload is wrong type')
    const payloadDigestBuffer = Buffer.from(payloadDigest, 'hex')

    const entry = new PayloadEntry()
    entry.setKind('reply')
    entry.setBody(payloadDigestBuffer)
    return entry
  }

  constructTextEntry ({ text }: { text: string }) {
    // Add text entry
    const textEntry = new PayloadEntry()
    textEntry.setKind('text-utf8')
    const rawText = new TextEncoder().encode(text)
    textEntry.setBody(rawText)
    return textEntry
  }

  constructStealthEntry ({ wallet, amount, destPubKey }: { wallet: Wallet, amount: number, destPubKey: PublicKey }) {
    // Construct payment entry
    const paymentEntry = new PayloadEntry()
    paymentEntry.setKind('stealth-payment')

    const stealthPaymentEntry = new stealth.StealthPaymentEntry()
    const ephemeralPrivKey = new PrivateKey()

    const transactionBundle = this.constructStealthTransactions(wallet, ephemeralPrivKey, destPubKey, amount)

    // Sent to HASH160(ephemeralPrivKey * destPubKey)
    // Sent to HASH160(ephemeralPrivKey * destPubKey)

    stealthPaymentEntry.setEphemeralPubKey(ephemeralPrivKey.publicKey.toBuffer())
    for (const { transaction: stealthTx, vouts } of transactionBundle) {
      const rawStealthTx = stealthTx.toBuffer()
      const stealthOutpoints = new stealth.StealthOutpoints()

      stealthOutpoints.setStealthTx(rawStealthTx)
      vouts.forEach((vout) => stealthOutpoints.addVouts(vout))
      stealthPaymentEntry.addOutpoints(stealthOutpoints)
    }

    const paymentEntryRaw = stealthPaymentEntry.serializeBinary()
    paymentEntry.setBody(paymentEntryRaw)

    return { paymentEntry, transactionBundle }
  }

  constructImageEntry ({ image }: { image: string }) {
    // Construct text entry
    const imgEntry = new PayloadEntry()
    imgEntry.setKind('image')

    const arr = image.split(',')
    assert(arr.length > 0)
    const matches = arr[0].match(/:(.*?);/)
    assert(matches && matches.length > 2)
    const avatarType = matches[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const rawAvatar = new Uint8Array(n)

    while (n--) {
      rawAvatar[n] = bstr.charCodeAt(n)
    }
    const imgHeader = new Header()
    imgHeader.setName('data')
    imgHeader.setValue(avatarType)
    imgEntry.setBody(rawAvatar)
    imgEntry.addHeaders(imgHeader)

    return imgEntry
  }

  constructP2PKHEntry ({ address, amount, wallet }: { address: string, amount: number, wallet: Wallet }) {
    const p2pkhEntry = new p2pkh.P2PKHEntry()

    const output = new Transaction.Output({
      script: new Script(new Address(address)),
      satoshis: amount
    })

    const { transaction, usedIDs } = wallet.constructTransaction({ outputs: [output] })
    const rawTransaction = transaction.toBuffer()

    p2pkhEntry.setTransaction(rawTransaction)

    const p2pkhEntryRaw = p2pkhEntry.serializeBinary()
    const payloadEntry = new PayloadEntry()
    payloadEntry.setKind('p2pkh')
    payloadEntry.setBody(p2pkhEntryRaw)

    return { entry: payloadEntry, transaction, usedIDs }
  }

  constructPriceFilter (isPublic: boolean, acceptancePrice: number, notificationPrice: number) {
    // Construct PriceFilter
    const priceFilter = new filters.PriceFilter()
    priceFilter.setPublic(isPublic)
    priceFilter.setAcceptancePrice(acceptancePrice)
    priceFilter.setNotificationPrice(notificationPrice)

    return priceFilter
  }

  constructProfileMetadata (profileObj: { name: string, bio: string, avatar: string }, priceFilter: PriceFilter, privKey: PrivateKey) {
    // Construct vCard
    const vCard = new VCard()
    vCard.set('fn', profileObj.name)
    vCard.set('note', profileObj.bio)
    const rawCard = new TextEncoder().encode(vCard.toString())

    const cardEntry = new ProfileEntry()
    cardEntry.setKind('vcard')
    cardEntry.setBody(rawCard)

    // Construct avatar
    const imgEntry = new ProfileEntry()
    imgEntry.setKind('avatar')

    const arr = profileObj.avatar.split(',')
    const avatarMatches = arr[0].match(/:(.*?);/)
    assert(avatarMatches && avatarMatches.length > 1)
    const avatarType = avatarMatches[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const rawAvatar = new Uint8Array(n)

    while (n--) {
      rawAvatar[n] = bstr.charCodeAt(n)
    }
    const imgHeader = new Header()
    imgHeader.setName('data')
    imgHeader.setValue(avatarType)
    imgEntry.setBody(rawAvatar)
    imgEntry.addHeaders(imgHeader)

    // Construct price filter
    const filterEntry = new ProfileEntry()
    filterEntry.setKind('price-filter')
    const rawPriceFilter = priceFilter.serializeBinary()
    filterEntry.setBody(rawPriceFilter)

    // Construct payload
    const profile = new Profile()
    profile.setTimestamp(Math.floor(Date.now() / 1000))
    profile.setTtl(31556952) // 1 year
    profile.addEntries(cardEntry)
    profile.addEntries(imgEntry)
    profile.addEntries(filterEntry)

    const rawProfile = profile.serializeBinary()
    const hashbuf = crypto.Hash.sha256(Buffer.from(rawProfile))
    const sig = crypto.ECDSA.sign(hashbuf, privKey)

    const authWrapper = new AuthWrapper()
    const rawSig = sig.toCompact(1, true).slice(1)
    authWrapper.setPublicKey(privKey.toPublicKey().toBuffer())
    authWrapper.setSignature(rawSig)
    authWrapper.setScheme(1)
    authWrapper.setPayload(rawProfile)

    return authWrapper
  }
}
