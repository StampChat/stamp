declare module 'bitcore-lib-xpi' {
  // Type definitions for bitcore-lib 0.15
  // Project: https://github.com/bitpay/bitcore-lib-xpi
  // Definitions by: Lautaro Dragan <https://github.com/lautarodragan>
  // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

  export namespace crypto {
    class BN {
      static fromBuffer(buf: Buffer): BN

      add(r: BN): BN
      mod(r: BN): BN
    }

    namespace ECDSA {
      function sign(message: Buffer, key: PrivateKey): Signature
      function verify(
        hashbuf: Buffer,
        sig: Signature,
        pubkey: PublicKey,
        endian?: 'little',
      ): boolean
    }

    namespace Hash {
      function sha1(buffer: Buffer): Buffer
      function sha256(buffer: Buffer): Buffer
      function sha256sha256(buffer: Buffer): Buffer
      function sha256ripemd160(buffer: Buffer): Buffer
      function sha512(buffer: Buffer): Buffer
      function ripemd160(buffer: Buffer): Buffer

      function sha256hmac(data: Buffer, key: Buffer): Buffer
      function sha512hmac(data: Buffer, key: Buffer): Buffer
    }

    namespace Random {
      function getRandomBuffer(size: number): Buffer
    }

    class Point {
      static pointToCompressed(point: Point): Buffer

      static getN(): BN

      mul(bn: BN): Point
      add(bn: BN | Point): Point
    }

    class Signature {
      static fromDER(sig: Buffer): Signature
      static fromString(data: string): Signature
      SIGHASH_ALL: number
      toCompact(i: number, compressed: boolean): Buffer
      toDER(format?: 'ecdsa' | 'schnorr'): Buffer
      toString(): string
    }
  }

  export namespace Transaction {
    class UnspentOutput {
      static fromObject(o: unknown): UnspentOutput

      readonly address: Address
      readonly txId: string
      readonly outputIndex: number
      readonly script: Script
      readonly satoshis: number

      constructor(data: unknown)

      inspect(): string
      toObject(): this
      toString(): string
    }

    class Output {
      readonly script: Script
      satoshis: number

      constructor(data: unknown)

      setScript(script: Script | string | Buffer): this
      inspect(): string
      toObject(): unknown
    }

    class Input {
      readonly prevTxId: Buffer
      readonly outputIndex: number
      readonly sequenceNumber: number
      readonly script: Script
      readonly output?: Output
    }
  }

  export class Transaction {
    inputs: Transaction.Input[]
    outputs: Transaction.Output[]
    readonly id: string
    readonly txid: string
    readonly hash: string
    nid: string
    readonly outputAmount: number
    readonly inputAmount: number
    // Hackery to manually mutate
    _outputAmount: number
    _inputAmount: number

    constructor(serialized?: unknown)

    from(utxos: Transaction.UnspentOutput[]): this
    to(address: Address[] | Address | string, amount: number): this
    change(address: Address | string): this
    fee(amount: number): this
    feePerKb(amount: number): this
    sign(privateKey: PrivateKey | PrivateKey[] | string): this
    applySignature(sig: crypto.Signature): this
    addInput(input: Transaction.Input): this
    addOutput(output: Transaction.Output): this
    addData(value: Buffer): this
    lockUntilDate(time: Date | number): this
    lockUntilBlockHeight(height: number): this

    hasWitnesses(): boolean
    getFee(): number
    getChangeOutput(): Transaction.Output | null
    getLockTime(): Date | number

    verify(): string | boolean
    isCoinbase(): boolean

    enableRBF(): this
    isRBF(): boolean

    inspect(): string
    serialize(): string

    toBuffer(): Buffer

    _estimateSize(): number
  }

  export class Block {
    hash: string
    height: number
    transactions: Transaction[]
    header: {
      time: number
      prevHash: string
    }

    constructor(data: Buffer | unknown)
  }

  export class PrivateKey {
    readonly publicKey: PublicKey
    readonly network: Networks.Network
    readonly bn: crypto.BN

    static fromBuffer(data: Buffer, network: string): PrivateKey

    toAddress(networkName?: string): Address
    toPublicKey(): PublicKey
    toString(): string
    toObject(): unknown
    toJSON(): unknown
    toWIF(): string
    toBuffer(): Buffer
    toBigNumber(): crypto.BN

    constructor(key?: string | crypto.BN, network?: Networks.Network)
  }

  export class PublicKey {
    readonly point: crypto.Point
    constructor(source: string | Buffer)

    static fromPrivateKey(privateKey: PrivateKey): PublicKey
    static fromPoint(point: crypto.Point): PublicKey
    static fromBuffer(buffer: Buffer | Uint8Array): PublicKey

    toBuffer(): Buffer
    toDER(): Buffer
    toAddress(network: string): Address
    toBigNumber(): crypto.BN
  }

  export class HDPrivateKey {
    readonly hdPublicKey: HDPublicKey
    readonly privateKey: PrivateKey

    constructor(data?: string | Buffer | unknown)

    static fromObject(o: unknown): HDPrivateKey
    static fromSeed(o: unknown): HDPrivateKey

    derive(arg: string | number, hardened?: boolean): HDPrivateKey
    deriveChild(arg: string | number, hardened?: boolean): HDPrivateKey
    deriveNonCompliantChild(
      arg: string | number,
      hardened?: boolean,
    ): HDPrivateKey

    toString(): string
    toObject(): unknown
    toJSON(): unknown
  }

  export class HDPublicKey {
    readonly xpubkey: Buffer
    readonly network: Networks.Network
    readonly depth: number
    readonly publicKey: PublicKey
    readonly fingerPrint: Buffer

    constructor(arg: string | Buffer | unknown)

    derive(arg: string | number, hardened?: boolean): HDPublicKey
    deriveChild(arg: string | number, hardened?: boolean): HDPublicKey

    toString(): string
  }

  export namespace Script {
    const types: {
      DATA_OUT: string
    }
    function buildMultisigOut(
      publicKeys: PublicKey[],
      threshold: number,
      opts: object,
    ): Script
    function buildWitnessMultisigOutFromScript(script: Script): Script
    function buildMultisigIn(
      pubkeys: PublicKey[],
      threshold: number,
      signatures: Buffer[],
      opts: unknown,
    ): Script
    function buildP2SHMultisigIn(
      pubkeys: PublicKey[],
      threshold: number,
      signatures: Buffer[],
      opts: unknown,
    ): Script
    function buildPublicKeyHashOut(
      address: Address | PublicKey | string,
    ): Script
    function buildPublicKeyOut(pubkey: PublicKey): Script
    function buildDataOut(data: string | Buffer, encoding?: string): Script
    function buildScriptHashOut(script: Script): Script
    function buildPublicKeyIn(
      signature: crypto.Signature | Buffer,
      sigtype: number,
    ): Script
    function buildPublicKeyHashIn(
      publicKey: PublicKey,
      signature: crypto.Signature | Buffer,
      sigtype: number,
    ): Script

    function fromAddress(address: string | Address): Script

    function toAddress(network: string): Address

    function empty(): Script
  }

  export class Script {
    constructor(data: string | unknown)

    set(obj: unknown): this

    toBuffer(): Buffer
    toASM(): string
    toString(): string
    toHex(): string

    isPublicKeyHashOut(): boolean
    isPublicKeyHashIn(): boolean

    getPublicKey(): Buffer
    getPublicKeyHash(): Buffer

    isPublicKeyOut(): boolean
    isPublicKeyIn(): boolean

    isScriptHashOut(): boolean
    isWitnessScriptHashOut(): boolean
    isWitnessPublicKeyHashOut(): boolean
    isWitnessProgram(): boolean
    isScriptHashIn(): boolean
    isMultisigOut(): boolean
    isMultisigIn(): boolean
    isDataOut(): boolean

    getData(): Buffer
    isPushOnly(): boolean

    classify(): string
    classifyInput(): string
    classifyOutput(): string

    isStandard(): boolean

    prepend(obj: unknown): this
    add(obj: unknown): this

    hasCodeseparators(): boolean
    removeCodeseparators(): this

    equals(script: Script): boolean

    getAddressInfo(): Address | boolean
    findAndDelete(script: Script): this
    checkMinimalPush(i: number): boolean
    getSignatureOperationsCount(accurate: boolean): number

    toAddress(network: string): Address
  }

  export class Message {
    constructor(message: string)

    magicHash(): Buffer
    sign(privateKey: PrivateKey): string
    verify(bitcoinAddress: Address | string, signatureString: string): boolean
    fromString(str: string): Message
    fromJSON(json: string): Message
    toObject(): { message: string }
    toJSON(): string
    toString(): string
    inspect(): string
  }

  export interface Util {
    readonly buffer: {
      reverse(a: unknown): unknown
    }
  }

  export namespace Networks {
    interface Network {
      readonly name: string
      readonly alias: string
      readonly prefix: string
    }

    const livenet: Network
    const mainnet: Network
    const testnet: Network

    function add(data: unknown): Network
    function remove(network: Network): void
    function get(
      args: string | number | Network,
      keys?: string | string[] | undefined,
    ): Network
  }

  export class Address {
    readonly hashBuffer: Buffer
    readonly network: Networks.Network
    readonly type: string

    constructor(
      data: Buffer | Uint8Array | string | unknown,
      network?: Networks.Network | string,
      type?: string,
    )

    toCashAddress(): string
    toXAddress(): string
    toBuffer(): Buffer
  }

  export class Unit {
    static fromBTC(amount: number): Unit
    static fromMilis(amount: number): Unit
    static fromBits(amount: number): Unit
    static fromSatoshis(amount: number): Unit

    constructor(amount: number, unitPreference: string)

    toBTC(): number
    toMilis(): number
    toBits(): number
    toSatoshis(): number
  }
}
